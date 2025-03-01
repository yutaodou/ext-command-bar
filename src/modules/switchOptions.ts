import { FilterableOption, HistoryOption, SelectOptionMessage, SwitchOption, TabOption } from "@/types";
import { orderBy } from "lodash";
import { isSystemPage } from "./utils";
import { v4 as uuid } from "uuid";
import { search, tokenize } from "./search";
import { getFaviconBase64 } from "./faviconManager";

const MAX_RESULTS = 5;

export const isTabOption = (option: SwitchOption): option is TabOption => {
  return option.type === "tab";
};

export const handleSelectOption = async (message: SelectOptionMessage) => {
  const option = message.option;
  if (isTabOption(option)) {
    await browser.tabs.update(option.tabId!, { active: true });
  } else if (option.type === "history" || option.type === "bookmark") {
    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (currentTab?.index !== undefined) {
      await browser.tabs.create({
        url: option.url,
        active: true,
        index: currentTab.index + 1,
      });
    }
  } else if (option.type === "command" && option.action === "search" && option.searchTerm) {
    await browser.search.query({
      disposition: "NEW_TAB",
      text: option.searchTerm,
    });
  }
};

export const getSwitchOptions = async (searchTerm: string = ""): Promise<SwitchOption[]> => {
  // Get options without favicons first
  const [tabOptions, bookmarkOptions, historyOptions] = await Promise.all([
    getTabOptionsWithoutFavicons(),
    getBookmarkOptionsWithoutFavicons(searchTerm),
    getHistoryOptionsWithoutFavicons(searchTerm)
  ]);

  const options = [...tabOptions, ...bookmarkOptions, ...historyOptions] as FilterableOption[];
  const results = search(searchTerm, options, 100) as SwitchOption[];
  
  let finalResults;
  if (results.length < MAX_RESULTS && searchTerm.trim()) {
    finalResults = [...results, buildSearchCommandOptions(searchTerm)];
  } else {
    finalResults = results.slice(0, MAX_RESULTS);
  }

  // Only now populate favicons for the final results that will be displayed
  await populateFaviconsForResults(finalResults);
  return finalResults;
};

/**
 * Populate favicons only for the final results that will be shown to the user
 */
async function populateFaviconsForResults(results: SwitchOption[]): Promise<void> {
  const promises = results.map(async (option) => {
    try {
      // Skip command options as they use emoji icons
      if (option.type === 'command') {
        return;
      }

      if (!option.url) {
        return;
      }

      // Get favicon base64 data
      const favicon = await getFaviconBase64(option.url);
      
      // For tab options, try to use the tab's native favicon as fallback
      if (!favicon && isTabOption(option) && option.tabId) {
        // Get the tab to access its native favicon
        try {
          const tab = await browser.tabs.get(option.tabId);
          if (tab && tab.favIconUrl) {
            const tabFavicon = await getFaviconBase64(tab.favIconUrl);
            if (tabFavicon) {
              option.faviconData = tabFavicon;
              return;
            }
          }
        } catch (error) {
          console.error('Error getting tab favicon:', error);
        }
      }

      // Update the option with the favicon data
      if (favicon) {
        option.faviconData = favicon;
      }
    } catch (error) {
      console.error('Error loading favicon:', error);
    }
  });

  await Promise.all(promises);
}

const buildSearchCommandOptions = (searchTerm: string): SwitchOption => ({
  type: "command",
  name: `Search for "${searchTerm}"`,
  icon: "🔍",
  action: "search",
  actionText: "Search",
  searchTerm,
});

const getHistoryOptionsWithoutFavicons = async (searchTerm: string): Promise<SwitchOption[]> => {
  const tokens = tokenize(searchTerm);
  if (!tokens) {
    return [];
  }
  const oneWeekAgo = new Date().getTime() - 28 * 86400 * 1000;
  const results = await Promise.all(
    tokens.map((token) => chrome.history.search({ text: token, maxResults: 100, startTime: oneWeekAgo }))
  );

  const history = results.flatMap((item) => item);
  const sortedHistory = orderBy(history, ["lastVisitTime", "visitCount"], ["desc", "desc"]);

  // Create options with URLs but without favicons
  return sortedHistory.map((item) => ({
    id: uuid(),
    type: "history" as const,
    title: item.title || "Untitled",
    url: item.url || "",
    faviconData: "", // Will be populated later only if this option is selected for display
    actionText: "Open Page",
  }));
};

const getBookmarkOptionsWithoutFavicons = async (searchTerm: string): Promise<SwitchOption[]> => {
  // Remove the searchTerm check so bookmarks are always loaded
  const bookmarks = await chrome.bookmarks.search({});

  // Create options with URLs but without favicons
  return bookmarks
    .filter((bookmark) => bookmark.url)
    .map((bookmark) => ({
      id: uuid(),
      type: "bookmark" as const,
      title: bookmark.title || "Untitled",
      url: bookmark.url || "",
      faviconData: "", // Will be populated later only if this option is selected for display
      actionText: "Open Bookmark",
    }));
};

const getTabOptionsWithoutFavicons = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: false });

  // Create options with tabs but without favicons
  return orderBy(tabs, ["lastAccessed"], ["desc"])
    .filter((tab) => {
      return tab.id && !isSystemPage(tab);
    })
    .map((tab) => ({
      id: uuid(),
      tabId: tab.id,
      type: "tab" as const,
      title: tab.title || "Untitled",
      url: tab.url || "",
      faviconData: "", // Will be populated later only if this option is selected for display
      actionText: "Switch to Tab",
    }));
};

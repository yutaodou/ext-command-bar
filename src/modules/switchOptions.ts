import { FilterableOption, SelectOptionMessage, SwitchOption, TabOption } from "@/types";
import { orderBy } from "lodash";
import { v4 as uuid } from "uuid";
import { search, tokenize } from "./search";
import { isSystemPage } from "./utils";

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
  const [tabOptions, bookmarkOptions, historyOptions] = await Promise.all([
    getTabOptions(),
    getBookmarkOptions(searchTerm),
    getHistoryOptions(searchTerm),
  ]);

  const options = [...tabOptions, ...bookmarkOptions, ...historyOptions] as FilterableOption[];
  const results = search(searchTerm, options, 100) as SwitchOption[];

  let finalResults;
  if (results.length < MAX_RESULTS && searchTerm.trim()) {
    finalResults = [...results, buildSearchCommandOptions(searchTerm)];
  } else {
    finalResults = results.slice(0, MAX_RESULTS);
  }

  return finalResults;
};

const buildSearchCommandOptions = (searchTerm: string): SwitchOption => ({
  type: "command",
  name: `Search for "${searchTerm}"`,
  icon: "🔍",
  action: "search",
  actionText: "Search",
  searchTerm,
});

const getHistoryOptions = async (searchTerm: string): Promise<SwitchOption[]> => {
  const tokens = tokenize(searchTerm);
  if (!tokens) {
    return [];
  }
  const startTime = new Date().getTime() - 28 * 86400 * 1000;
  const results = await Promise.all(
    tokens.map((token) => chrome.history.search({ text: token, maxResults: 100, startTime }))
  );

  const history = results.flatMap((item) => item);
  const sortedHistory = orderBy(history, ["lastVisitTime", "visitCount"], ["desc", "desc"]);

  return sortedHistory.map((item) => ({
    id: uuid(),
    type: "history" as const,
    title: item.title || "Untitled",
    url: item.url || "",
    faviconData: faviconUrl(item.url!),
    actionText: "Open Page",
  }));
};

const getBookmarkOptions = async (searchTerm: string): Promise<SwitchOption[]> => {
  const bookmarks = await chrome.bookmarks.search({});

  return bookmarks
    .filter((bookmark) => bookmark.url)
    .map((bookmark) => ({
      id: uuid(),
      type: "bookmark" as const,
      title: bookmark.title || "Untitled",
      url: bookmark.url || "",
      faviconData: faviconUrl(bookmark.url!),
      actionText: "Open Bookmark",
    }));
};

const getTabOptions = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: false });

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
      faviconData: tab.favIconUrl,
      actionText: "Switch to Tab",
    }));
};

function faviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (error) {
    return "";
  }
}

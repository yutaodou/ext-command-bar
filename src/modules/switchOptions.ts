import { FilterableOption, SelectOptionMessage, SwitchOption, TabOption } from "@/types";
import { orderBy } from "lodash";
import { isSystemPage } from "./utils";
import { v4 as uuid } from "uuid";
import { search } from "./search";

const MAX_RESULTS = 5;

export const isTabOption = (option: SwitchOption): option is TabOption => {
  return option.type === "tab";
};

export const handleSelectOption = async (message: SelectOptionMessage) => {
  const option = message.option;
  if (isTabOption(option)) {
    await browser.tabs.update(option.tabId!, { active: true });
  } else if (option.type === "history" || option.type === "bookmark") {
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
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
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = currentTab?.url || "";

  const tabOptions = await getTabOptions();
  const bookmarkOptions = await getBookmarkOptions();
  const historyOptions = await getHistoryOptions();

  const options = [...tabOptions, ...bookmarkOptions, ...historyOptions];
  const results: FilterableOption[] = search(searchTerm, options, 100);

  const seen = new Set<string>([currentUrl]);
  const combinedResults = results
    .filter((item) => {
      if (seen.has(item.url) || seen.has(item.title)) {
        return false;
      }
      seen.add(item.url);
      return true;
    })
    .slice(0, MAX_RESULTS);

  if (combinedResults.length === 0 && searchTerm.trim()) {
    return [buildSearchCommandOptions(searchTerm)];
  }

  return combinedResults as SwitchOption[];
};

const buildSearchCommandOptions = (searchTerm: string): SwitchOption => ({
  type: "command",
  name: `Search for "${searchTerm}"`,
  icon: "🔍",
  action: "search",
  actionText: "Search",
  searchTerm,
});

const getHistoryOptions = async () => {
  const history = await chrome.history.search({
    text: "",
    maxResults: 200,
    startTime: 0,
  });

  const historyOptions = orderBy(history, ["lastVisitTime", "visitCount"], ["desc", "desc"]).map((item) => ({
    id: uuid(),
    type: "history" as const,
    title: item.title || "Untitled",
    url: item.url || "",
    favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(item.url || "").hostname}`,
    actionText: "Open Page",
  }));
  return historyOptions;
};

const getBookmarkOptions = async () => {
  const bookmarks = await chrome.bookmarks.search({});
  const bookmarkOptions = bookmarks
    .filter((bookmark) => bookmark.url)
    .map((bookmark) => ({
      id: uuid(),
      type: "bookmark" as const,
      title: bookmark.title || "Untitled",
      url: bookmark.url || "",
      favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url || "").hostname}`,
      actionText: "Open Bookmark",
    }));
  return bookmarkOptions;
};

const getTabOptions = async () => {
  const tabs = await chrome.tabs.query({ currentWindow: true, active: false });

  const tabOptions = orderBy(tabs, ["lastAccessed"], ["desc"])
    .filter((tab) => {
      return tab.id && !isSystemPage(tab);
    })
    .map((tab) => ({
      id: uuid(),
      tabId: tab.id,
      type: "tab" as const,
      title: tab.title || "Untitled",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl,
      actionText: "Switch to Tab",
    }));
  return tabOptions;
};

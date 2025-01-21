import { SelectOptionMessage, SwitchOption, TabOption } from "@/types";
import { orderBy } from "lodash";
import { isSystemPage } from "./utils";
import { v4 as uuid } from "uuid";
import { search, tokenize } from "./search";

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
  const tabOptions = await getTabOptions();
  const bookmarkOptions = searchTerm ? await getBookmarkOptions() : [];
  const historyOptions = searchTerm ? await getHistoryOptions(searchTerm) : [];

  const options = [...tabOptions, ...bookmarkOptions, ...historyOptions];
  const results = search(searchTerm, options, 100) as SwitchOption[];

  if (results.length < MAX_RESULTS && searchTerm.trim()) {
    return [...results, buildSearchCommandOptions(searchTerm)];
  } else {
    return results.slice(0, MAX_RESULTS);
  }
};

const buildSearchCommandOptions = (searchTerm: string): SwitchOption => ({
  type: "command",
  name: `Search for "${searchTerm}"`,
  icon: "🔍",
  action: "search",
  actionText: "Search",
  searchTerm,
});

const getHistoryOptions = async (term: string) => {
  const tokens = tokenize(term);
  const oneWeekAgo = new Date().getTime() - 14 * 86400 * 1000;
  const results = await Promise.all(
    tokens.map((token) => chrome.history.search({ text: token, maxResults: 100, startTime: oneWeekAgo }))
  );

  const history = results.flatMap((item) => item);
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

import { SelectOptionMessage, SwitchOption, TabOption } from "@/types";
import { orderBy } from "lodash";

const MAX_RESULTS = 5;
const isSystemPage = (url: string): boolean => {
  const systemProtocols = [
    "chrome://",
    "chrome-extension://",
    "edge://",
    "brave://",
    "about:",
    "chrome-search://",
    "chrome-untrusted://",
    "browser://",
    "moz-extension://",
    "firefox:",
  ];

  return systemProtocols.some((protocol) => url.toLowerCase().startsWith(protocol));
};

export const isTabOption = (option: SwitchOption): option is TabOption => {
  return option.type === "tab";
};

export const handleSelectOption = async (message: SelectOptionMessage) => {
  const option = message.option;
  if (isTabOption(option)) {
    await browser.tabs.update(option.tabId!, { active: true });
  } else if (option.type === "history" || option.type === "bookmark") {
    // Get current tab to determine where to create the new tab
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (currentTab?.index !== undefined) {
      // Create new tab next to current tab
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
  // Get current tab first
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = currentTab?.url || "";

  const tabs = await chrome.tabs.query({ currentWindow: true, active: false });

  const filteredTabs = orderBy(tabs, ["lastAccessed"], ["desc"])
    .filter((tab) => {
      const title = (tab.title || "").toLowerCase();
      const url = (tab.url || "").toLowerCase();
      // Ignore system pages
      if (!url || isSystemPage(url)) {
        return false;
      }
      return tab.id !== undefined && (title.includes(searchTerm) || url.includes(searchTerm));
    })
    .map((tab) => ({
      id: tab.id?.toString() || new Date().getTime().toString(),
      tabId: tab.id,
      type: "tab" as const,
      title: tab.title || "Untitled",
      url: tab.url || "",
      favIconUrl: tab.favIconUrl,
    }))
    .slice(0, MAX_RESULTS);

  // Search bookmarks
  const bookmarks = await chrome.bookmarks.search({
    query: searchTerm,
  });

  const bookmarkOptions = bookmarks
    .filter((bookmark) => bookmark.url) // Only include bookmarks with URLs (exclude folders)
    .map((bookmark) => ({
      id: bookmark.id,
      type: "bookmark" as const,
      title: bookmark.title || "Untitled",
      url: bookmark.url || "",
      favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(bookmark.url || "").hostname}`,
    }))
    .slice(0, MAX_RESULTS);

  const history = await chrome.history.search({
    text: searchTerm,
    maxResults: MAX_RESULTS * 2,
    startTime: 0,
  });

  const historyOptions = orderBy(history, ["lastVisitTime", "visitCount"], ["desc", "desc"]).map((item) => ({
    id: item.id,
    type: "history" as const,
    title: item.title || "Untitled",
    url: item.url || "",
    favIconUrl: `https://www.google.com/s2/favicons?domain=${new URL(item.url || "").hostname}`,
  }));

  // Combine results and remove duplicates based on URL
  const seen = new Set<string>([currentUrl]); // Initialize with current tab's URL
  const combinedResults = [...filteredTabs, ...bookmarkOptions, ...historyOptions]
    .filter((item) => {
      if (seen.has(item.url) || seen.has(item.title)) {
        return false;
      }
      seen.add(item.url);
      return true;
    })
    .slice(0, MAX_RESULTS);

  // If no results and we have a search term, add search command
  if (combinedResults.length === 0 && searchTerm.trim()) {
    return [
      {
        type: "command",
        name: `Search for "${searchTerm}"`,
        icon: "🔍",
        action: "search",
        searchTerm,
      },
    ];
  }

  return combinedResults;
};

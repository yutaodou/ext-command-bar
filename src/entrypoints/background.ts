import { orderBy } from "lodash";
import { onMessage, sendMessage } from "webext-bridge/background";
import { SwitchOption } from "~/types";

const MAX_RESULTS = 5;
const isSystemPage = (url: string): boolean => {
  const systemProtocols = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'brave://',
    'about:',
    'chrome-search://',
    'chrome-untrusted://',
    'browser://',
    'moz-extension://',
    "firefox:"
  ];

  return systemProtocols.some((protocol) => url.toLowerCase().startsWith(protocol));
};

const getSwitchOptions = async (searchTerm: string = ""): Promise<SwitchOption[]> => {
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
  return [...filteredTabs, ...bookmarkOptions, ...historyOptions]
    .filter((item) => {
      if (seen.has(item.url) || seen.has(item.title)) {
        return false;
      }
      seen.add(item.url);
      return true;
    })
    .slice(0, MAX_RESULTS);
};

const ensureScriptsLoaded = async (tabId: number | undefined) => {
  if (tabId === undefined) return;

  // Check if the command bar element exists
  const [{ result }] = await browser.scripting.executeScript({
    target: { tabId },
    func: () => !!document.querySelector("ext-command-bar"),
  });

  // If element doesn't exist, inject the content script
  if (!result) {
    await browser.scripting.executeScript({
      target: { tabId },
      files: ["content-scripts/content.js"],
    });
  }
};

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        // Ensure content script is loaded before sending message
        await ensureScriptsLoaded(tabs[0]!.id);

        const target = `content-script@${tabs[0]!.id}`;
        await sendMessage("toggleCommandBar", { options: await getSwitchOptions() }, target);
      }
    });

    onMessage("selectOption", async (message) => {
      const { option } = message.data;
      if (option.type === "tab") {
        browser.tabs.update(option.tabId, { active: true });
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
      }
    });

    onMessage("searchOptions", async ({ data }) => {
      return { options: await getSwitchOptions(data.term?.toLowerCase()) };
    });
  },
});


export const ensureScriptsLoaded = async (tabId: number | undefined) => {
    if (tabId === undefined) return;
  
    const [{ result }] = await browser.scripting.executeScript({
      target: { tabId },
      func: () => !!document.querySelector("ext-command-bar"),
    });
  
    if (!result) {
      await browser.scripting.executeScript({
        target: { tabId },
        files: ["content-scripts/content.js"],
      });
    }
  };

  export const isSystemPage = (tab: chrome.tabs.Tab): boolean => {
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
  
    return systemProtocols.some((protocol) => tab.url?.toLowerCase().startsWith(protocol));
  };
  

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
  
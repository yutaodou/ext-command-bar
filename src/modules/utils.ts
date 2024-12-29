
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
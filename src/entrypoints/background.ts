export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
});

browser.tabs.onCreated.addListener((tab) => {
  showTable('created', tab);
});

browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  showTable('updated', tab);
});


browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log(`${tabId} removed: ${removeInfo.isWindowClosing}`);
});

browser.tabs.onHighlighted.addListener((tab) => {
  console.log('tab highlighted', tab);
});

browser.tabs.onActivated.addListener((tab) => {
  console.log('tab activated', tab);
});


const showTable = (event: string, tab: chrome.tabs.Tab) => {
  console.log(`${event}: ${tab.title} ${tab.url} ${tab.id} ${tab.favIconUrl}`);
};

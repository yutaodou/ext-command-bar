import { onMessage, sendMessage } from "webext-bridge/background";
import { SwitchOption, TabOption } from "~/types";

const getSwitchOptions = async (): Promise<TabOption[]> => {
  const tabs = await browser.tabs.query({ currentWindow: true, active: false });
  return tabs
    .sort((a, b) => b.lastAccessed! - a.lastAccessed!)
    .map((tab) => ({ type: "tab", tabId: tab.id, favIconUrl: tab.favIconUrl, title: tab.title, url: tab.url }));
};

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;
        const target = `content-script@${tabs[0]!.id}`;
        const resp = await sendMessage("toggleCommandBar", { options: await getSwitchOptions() }, target);
        console.log("resp", resp);
      }
    });

    onMessage("selectOption", (message) => {
      const { option } = message.data;
      if (option.type === "tab") {
        browser.tabs.update(option.tabId, { active: true });
      }
    });
  },
});

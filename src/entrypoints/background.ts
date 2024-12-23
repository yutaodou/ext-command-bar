import { onMessage, sendMessage } from "webext-bridge/background";

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;
        console.log("send message", `content-scripts@${tabs[0]!.id}`);
        const resp = await sendMessage("toggleCommandBar", "hello", `content-script@${tabs[0]!.id}`);
        console.log("resp", resp);
      }
    });
  },
});

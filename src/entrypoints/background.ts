import { getSwitchOptions, handleSelectOption } from "@/modules/switchOptions";
import { ensureScriptsLoaded } from "@/modules/utils";
import { onMessage, sendMessage } from "webext-bridge/background";

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        const tabs = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs.length === 0) return;

        await ensureScriptsLoaded(tabs[0]!.id);

        const target = `content-script@${tabs[0]!.id}`;
        await sendMessage(
          "toggleCommandBar",
          { options: await getSwitchOptions() },
          target,
        );
      }
    });

    onMessage("selectOption", async (message) => {
      await handleSelectOption(message.data);
    });

    onMessage("searchOptions", async ({ data }) => {
      return { options: await getSwitchOptions(data.term) };
    });
  },
});

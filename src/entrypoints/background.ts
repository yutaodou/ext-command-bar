import { getSwitchOptions, handleSelectOption } from "@/modules/switchOptions";
import { ensureScriptsLoaded } from "@/modules/utils";
import { onMessage, sendMessage } from "webext-bridge/background";

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    // Handle the getInitialOptions message from popup
    onMessage("getInitialOptions", async () => {
      return { options: await getSwitchOptions() };
    });

    // Handle option selection from popup
    onMessage("selectOption", async (message) => {
      await handleSelectOption(message.data);
    });

    // Handle search requests from popup
    onMessage("searchOptions", async ({ data }) => {
      return { options: await getSwitchOptions(data.term) };
    });

    // The keyboard shortcut handler can be kept if you want both methods to work
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        // Instead of sending to content script, we now open the popup
        await browser.action.openPopup();
      }
    });
  },
});

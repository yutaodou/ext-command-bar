import { getSwitchOptions, handleSelectOption } from "@/modules/switchOptions";
import { ensureScriptsLoaded } from "@/modules/utils";
import { onMessage, sendMessage } from "webext-bridge/background";

// Variable to track popup state
let isPopupOpen = false;

export default defineBackground({
  persistent: true,
  type: "module",
  main() {
    // Handle the getInitialOptions message from popup
    onMessage("getInitialOptions", async () => {
      isPopupOpen = true; // Mark popup as open when it requests initial options
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

    // Listen for popup window closing
    browser.runtime.onConnect.addListener((port) => {
      if (port.name === "popup-connection") {
        // Set popup as open when connected
        isPopupOpen = true;
        // Listen for disconnect to track when popup closes
        port.onDisconnect.addListener(() => {
          isPopupOpen = false;
        });
      }
    });

    // The keyboard shortcut handler with toggle functionality
    browser.commands.onCommand.addListener(async (command) => {
      if (command === "toggleCommandBar") {
        if (isPopupOpen) {
          // Close the popup if it's open
          // This is done by sending a message to the popup
          try {
            await sendMessage("closePopup", {}, "popup");
          } catch (error) {
            // If sending the message fails, the popup might already be closed
            isPopupOpen = false;
          }
        } else {
          // Open the popup if it's closed
          await browser.action.openPopup();
        }
      }
    });
  },
});

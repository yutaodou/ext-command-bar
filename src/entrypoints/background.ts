import { getSwitchOptions, handleSelectOption } from "@/modules/switchOptions";
import { onMessage, sendMessage } from "webext-bridge/background";

// Variable to track popup state
let isPopupOpen = false;

// Variables to track the current and previous tab IDs
let currentTabId: number | undefined;
let previousTabId: number | undefined;

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

    // Track tab activations to maintain current and previous tab IDs
    browser.tabs.onActivated.addListener(async (activeInfo) => {
      if (currentTabId !== undefined && currentTabId !== activeInfo.tabId) {
        previousTabId = currentTabId;
      }
      currentTabId = activeInfo.tabId;
    });

    // Initialize current tab ID on extension load
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs[0]?.id) {
        currentTabId = tabs[0].id;
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
      } else if (command === "switchToPreviousTab") {
        try {
          // Get all tabs in the current window
          const tabs = await browser.tabs.query({ currentWindow: true });
          
          // If there's only one tab, no previous tab exists
          if (tabs.length <= 1) return;

          // Find the current active tab
          const activeTab = tabs.find(tab => tab.active);
          if (!activeTab || !activeTab.id) return;
          
          // Sort the tabs by lastAccessed in descending order (most recent first)
          const sortedTabs = tabs
            .filter(tab => !tab.active && tab.id && tab.lastAccessed) // Exclude active tab and make sure tabs have lastAccessed
            .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
          
          // Get the most recently accessed tab (which is the previous tab)
          if (sortedTabs.length > 0 && sortedTabs[0].id) {
            // Switch to the previous tab
            await browser.tabs.update(sortedTabs[0].id, { active: true });
          }
        } catch (error) {
          console.error("Error switching to previous tab:", error);
        }
      } else if (command === "switchTabBack") {
        // Switch back to the previous tab if available
        if (previousTabId) {
          try {
            // Check if the tab still exists
            const tab = await browser.tabs.get(previousTabId);
            if (tab) {
              // Swap the current and previous tab IDs
              const temp = currentTabId;
              currentTabId = previousTabId;
              previousTabId = temp;
              
              // Switch to the tab
              await browser.tabs.update(currentTabId, { active: true });
            }
          } catch (error) {
            // Tab no longer exists, clear the previous tab ID
            console.error("Error switching back to tab:", error);
            previousTabId = undefined;
          }
        }
      }
    });
  },
});

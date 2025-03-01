import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-vue"],
  outDir: "dist",
  srcDir: "src",
  runner: {
    disabled: true,
  },
  manifest: {
    name: "Super Tab Switcher",
    description: "Easily search tab/history/bookmark, and switch between tabs.",
    version: "0.0.5",
    host_permissions: ["<all_urls>"],
    permissions: ["scripting", "tabs", "history", "bookmarks","search"],
    commands: {
      toggleCommandBar: {
        description: "Toggle the command bar",
        suggested_key: {
          default: "Ctrl+K",
          mac: "Command+K",
        },
      },
      switchToPreviousTab: {
        description: "Switch to previous tab",
        suggested_key: {
          default: "Alt+Left",
          mac: "Alt+Left",
        },
      },
      switchTabBack: {
        description: "Switch back to the tab you came from",
        suggested_key: {
          default: "Alt+Right",
          mac: "Alt+Right",
        },
      },
    },
  },
});

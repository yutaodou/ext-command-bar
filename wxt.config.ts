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
    name: "Yes Commander",
    description: "Yes Commander",
    version: "0.0.3",
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
    },
  },
});

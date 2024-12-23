import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-vue"],
  outDir: "dist",
  srcDir: "src",
  manifest: {
    permissions: ["scripting"],
    commands: {
      toggleCommandBar: {
        description: "Toggle the command bar",
        suggested_key: {
          default: "Alt+T",
          mac: "Alt+T",
        },
      },
    },
  },
});

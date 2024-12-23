import { onMessage } from "webext-bridge/content-script";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",
  main() {
    console.log("commandbar loaded");
    onMessage("toggleCommandBar", (data) => {
      console.log("toggleCommandBar", data);
      const commandBar = document.querySelector("ext-command-bar") as HTMLElement;
      if (!commandBar) return;

      const display = commandBar.style.display;
      commandBar.style.display = display === "none" ? "block" : "none";
    });
  },
});

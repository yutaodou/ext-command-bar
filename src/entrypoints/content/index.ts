import { ContentScriptContext } from "wxt/client";
import "./reset.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  runAt: "document_start",
  world: "ISOLATED",
  async main(ctx) {
    // Content script is kept minimal as the UI is now in the popup
    // You can add any content script functionality here if needed
    console.log("Command bar content script loaded");
  },
});

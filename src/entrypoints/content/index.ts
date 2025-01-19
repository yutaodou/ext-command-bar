import { ContentScriptContext } from "wxt/client";
import App from "./App.vue";
import { createApp } from "vue";
import "./reset.css";

export default defineContentScript({
  matches: ["*://*/*"],
  cssInjectionMode: "ui",
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  runAt: "document_start",
  world: "ISOLATED",

  async main(ctx) {
    const ui = await defineOverlay(ctx);

    ui.mount();

    ctx.addEventListener(window, "wxt:locationchange", (event) => {
      ui.mount();
    });
  },
});

function defineOverlay(ctx: ContentScriptContext) {
  return createShadowRootUi(ctx, {
    name: "ext-command-bar",
    position: "modal",
    anchor: "body",
    append: "after",
    mode: "closed",
    zIndex: 99999,
    isolateEvents: true,
    css: "html {font-size: 16px;}",
    onMount(container, _shadow, shadowHost) {
      const app = createApp(App);
      app.mount(container);
      shadowHost.style.pointerEvents = "none";
      return app;
    },
    onRemove(app) {
      app?.unmount();
    },
  });
}

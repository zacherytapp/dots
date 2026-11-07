// Generated from src/mods/goto-logs/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/shared/actions.ts
import { div, View } from "gpui-kit";
import {
  appHome,
  closeOverlay,
  exec,
  focused,
  hc,
  home,
  notify,
  openOverlay,
  props,
  run,
  spaces,
} from "herdr";
function fail(title, e) {
  notify({
    title,
    body: String(e?.message ?? e)
      .trim()
      .slice(0, 300),
    level: "error",
  });
}
function closeSelf() {
  const overlay = props()?.overlay;
  if (overlay) closeOverlay(overlay);
}
function gotoTab(name) {
  return class Goto extends View {
    init() {
      try {
        const f = focused();
        const space = spaces().find((s) => s.id === f?.space) ?? spaces().find((s) => s.active);
        const tab = space?.tabs.find((t) => t.name === name);
        if (tab) run("tab.select", { id: tab.id });
        else run("tab.new", space ? { name, space: space.id } : { name });
      } catch (e) {
        fail(`goto-${name}`, e);
      } finally {
        closeSelf();
      }
    }
    render() {
      return div();
    }
  };
}

// .config/herdr-app/src/mods/goto-logs/main.ts
var main_default = gotoTab("logs");
export { main_default as default };

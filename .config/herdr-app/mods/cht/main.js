// Generated from src/mods/cht/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
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
function popupScript(title, script, size) {
  return class Popup extends View {
    init(_props, cx) {
      cx.spawn(async () => {
        try {
          const r = await hc([
            "run",
            "--json",
            "--bg",
            "--rm",
            "--no-parent",
            "--cwd",
            home(),
            "--",
            `${appHome()}/scripts/${script}`,
          ]);
          if (r.code !== 0) throw new Error(r.stderr || r.stdout);
          const { address } = JSON.parse(r.stdout);
          openOverlay({
            kind: "dialog",
            ...size,
            layout: { type: "block", content: { terminal: address } },
          });
        } catch (e) {
          fail(title, e);
        } finally {
          closeSelf();
        }
      });
    }
    render() {
      return div();
    }
  };
}

// .config/herdr-app/src/mods/cht/main.ts
var main_default = popupScript("cht", "cht.sh", { width: 0.8, height: 0.8 });
export { main_default as default };

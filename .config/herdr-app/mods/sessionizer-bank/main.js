// Generated from src/mods/sessionizer-bank/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/sessionizer-bank/main.ts
import { home as home2 } from "herdr";

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
function runScript(title, script, args) {
  return class Run extends View {
    init(_props, cx) {
      cx.spawn(async () => {
        try {
          const r = await exec(`${appHome()}/scripts/${script}`, args(), { cwd: home() });
          if (r.code !== 0) throw new Error(r.stderr || r.stdout || `exit ${r.code}`);
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

// .config/herdr-app/src/mods/sessionizer-bank/main.ts
var main_default = runScript("sessionizer-bank", "sessionizer.sh", () => [
  `${home2()}/Projects/bank`,
]);
export { main_default as default };

// One-shot mods opened from keys.json (`mod.open:<name>`): each does one thing, reports a
// failure as a toast, and closes its own invisible popup.

import { div, View, type Cx, type El } from "gpui-kit";
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

function fail(title: string, e: unknown): void {
  notify({
    title,
    body: String((e as Error)?.message ?? e)
      .trim()
      .slice(0, 300),
    level: "error",
  });
}

function closeSelf(): void {
  const overlay = (props() as { overlay?: string } | null)?.overlay;
  if (overlay) closeOverlay(overlay);
}

/** Runs a script in a hidden core terminal and shows it in a dialog that closes when it exits (tmux `display-popup -E`). */
export function popupScript(
  title: string,
  script: string,
  size: { width: number; height: number },
) {
  return class Popup extends View {
    init(_props: unknown, cx: Cx): void {
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
          const { address } = JSON.parse(r.stdout) as { address: string };
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
    render(): El {
      return div();
    }
  };
}

/** Runs a script with arguments and waits for it (tmux `run-shell`). */
export function runScript(title: string, script: string, args: () => string[]) {
  return class Run extends View {
    init(_props: unknown, cx: Cx): void {
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
    render(): El {
      return div();
    }
  };
}

/** Shows the shown space's tab named `name`, making it when missing (tmux `select-window -t :name`). */
export function gotoTab(name: string) {
  return class Goto extends View {
    init(): void {
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
    render(): El {
      return div();
    }
  };
}

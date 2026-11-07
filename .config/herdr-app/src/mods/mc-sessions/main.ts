// Previous Claude Code sessions from every machine, newest first, grouped by day. This space:
// sessions on the shown space's machine whose folder is one of its terminals' folders (or
// inside its repo). Clicking Resume runs `claude --resume <id>` in that folder: a new tab in
// the space that holds it, else a new space on that machine.

import { div, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { home, run, spaces, type Program, type SpaceInfo } from "herdr";
import { agentButton, useAgentProgram } from "../../shared/board.ts";
import { loadConfig } from "../../shared/config.ts";
import { copyText, findTab } from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope } from "../../shared/list-view.ts";
import { repoOf, spaceFolders } from "../../shared/repo.ts";
import type { Theme } from "../../shared/ui.ts";
import { ago, baseName, matches, tildify } from "../../shared/util.ts";
import { collect } from "./collect.ts";
import { dayOf, within, type Day, type Session } from "./parse.ts";

const DAYS: Day[] = ["Today", "Yesterday", "This week", "Earlier"];

/** The space on that machine that holds `cwd`, if any. */
function spaceFor(s: Session): SpaceInfo | null {
  const mine = spaces().filter((sp) => (sp.machine ?? null) === s.machine);
  return (
    mine.find((sp) => sp.active && spaceFolders(sp).some((f) => within(s.cwd, f))) ??
    mine.find((sp) => spaceFolders(sp).some((f) => within(s.cwd, f))) ??
    null
  );
}

const tabNameOf = (s: Session) => (s.title.length > 40 ? `${s.title.slice(0, 39)}…` : s.title);

async function resume(s: Session): Promise<void> {
  const existing = findTab(tabNameOf(s));
  if (existing) {
    run("space.select", { id: existing.space.id });
    run("tab.select", { id: existing.tab });
    return;
  }
  const argv = [...(await loadConfig()).agent.resume, s.id];
  const space = spaceFor(s);
  if (space) {
    if (!space.active) run("space.select", { id: space.id });
    run("tab.new", { space: space.id, folder: s.cwd, name: tabNameOf(s), argv });
  } else {
    run("space.new", { machine: s.machine ?? "", folder: s.cwd, argv });
  }
}

export default class Sessions extends ListView<Session> {
  declare failed: string;

  source(): string {
    return "sessions";
  }

  noun(): string {
    return "sessions";
  }

  placeholder(): string {
    return "Search sessions";
  }

  interval(): number {
    return 2 * 60000;
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<Session>> {
    const { sessions, failed } = await collect();
    this.failed = failed.map((f) => `${f.machine}: ${f.why}`).join("; ");
    if (scope === "all") return { items: sessions, caption: "All spaces · every machine" };
    if (!space) return { items: [], note: "No space is shown." };
    const folders = spaceFolders(space);
    const root = (await repoOf(space).catch(() => null))?.root;
    if (root) folders.push(root);
    const machine = space.machine ?? null;
    const items = sessions.filter(
      (s) => s.machine === machine && folders.some((f) => within(s.cwd, f)),
    );
    return {
      items,
      caption: `This space · ${space.name}`,
      note: `No Claude Code sessions in ${space.name} in the last ${(await loadConfig()).sessions.days} days.`,
    };
  }

  visible(items: Session[], query: string): Session[] {
    return items.filter((s) =>
      matches(query, s.title, s.cwd, s.branch, s.machine ?? "this computer", s.id),
    );
  }

  body(t: Theme, items: Session[], cx: Cx): El {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    const now = Date.now();
    return v_flex()
      .id("sessions")
      .flex_1()
      .min_h(0)
      .px(8)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .when(Boolean(this.failed), (el: El) =>
        el.child(
          div()
            .px(6)
            .pb(6)
            .text_size(11.5)
            .text_color(t.blocked)
            .child(`Couldn't read ${this.failed}`),
        ),
      )
      .children(
        DAYS.flatMap((day) => {
          const mine = items.filter((s) => dayOf(s.updated, now) === day);
          if (!mine.length) return [];
          return [
            h_flex()
              .h(26)
              .pt(6)
              .px(6)
              .gap(7)
              .items_center()
              .text_size(12)
              .text_color(t.muted)
              .child(day)
              .child(div().text_size(11).text_color(t.dim).child(String(mine.length))),
            ...mine.map((s) => this.row(t, s, program, all)),
          ];
        }),
      );
  }

  row(t: Theme, s: Session, program: Program | null, all: boolean): El {
    const open = findTab(tabNameOf(s));
    const folder = s.cwd === home() ? "~" : baseName(s.cwd);
    const where = [all || s.machine ? folder : null, s.branch, s.machine, ago(s.updated)]
      .filter(Boolean)
      .join(" · ");
    const agentName = program?.name ?? "agent";
    return h_flex()
      .id(`session-${s.machine ?? ""}-${s.id}`)
      .flex_none()
      .px(8)
      .py(7)
      .gap(10)
      .items_center()
      .rounded(8)
      .cursor_pointer()
      .hover((st: El) => st.bg(t.hover))
      .tooltip(`${tildify(s.cwd, home())}\n${s.id}`)
      .on_click(() => void resume(s))
      .on_mouse_down("right", (_e: unknown, cx: Cx) => {
        cx.stop_propagation();
        void copyText(s.id);
      })
      .child(
        agentButton(
          `resume-${s.machine ?? ""}-${s.id}`,
          open ? `Show the ${tabNameOf(s)} tab` : `Resume with ${agentName}`,
          () => void resume(s),
          program,
          t,
        ),
      )
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(2)
          .child(div().truncate().text_size(13).text_color(t.foreground).child(s.title))
          .child(div().truncate().text_size(11.5).text_color(t.dim).child(where)),
      )
      .when(Boolean(open), (el: El) => el.child(div().size(6).rounded(3).bg(t.working)));
  }
}

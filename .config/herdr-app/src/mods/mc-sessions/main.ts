// Previous Claude Code sessions from every machine, newest first, grouped by day. This space:
// sessions on the shown space's machine whose folder is one of its terminals' folders (or
// inside its repo). Clicking Resume runs `claude --resume <id>` in that folder: a new tab in
// the space that holds it, else a new space on that machine.

import { div, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { home, run, spaces, type Program, type SpaceInfo } from "herdr";
import { useAgentProgram } from "../../shared/board.ts";
import { loadConfig } from "../../shared/config.ts";
import { copyText, findTab, isPending, namedTabs, trackPending } from "../../shared/launch.ts";
import { ListView, type Loaded, type Scope } from "../../shared/list-view.ts";
import { repoOf, spaceFolders } from "../../shared/repo.ts";
import {
  agentIcon,
  alert,
  button,
  dot,
  groupLabel,
  ICON,
  menuButton,
  mono,
  spinner,
  TEXT,
  type Theme,
} from "../../shared/ui.ts";
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

  private found: { items: Session[]; query: string; out: Session[] } | null = null;
  private grouped: {
    items: Session[];
    today: string;
    days: { day: Day; rows: Session[] }[];
  } | null = null;

  visible(items: Session[], query: string): Session[] {
    if (this.found?.items === items && this.found.query === query) return this.found.out;
    const out = items.filter((s) =>
      matches(query, s.title, s.cwd, s.branch, s.machine ?? "this computer", s.id),
    );
    this.found = { items, query, out };
    return out;
  }

  /** Day groups, rebuilt only when the rows or the calendar day change. */
  groups(items: Session[]): { day: Day; rows: Session[] }[] {
    const today = new Date().toDateString();
    if (this.grouped?.items === items && this.grouped.today === today) return this.grouped.days;
    const now = Date.now();
    const days = DAYS.map((day) => ({
      day,
      rows: items.filter((s) => dayOf(s.updated, now) === day),
    })).filter((g) => g.rows.length);
    this.grouped = { items, today, days };
    return days;
  }

  body(t: Theme, items: Session[], cx: Cx): El {
    const program = useAgentProgram(cx);
    const all = this.scope() === "all";
    // One look per render, not one per row.
    const tabs = namedTabs();
    const here = home();
    return v_flex()
      .id("sessions")
      .flex_1()
      .min_h(0)
      .px(12)
      .pb(14)
      .gap(1)
      .overflow_y_scrollbar()
      .when(Boolean(this.failed), (el: El) =>
        el.child(
          div()
            .pb(6)
            .child(alert(`Couldn't read ${this.failed}`, { variant: "destructive" })),
        ),
      )
      .children(
        this.groups(items).flatMap(({ day, rows }) => [
          groupLabel(`group-${day}`, day, { count: rows.length }),
          ...rows.map((s) => this.row(t, s, program, all, tabs, here)),
        ]),
      );
  }

  row(
    t: Theme,
    s: Session,
    program: Program | null,
    all: boolean,
    tabs: Set<string>,
    here: string,
  ): El {
    const open = tabs.has(tabNameOf(s));
    const key = `resume-${s.machine ?? ""}-${s.id}`;
    const starting = isPending(key);
    const go = (cx: Cx) => trackPending(key, cx, () => resume(s));
    const folder = s.cwd === here ? "~" : baseName(s.cwd);
    const folderShown = all || s.machine ? folder : null;
    const agentName = program?.name ?? "agent";
    return menuButton(`session-${s.machine ?? ""}-${s.id}`, {
      size: "auto",
      onClick: (_e: unknown, cx: Cx) => go(cx),
    })
      .flex_none()
      .gap(10)
      .tooltip(`${tildify(s.cwd, home())}\n${s.id}`)
      .on_mouse_down("right", (_e: unknown, cx: Cx) => {
        cx.stop_propagation();
        void copyText(s.id);
      })
      .child(
        button(key, {
          variant: "ghost",
          size: "icon-xs",
          icon: agentIcon(program, ICON.sm, t.foreground),
          tooltip: open ? `Show the ${tabNameOf(s)} tab` : `Resume with ${agentName}`,
          onClick: (_e, cx) => go(cx),
        }),
      )
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(2)
          .child(div().truncate().child(s.title))
          .child(
            h_flex()
              .min_w(0)
              .gap(4)
              .text_size(TEXT.xs)
              .text_color(t.muted)
              .children(
                [
                  folderShown ? mono(folderShown) : null,
                  s.branch ? mono(s.branch) : null,
                  s.machine ? div().child(s.machine) : null,
                  div().child(ago(s.updated)),
                ]
                  .filter((p): p is El => p !== null)
                  .flatMap((part, i) => (i ? [div().flex_none().child("·"), part] : [part])),
              ),
          ),
      )
      .when(starting, (el: El) => el.child(spinner(ICON.sm, t.working)))
      .when(open && !starting, (el: El) => el.child(dot(t.working)));
  }
}

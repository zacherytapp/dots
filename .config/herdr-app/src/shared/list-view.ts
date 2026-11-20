// The frame every work-queue panel shares: This space / All spaces, a search field, refresh
// and settings buttons, a body, and a footer saying how much loaded and when. Subclasses
// say what to load (`fetch`) and how to draw it (`body`).

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import { layout, run, setShared, shared, theme, type SpaceInfo } from "herdr";
import { editConfigArgs, saveToken } from "./config.ts";
import { openUrl } from "./launch.ts";
import { activeSpace } from "./repo.ts";
import { KEYS, NODES } from "./sources.ts";
import {
  alert,
  button,
  card,
  emptyState,
  ICON,
  icon,
  searchBox,
  separator,
  skeleton,
  tabs,
  TEXT,
  type IconName,
  type Theme,
} from "./ui.ts";
import { ago, findNode } from "./util.ts";

export type Scope = "space" | "all";

/** What a load found: rows, or that the source needs setting up first. */
export interface Loaded<T> {
  items?: T[];
  /** Shown beside the footer: "This space · dots", "All spaces". */
  caption?: string;
  /** Why this scope shows nothing that isn't an error ("dots has no GitHub remote"). */
  note?: string;
  setup?: { title: string; body: string };
  /** A token is missing or refused: the panel asks for one (see TokenAsk). */
  token?: TokenAsk;
  /** Part of the load failed (one provider of two): said in the footer, the rest still shows. */
  warning?: string;
}

/** Asks for an access token in the panel itself; saving it reloads the panel. */
export interface TokenAsk {
  /** Names the saved file (~/.config/herdr-app/mission-control/<service>.token). */
  service: string;
  title: string;
  body: string;
  /** Where to make one. */
  createUrl?: string | null;
}

interface Snapshot<T> {
  items: T[];
  caption: string;
  note: string;
  setup: Loaded<T>["setup"] | null;
  token: TokenAsk | null;
  warning: string;
  at: number;
}

/** A scope looked at this recently is shown from memory when switched back to, not asked again. */
const FRESH_MS = 30000;

const SCOPES: { value: Scope; label: string }[] = [
  { value: "space", label: "This space" },
  { value: "all", label: "All spaces" },
];

export class ListView<T> extends View {
  declare snap: Snapshot<T>;
  declare cache: Map<string, Snapshot<T>>;
  /** Loading with nothing to show yet for this scope (the panel says "Loading…"). */
  declare loading: boolean;
  /** Any load in flight, a quiet refresh too: the refresh button spins. */
  declare busy: boolean;
  declare error: string | null;
  declare search: InputState;
  declare width: number;
  declare seq: number;
  declare loadedKey: string;
  declare tokenInput: InputState;
  declare saving: boolean;
  /** When the last load started (ms), so a shown panel looks again once `interval()` has passed. */
  declare tried: number;
  /** The last search result, reused while the rows and the query are the same. */
  declare memo: { items: T[]; query: string; shown: T[] } | null;

  // ---- for subclasses -------------------------------------------------------------------
  /** The source id (`issues`, `pulls`, ...): names the shared scope key. */
  source(): string {
    return "list";
  }
  placeholder(): string {
    return "Search";
  }
  /** Noun for the footer count: "issues", "pull requests". */
  noun(): string {
    return "items";
  }
  /** How often to look again on its own, ms. */
  interval(): number {
    return 5 * 60000;
  }
  async fetch(_scope: Scope, _space: SpaceInfo | null): Promise<Loaded<T>> {
    return { items: [] };
  }
  /** Drawn between the toolbar and the body (filter chips). */
  subbar(_t: Theme, _items: T[]): El | null {
    return null;
  }
  body(_t: Theme, _items: T[], _cx: Cx): El {
    return div();
  }
  /** Rows matching the search. */
  visible(items: T[], _query: string): T[] {
    return items;
  }
  /** Extra toolbar buttons before refresh. */
  tools(_t: Theme): El[] {
    return [];
  }
  hasSettings(): boolean {
    return true;
  }

  // ---- shared behavior ------------------------------------------------------------------
  init(_props: unknown, cx: Cx): void {
    this.snap = { items: [], caption: "", note: "", setup: null, token: null, warning: "", at: 0 };
    this.cache = new Map();
    this.loading = false;
    this.busy = false;
    this.error = null;
    this.width = 0;
    this.seq = 0;
    this.loadedKey = "";
    this.search = InputState.new({ placeholder: this.placeholder() });
    this.search.on("change", (_e, cx) => cx.notify());
    this.saving = false;
    this.tokenInput = InputState.new({ placeholder: "Paste an access token" });
    this.tokenInput.set_masked(true);
    this.tokenInput.on("submit", (_e, cx) => this.saveToken(cx));
    this.tried = 0;
    this.memo = null;
    // Render starts the first load and notices a new space or scope (it runs on every change of
    // either). This only looks again while nothing else redraws a shown panel; a hidden one waits
    // until it is shown, then refreshes if it is stale.
    cx.timer.every(Math.min(this.interval(), 60000), (cx) => {
      if (this.shown() && this.due()) this.reload(cx, true);
    });
  }

  /**
   * Whether this copy is on screen: the panel is open and its stack shows this source. Copies stay
   * alive while hidden (another source, panel closed), so they skip loading and drawing then.
   * True when it isn't in the panel at all.
   */
  shown(): boolean {
    const root = layout();
    const body = findNode(root, NODES.body);
    if (!body?.children?.some((c) => c.id === this.source())) return true;
    return !findNode(root, NODES.panel)?.hidden && body.active === this.source();
  }

  /** Time to look again: never loaded, or `interval()` since the last try. */
  due(): boolean {
    return !this.busy && Date.now() - this.tried >= this.interval();
  }

  /** Saves the pasted token for the service the panel asked about, then loads again. */
  saveToken(cx: Cx): void {
    const ask = this.snap.token;
    const token = this.tokenInput.value().trim();
    if (!ask || !token || this.saving) return;
    this.saving = true;
    cx.notify();
    cx.spawn(async (cx) => {
      try {
        await saveToken(ask.service, token);
        this.tokenInput.set_value("");
        this.cache.clear();
        this.reload(cx);
      } catch (e) {
        this.error = `Couldn't save the token: ${String((e as Error)?.message ?? e)}`;
      } finally {
        this.saving = false;
        cx.notify();
      }
    });
  }

  tokenForm(t: Theme, ask: TokenAsk, compact: boolean): El {
    const buttons = h_flex()
      .gap(8)
      .child(
        button("token-save", {
          label: this.saving ? "Saving…" : "Save token",
          variant: "default",
          size: "sm",
          onClick: (_e, cx) => this.saveToken(cx),
        }),
      )
      .when(Boolean(ask.createUrl), (el: El) =>
        el.child(
          button("token-create", {
            label: "Create a token",
            variant: "outline",
            size: "sm",
            onClick: () => void openUrl(ask.createUrl as string),
          }),
        ),
      );
    const field = h_flex().w_full().max_w(420).child(searchBox("token-input", this.tokenInput));
    if (compact) {
      return card()
        .flex_none()
        .mx(12)
        .mb(8)
        .child(div().text_size(TEXT.sm).font_medium().text_color(t.foreground).child(ask.title))
        .child(div().text_size(TEXT.xs).text_color(t.muted).child(ask.body))
        .child(field)
        .child(buttons);
    }
    return emptyState(ask.title, ask.body, [
      v_flex()
        .gap(8)
        .items_center()
        .w_full()
        .max_w(420)
        .child(field)
        .child(buttons)
        .when(Boolean(this.error), (el: El) =>
          el.child(
            h_flex()
              .w_full()
              .child(alert(this.error as string, { variant: "destructive" })),
          ),
        )
        .child(
          div()
            .text_size(TEXT.xs)
            .text_color(t.muted)
            .text_center()
            .child(
              "Saved in ~/.config/herdr-app/mission-control/, readable only by you and never in the dots repo.",
            ),
        ),
    ]);
  }

  /** Placeholder cards while the first load runs. */
  skeletons(): El {
    return v_flex()
      .flex_1()
      .min_h(0)
      .p(12)
      .gap(8)
      .children(
        [0, 1, 2].map(() =>
          card()
            .flex_none()
            .child(skeleton(120, 12))
            .child(skeleton(null, 14))
            .child(skeleton(180, 12)),
        ),
      );
  }

  scope(): Scope {
    return shared(KEYS.scope(this.source())) === "all" ? "all" : "space";
  }

  key(): string {
    return this.scope() === "all" ? "all" : `space:${activeSpace()?.id ?? ""}`;
  }

  setScope(scope: Scope, cx: Cx): void {
    setShared(KEYS.scope(this.source()), scope);
    this.switchTo(cx, this.key());
    cx.notify();
  }

  /** Loads again now and redraws (from a handler or a task, never from render). */
  reload(cx: Cx, quiet = false): void {
    this.load(cx, quiet);
    cx.notify();
  }

  /**
   * Shows another scope (a space switch, This space / All spaces): what it had last time at once,
   * then asks again unless that was moments ago. No redraw, so render may call it.
   */
  switchTo(cx: Cx, key: string): void {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < FRESH_MS) {
      // A load still running for the scope left behind must not land here.
      this.seq++;
      this.snap = hit;
      this.loadedKey = key;
      this.tried = hit.at;
      this.error = null;
      this.loading = this.busy = false;
      return;
    }
    this.load(cx, Boolean(hit), key);
  }

  /** Starts a load without asking for a redraw, so render may call it: render draws the result. */
  load(cx: Cx, quiet = false, key = this.key()): void {
    const seq = ++this.seq;
    this.tried = Date.now();
    if (key !== this.loadedKey) {
      // Show what this scope had last time while it loads again.
      this.snap = this.cache.get(key) ?? {
        items: [],
        caption: "",
        note: "",
        setup: null,
        token: null,
        warning: "",
        at: 0,
      };
      this.error = null;
    }
    this.loadedKey = key;
    this.loading = !quiet;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const r = await this.fetch(this.scope(), activeSpace());
        if (seq !== this.seq) return;
        this.snap = {
          items: r.items ?? [],
          caption: r.caption ?? "",
          note: r.note ?? "",
          setup: r.setup ?? null,
          token: r.token ?? null,
          warning: r.warning ?? "",
          at: Date.now(),
        };
        this.cache.set(key, this.snap);
        this.error = null;
      } catch (e) {
        if (seq !== this.seq) return;
        this.error =
          String((e as Error)?.message ?? e)
            .trim()
            .slice(0, 400) || "Couldn't load.";
      } finally {
        if (seq === this.seq) {
          this.loading = false;
          this.busy = false;
          cx.notify();
        }
      }
    });
  }

  toolbar(t: Theme): El {
    const narrow = this.width > 0 && this.width < 460;
    const scope = tabs("scope", SCOPES, this.scope(), (s, cx) => this.setScope(s, cx));
    const buttons = h_flex()
      .flex_none()
      .gap(2)
      .items_center()
      .children(this.tools(t))
      .child(
        button("refresh", {
          icon: "refresh-cw",
          tooltip: this.busy ? "Loading…" : "Refresh",
          size: "icon-sm",
          active: this.busy,
          spin: this.busy,
          onClick: (_e, cx) => this.reload(cx),
        }),
      )
      .when(this.hasSettings(), (el: El) =>
        el.child(
          button("settings", {
            icon: "settings",
            tooltip: "Edit mission-control.json",
            size: "icon-sm",
            onClick: () => run("tab.new", editConfigArgs()),
          }),
        ),
      );
    const search = searchBox("search", this.search);
    // The bottom border mirrors the footer's top one.
    const bar = narrow
      ? v_flex()
          .flex_none()
          .px(12)
          .py(8)
          .gap(8)
          .child(h_flex().items_center().gap(8).child(scope).child(div().flex_1()).child(buttons))
          .child(h_flex().child(search))
      : h_flex()
          .flex_none()
          .px(12)
          .py(8)
          .gap(8)
          .items_center()
          .child(scope)
          .child(search)
          .child(buttons);
    return v_flex().flex_none().child(bar).child(separator());
  }

  footer(t: Theme, shown: number): El {
    const total = this.snap.items.length;
    // Nothing loaded and the body says why (set up, a token, no remote, an error): a count of 0
    // would read as a load that worked and found nothing.
    const explained =
      total === 0 && Boolean(this.snap.setup || this.snap.token || this.snap.note || this.error);
    const count = explained
      ? ""
      : shown === total
        ? `${total} ${this.noun()}`
        : `${shown} of ${total} ${this.noun()}`;
    const when = this.loading
      ? "Loading…"
      : this.busy
        ? "Refreshing…"
        : this.snap.at
          ? `Updated ${ago(this.snap.at)}`
          : "";
    return h_flex()
      .flex_none()
      .h(32)
      .px(12)
      .gap(8)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(TEXT.xs)
      .text_color(t.muted)
      .child(div().flex_none().child([count, when].filter(Boolean).join(" · ")))
      .when(Boolean(this.error && total > 0) || Boolean(this.snap.warning), (el: El) => {
        const text = (this.error && total > 0 ? this.error : "") || this.snap.warning;
        return el.child(div().min_w(0).truncate().text_color(t.blocked).tooltip(text).child(text));
      })
      .child(div().flex_1())
      .when(Boolean(this.snap.caption), (el: El) =>
        el.child(div().min_w(0).truncate().child(this.snap.caption)),
      );
  }

  /** `visible()` for the current rows and query, worked out again only when either changed. */
  shownItems(): T[] {
    const query = this.search.value();
    const m = this.memo;
    if (m && m.items === this.snap.items && m.query === query) return m.shown;
    const shown = this.visible(this.snap.items, query);
    this.memo = { items: this.snap.items, query, shown };
    return shown;
  }

  render(cx: Cx): El {
    const t = theme();
    const root = v_flex()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_size(TEXT.sm)
      .text_color(t.foreground)
      .on_size_change((size: { width: number }, cx: Cx) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx.notify();
        }
      });
    // Hidden: draw nothing and load nothing. Showing it changes the layout, which renders again.
    if (!this.shown()) return root;
    const key = this.key();
    if (key !== this.loadedKey) this.switchTo(cx, key);
    else if (this.due()) this.load(cx, true, key);
    const items = this.shownItems();
    let content: El;
    if (this.snap.setup) {
      content = emptyState(this.snap.setup.title, this.snap.setup.body, [
        button("setup", {
          label: "Edit mission-control.json",
          variant: "default",
          size: "sm",
          onClick: () => run("tab.new", editConfigArgs()),
        }),
      ]);
    } else if (this.snap.token && !this.snap.items.length) {
      content = this.tokenForm(t, this.snap.token, false);
    } else if (this.error && !this.snap.items.length) {
      content = emptyState("Couldn't load", this.error, [
        button("retry", {
          label: "Try again",
          variant: "outline",
          size: "sm",
          onClick: (_e, cx) => this.reload(cx),
        }),
      ]);
    } else if (!this.snap.items.length) {
      content = this.loading
        ? this.skeletons()
        : emptyState(
            this.snap.note || `No ${this.noun()}`,
            "",
            this.scope() === "space"
              ? [
                  button("all", {
                    label: "Show all spaces",
                    variant: "outline",
                    size: "sm",
                    onClick: (_e, cx) => this.setScope("all", cx),
                  }),
                ]
              : [],
          );
    } else {
      content = this.snap.token
        ? v_flex()
            .flex_1()
            .min_h(0)
            .child(this.tokenForm(t, this.snap.token, true))
            .child(this.body(t, items, cx))
        : this.body(t, items, cx);
    }
    const sub = this.snap.items.length && !this.snap.setup ? this.subbar(t, items) : null;
    return root
      .child(this.toolbar(t))
      .when(Boolean(sub), (el: El) => el.child(sub as El))
      .child(v_flex().flex_1().min_h(0).child(content))
      .child(this.footer(t, items.length));
  }
}

/** A muted one-line notice with an icon. */
export function notice(t: Theme, name: IconName, text: string): El {
  return h_flex()
    .gap(6)
    .items_center()
    .text_size(TEXT.xs)
    .text_color(t.muted)
    .child(icon(name, ICON.xs))
    .child(div().min_w(0).truncate().child(text));
}

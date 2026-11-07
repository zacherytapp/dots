// The frame every work-queue panel shares: This space / All spaces, a search field, refresh
// and settings buttons, a body, and a footer saying how much loaded and when. Subclasses
// say what to load (`fetch`) and how to draw it (`body`).

import { div, svg, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, InputState } from "gpui-base";
import { run, setShared, shared, theme, type SpaceInfo } from "herdr";
import { editConfigArgs, saveToken } from "./config.ts";
import { openUrl } from "./launch.ts";
import { activeSpace } from "./repo.ts";
import { KEYS } from "./sources.ts";
import {
  emptyState,
  iconButton,
  searchBox,
  segmented,
  textButton,
  chromeIcon,
  asset,
  type Theme,
} from "./ui.ts";
import { ago } from "./util.ts";

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

const SCOPES: { value: Scope; label: string }[] = [
  { value: "space", label: "This space" },
  { value: "all", label: "All spaces" },
];

export class ListView<T> extends View {
  declare snap: Snapshot<T>;
  declare cache: Map<string, Snapshot<T>>;
  declare loading: boolean;
  declare error: string | null;
  declare search: InputState;
  declare width: number;
  declare seq: number;
  declare loadedKey: string;
  declare tokenInput: InputState;
  declare saving: boolean;

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
    this.reload(cx);
    // The shown space or the scope changed: load what it shows now.
    cx.timer.every(1500, (cx) => {
      if (this.key() !== this.loadedKey) this.reload(cx);
    });
    cx.timer.every(this.interval(), (cx) => this.reload(cx, true));
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
        textButton(
          "token-save",
          this.saving ? "Saving…" : "Save token",
          (_e, cx) => this.saveToken(cx),
          {
            primary: true,
          },
        ),
      )
      .when(Boolean(ask.createUrl), (el: El) =>
        el.child(
          textButton("token-create", "Create a token", () => void openUrl(ask.createUrl as string)),
        ),
      );
    const field = h_flex().w_full().max_w(420).child(searchBox("token-input", this.tokenInput));
    if (compact) {
      return v_flex()
        .flex_none()
        .mx(12)
        .mb(8)
        .p(10)
        .gap(8)
        .rounded(9)
        .border(1)
        .border_color(t.border)
        .bg(t.surface)
        .child(div().text_size(12.5).text_color(t.foreground).child(ask.title))
        .child(div().text_size(11.5).text_color(t.muted).child(ask.body))
        .child(field)
        .child(buttons);
    }
    return v_flex()
      .flex_1()
      .min_h(0)
      .items_center()
      .justify_center()
      .gap(10)
      .p(24)
      .child(div().text_size(13.5).font_medium().text_color(t.foreground).child(ask.title))
      .child(div().max_w(420).text_size(12.5).text_color(t.muted).text_center().child(ask.body))
      .child(field)
      .child(buttons)
      .when(Boolean(this.error), (el: El) =>
        el.child(
          div().max_w(420).text_size(12).text_color(t.blocked).text_center().child(this.error),
        ),
      )
      .child(
        div()
          .max_w(420)
          .text_size(11)
          .text_color(t.dim)
          .text_center()
          .child(
            "Saved in ~/.config/herdr-app/mission-control/, readable only by you and never in the dots repo.",
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
    this.reload(cx);
  }

  reload(cx: Cx, quiet = false): void {
    const key = this.key();
    const seq = ++this.seq;
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
    if (!quiet) this.loading = true;
    cx.notify();
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
          cx.notify();
        }
      }
    });
  }

  toolbar(t: Theme): El {
    const narrow = this.width > 0 && this.width < 460;
    const scope = segmented("scope", SCOPES, this.scope(), (s, cx) => this.setScope(s, cx));
    const buttons = h_flex()
      .flex_none()
      .gap(2)
      .items_center()
      .children(this.tools(t))
      .child(
        iconButton("refresh", asset("refresh"), "Refresh", (_e, cx) => this.reload(cx), {
          active: this.loading,
        }),
      )
      .when(this.hasSettings(), (el: El) =>
        el.child(
          iconButton("settings", chromeIcon("settings"), "Edit mission-control.json", () =>
            run("tab.new", editConfigArgs()),
          ),
        ),
      );
    const search = searchBox("search", this.search);
    if (narrow) {
      return v_flex()
        .flex_none()
        .px(12)
        .pt(10)
        .gap(8)
        .child(h_flex().items_center().gap(8).child(scope).child(div().flex_1()).child(buttons))
        .child(h_flex().child(search));
    }
    return h_flex()
      .flex_none()
      .px(14)
      .pt(12)
      .gap(10)
      .items_center()
      .child(scope)
      .child(search)
      .child(buttons);
  }

  footer(t: Theme, shown: number): El {
    const total = this.snap.items.length;
    const count =
      shown === total ? `${total} ${this.noun()}` : `${shown} of ${total} ${this.noun()}`;
    const when = this.loading ? "Loading…" : this.snap.at ? `Updated ${ago(this.snap.at)}` : "";
    return h_flex()
      .flex_none()
      .h(30)
      .px(14)
      .gap(8)
      .items_center()
      .border_t(1)
      .border_color(t.border)
      .text_size(11.5)
      .text_color(t.dim)
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

  render(cx: Cx): El {
    const t = theme();
    const items = this.visible(this.snap.items, this.search.value());
    let content: El;
    if (this.snap.setup) {
      content = emptyState(this.snap.setup.title, this.snap.setup.body, [
        textButton("setup", "Edit mission-control.json", () => run("tab.new", editConfigArgs()), {
          primary: true,
        }),
      ]);
    } else if (this.snap.token && !this.snap.items.length) {
      content = this.tokenForm(t, this.snap.token, false);
    } else if (this.error && !this.snap.items.length) {
      content = emptyState("Couldn't load", this.error, [
        textButton("retry", "Try again", (_e, cx) => this.reload(cx)),
      ]);
    } else if (!this.snap.items.length) {
      content = this.loading
        ? emptyState("Loading…", "")
        : emptyState(
            this.snap.note || `No ${this.noun()}`,
            "",
            this.scope() === "space"
              ? [textButton("all", "Show all spaces", (_e, cx) => this.setScope("all", cx))]
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
    const sub =
      this.snap.items.length && !this.snap.setup
        ? this.subbar(t, this.visible(this.snap.items, this.search.value()))
        : null;
    return v_flex()
      .id("root")
      .size_full()
      .min_h(0)
      .bg(t.background)
      .text_size(13)
      .text_color(t.foreground)
      .on_size_change((size: { width: number }, cx: Cx) => {
        if (Math.abs(size.width - this.width) >= 1) {
          this.width = size.width;
          cx.notify();
        }
      })
      .child(this.toolbar(t))
      .when(Boolean(sub), (el: El) => el.child(sub as El))
      .child(v_flex().flex_1().min_h(0).pt(10).child(content))
      .child(this.footer(t, items.length));
  }
}

/** A dim one-line notice with an icon. */
export function notice(t: Theme, icon: string, text: string): El {
  return h_flex()
    .gap(6)
    .items_center()
    .text_size(12)
    .text_color(t.dim)
    .child(svg(icon).size(12).flex_none())
    .child(div().min_w(0).truncate().child(text));
}

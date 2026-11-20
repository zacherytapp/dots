// Shared building blocks so every Mission Control mod looks the same: shadcn/ui's components
// (new-york v4), sized for a dense desktop app, with colors from `theme()` so the mods follow the
// layout's theme (gruvbox-material here). Herdr's theme roles line up with shadcn's tokens:
//
//   shadcn            theme()                 shadcn             theme()
//   background        background / chrome     muted, secondary   selected (bg), muted (text)
//   card              surface                 accent (hover)     hover
//   popover           popover                 border / input     border / input
//   primary           solid / solid_fg        ring               ring
//   destructive       blocked                 muted-foreground   muted
//
// Type is Geist (settings.json `ui_font`) with Geist Mono for code, paths and numbers. Sizes:
// shadcn's scale one step denser (text-sm 14 → 13), radius 10 (sm 6, md 8, lg 10, xl 14), Lucide
// icons at 16 in buttons and menus, 12 in badges. Build from these, not ad-hoc numbers.

import { div, image, svg, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, Input, type InputState } from "gpui-base";
import { theme, type Program, type Status } from "herdr";
import { asset, type IconName } from "./icons.ts";
import type { Source } from "./sources.ts";

export { asset, type IconName };

export type Theme = Record<string, string>;

// ---------------------------------------------------------------------------------------------
// Tokens

/** Code, paths, branch names, counts that should line up. The UI face is settings.json's. */
export const MONO = "Geist Mono";

/** Text sizes: xs = shadcn text-xs, sm = body (text-sm, one step denser), md = titles. */
export const TEXT = { xs: 12, sm: 13, md: 14, lg: 16 } as const;

/** Corner radii: sm for menu items and kbd, md for controls, lg for cards, xl for panels. */
export const RADIUS = { sm: 6, md: 8, lg: 10, xl: 14, full: 9999 } as const;

/** Icon sizes: xs in badges, sm in small buttons, md in buttons, menus and rows. */
export const ICON = { xs: 12, sm: 14, md: 16 } as const;

/** The transparent color, for borders that only show in one state. */
export const TRANSPARENT = "#00000000";

/** `#rrggbb` plus an alpha byte, for tinted fills. */
export const alpha = (color: string | undefined, a: string): string =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? TRANSPARENT);

/** Keeps a press on a control from dragging the window or reaching the row under it. */
export const stopPress = (_e: unknown, cx: Cx): void => cx.stop_propagation();

// ---------------------------------------------------------------------------------------------
// Icons

/** A Lucide icon (or brand mark) from the shared set, `currentColor` unless `color` is given. */
export function icon(name: IconName, size: number = ICON.md, color?: string): El {
  const el = svg(asset(name)).size(size).flex_none();
  return color ? el.text_color(color) : el;
}

/** Lucide's loader-circle, spinning: the busy indicator everywhere. */
export function spinner(size: number = ICON.sm, color?: string): El {
  return icon("loader-circle", size, color).spin(900);
}

export const sourceIcon = (s: Source): string => asset(s.icon);

export function programIcon(p: Program | null | undefined, size: number, color: string): El | null {
  if (!p?.icon) return null;
  return p.tint
    ? svg(p.icon).size(size).flex_none().text_color(color)
    : image(p.icon).w(size).h(size).flex_none();
}

/** An agent's own icon, else Lucide's bot. */
export function agentIcon(p: Program | null | undefined, size: number, color: string): El {
  return programIcon(p, size, color) ?? icon("bot", size, color);
}

// ---------------------------------------------------------------------------------------------
// Text

/** A run of Geist Mono text: code, paths, branch names, #numbers, counts. */
export function mono(text: string): El {
  return div().font_family(MONO).child(text);
}

/** "a · b · c" in muted xs text, dropping empty parts. */
export function metaLine(parts: (string | null | undefined | false)[]): El {
  const t = theme();
  return div()
    .min_w(0)
    .truncate()
    .text_size(TEXT.xs)
    .text_color(t.muted)
    .child(parts.filter(Boolean).join(" · "));
}

// ---------------------------------------------------------------------------------------------
// Button

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
export type ButtonSize = "default" | "sm" | "xs" | "icon" | "icon-sm" | "icon-xs";

const BUTTON_SIZES: Record<
  ButtonSize,
  { h: number; px: number; gap: number; text: number; icon: number; square: boolean }
> = {
  default: { h: 32, px: 12, gap: 6, text: TEXT.sm, icon: ICON.md, square: false },
  sm: { h: 28, px: 10, gap: 6, text: TEXT.sm, icon: ICON.sm, square: false },
  xs: { h: 24, px: 8, gap: 4, text: TEXT.xs, icon: ICON.xs, square: false },
  icon: { h: 32, px: 0, gap: 0, text: TEXT.sm, icon: ICON.md, square: true },
  "icon-sm": { h: 28, px: 0, gap: 0, text: TEXT.sm, icon: ICON.md, square: true },
  "icon-xs": { h: 24, px: 0, gap: 0, text: TEXT.xs, icon: ICON.sm, square: true },
};

export interface ButtonOptions {
  label?: string;
  /** A Lucide name, or an element (a program icon) drawn at the size's icon slot. */
  icon?: IconName | El;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A toggle that is on (shadcn Toggle `data-state=on`). */
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  /** Spin the icon (refreshing). */
  spin?: boolean;
  /** Text and icon color, for a tinted ghost or outline button. */
  tone?: string;
  /** Override the size's icon size. */
  iconSize?: number;
  onClick?: (e: unknown, cx: Cx) => void;
}

/** shadcn Button: one control for every clickable action, icon-only or labelled. */
export function button(id: string, o: ButtonOptions): El {
  const t = theme();
  const variant = o.variant ?? "ghost";
  const s = BUTTON_SIZES[o.size ?? (o.label ? "sm" : "icon-sm")];
  const iconSize = o.iconSize ?? s.icon;
  const glyph =
    o.icon === undefined
      ? null
      : typeof o.icon === "string"
        ? icon(o.icon as IconName, iconSize).when(Boolean(o.spin), (el: El) => el.spin(900))
        : o.icon;

  let el = h_flex()
    .id(id)
    .h(s.h)
    .flex_none()
    .items_center()
    .justify_center()
    .gap(s.gap)
    .rounded(RADIUS.md)
    .text_size(s.text)
    .font_medium()
    .border(1)
    .border_color(TRANSPARENT);
  el = s.square ? el.w(s.h) : el.px(glyph && o.label ? s.px - 2 : s.px);

  const fg = o.tone ?? t.foreground;
  switch (variant) {
    case "default":
      el = el
        .bg(t.solid)
        .text_color(t.solid_foreground)
        .hover((h: El) => h.bg(alpha(t.solid, "e6")));
      break;
    case "secondary":
      el = el
        .bg(t.selected)
        .text_color(fg)
        .hover((h: El) => h.bg(t.input));
      break;
    case "outline":
      el = el
        .border_color(t.input)
        .bg(o.active ? t.selected : t.hover)
        .text_color(fg)
        .shadow_xs()
        .hover((h: El) => h.bg(t.selected));
      break;
    case "destructive":
      el = el
        .bg(alpha(t.blocked, "99"))
        .text_color(t.foreground)
        .hover((h: El) => h.bg(alpha(t.blocked, "cc")));
      break;
    case "link":
      el = el
        .px(0)
        .h_auto()
        .text_color(o.tone ?? t.accent)
        .hover((h: El) => h.underline());
      break;
    default:
      el = el
        .text_color(o.active ? fg : (o.tone ?? t.muted))
        .when(Boolean(o.active), (a: El) => a.bg(t.selected))
        .hover((h: El) => h.bg(t.selected).text_color(fg));
  }

  if (o.disabled) {
    el = el.opacity(0.5);
  } else {
    el = el.cursor_pointer().on_mouse_down("left", stopPress);
    if (o.onClick) el = el.on_click(o.onClick);
  }
  if (o.tooltip) el = el.tooltip(o.tooltip);
  if (glyph) el = el.child(glyph);
  if (o.label) el = el.child(o.label);
  return el;
}

// ---------------------------------------------------------------------------------------------
// Badge, Kbd, dots, avatar

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "ghost";

export interface BadgeOptions {
  variant?: BadgeVariant;
  /** A color that tints the badge: text in it, background (or border, for outline) faintly. */
  tone?: string;
  icon?: IconName | El;
  /** A status dot before the label, in this color. */
  dot?: string;
  mono?: boolean;
  tooltip?: string;
  /** Required with `onClick` or `tooltip`. */
  id?: string;
  onClick?: (e: unknown, cx: Cx) => void;
}

/** shadcn Badge: h20 pill, xs medium text, 12px icon. Labels, statuses, counts. */
export function badge(label: string | null, o: BadgeOptions = {}): El {
  const t = theme();
  const variant = o.variant ?? (o.tone ? "secondary" : "outline");
  let el = h_flex()
    .h(20)
    .px(label ? 8 : 4)
    .gap(4)
    .flex_none()
    .items_center()
    .rounded(RADIUS.full)
    .border(1)
    .border_color(TRANSPARENT)
    .text_size(TEXT.xs)
    .font_medium()
    .whitespace_nowrap();
  if (o.id) el = el.id(o.id);
  const tone = o.tone;
  switch (variant) {
    case "default":
      el = el.bg(tone ?? t.solid).text_color(tone ? t.accent_foreground : t.solid_foreground);
      break;
    case "secondary":
      el = el.bg(tone ? alpha(tone, "26") : t.selected).text_color(tone ?? t.foreground);
      break;
    case "destructive":
      el = el.bg(alpha(t.blocked, "26")).text_color(t.blocked);
      break;
    case "ghost":
      el = el.text_color(tone ?? t.muted);
      break;
    default:
      el = el.border_color(tone ? alpha(tone, "59") : t.border).text_color(tone ?? t.foreground);
  }
  if (o.onClick) {
    el = el
      .cursor_pointer()
      .hover((h: El) => h.bg(t.hover))
      .on_mouse_down("left", stopPress)
      .on_click(o.onClick);
  }
  if (o.tooltip) el = el.tooltip(o.tooltip);
  if (o.dot) el = el.child(dot(o.dot));
  if (o.icon)
    el = el.child(typeof o.icon === "string" ? icon(o.icon as IconName, ICON.xs) : o.icon);
  if (label) el = el.child(o.mono ? mono(label) : label);
  return el;
}

/** shadcn Kbd: a key cap. Pass a Lucide name (arrow-up, corner-down-left) for a symbol key. */
export function kbd(key: string, iconName?: IconName): El {
  const t = theme();
  return h_flex()
    .h(20)
    .min_w(20)
    .px(4)
    .gap(4)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(RADIUS.sm)
    .bg(t.selected)
    .text_size(TEXT.xs)
    .font_medium()
    .text_color(t.muted)
    .when(Boolean(iconName), (el: El) => el.child(icon(iconName as IconName, ICON.xs)))
    .when(Boolean(key), (el: El) => el.child(key));
}

/** A small status dot; `ring` draws it hollow (idle). */
export function dot(color: string, o: { size?: number; ring?: boolean } = {}): El {
  const size = o.size ?? 6;
  const el = div().size(size).flex_none().rounded(RADIUS.full);
  return o.ring ? el.border(1.5).border_color(color) : el.bg(color);
}

/** Space avatar colors, the same ones Herdr's own spaces list uses (shared key `space.colors`). */
export const SPACE_MARKS: Record<string, string> = {
  ansi6: "#22a99a",
  ansi3: "#e3814f",
  ansi4: "#5b8def",
  ansi5: "#8b7cf6",
  ansi2: "#3fae6a",
  ansi1: "#d9649a",
};

/** A space's avatar fill from its stored color: a hex color, a palette name, else a theme color. */
export function spaceFill(t: Theme, color: string): string {
  if (color.startsWith("#")) return color;
  return SPACE_MARKS[color] ?? t[color] ?? t.accent;
}

/** shadcn Avatar (rounded-md, as in the sidebar): an initial on a colored square. */
export function avatar(label: string, fill: string, size = 20): El {
  const t = theme();
  return div()
    .size(size)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(size >= 28 ? RADIUS.md : RADIUS.sm)
    .bg(fill)
    .text_size(size >= 28 ? TEXT.sm : 11)
    .font_semibold()
    .text_color(t.accent_foreground)
    .child(label.slice(0, 1).toUpperCase());
}

/** shadcn Separator. */
export function separator(vertical = false, length = 16): El {
  const t = theme();
  return vertical
    ? div().w(1).h(length).flex_none().bg(t.border)
    : div().h(1).w_full().flex_none().bg(t.border);
}

/** shadcn Skeleton: a placeholder block while loading. */
export function skeleton(w: number | null, h: number): El {
  const t = theme();
  const el = div().h(h).flex_none().rounded(RADIUS.md).bg(t.selected);
  return w === null ? el.w_full() : el.w(w);
}

// ---------------------------------------------------------------------------------------------
// Tabs, input

/** shadcn TabsList: a muted track holding `tabsTrigger`s. */
export function tabsList(children: El[]): El {
  const t = theme();
  return h_flex()
    .h(32)
    .p(3)
    .gap(2)
    .flex_none()
    .items_center()
    .rounded(RADIUS.lg)
    .bg(t.hover)
    .children(children);
}

export interface TabOptions {
  label: string;
  icon?: IconName;
  count?: number;
  active: boolean;
  tooltip?: string;
  onClick: (cx: Cx) => void;
}

/** shadcn TabsTrigger: muted text, the active one raised with foreground text. */
export function tabsTrigger(id: string, o: TabOptions): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h_full()
    .px(8)
    .gap(6)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(RADIUS.md)
    .border(1)
    .text_size(TEXT.sm)
    .font_medium()
    .cursor_pointer()
    .when(o.active, (el: El) =>
      el.bg(t.selected).border_color(t.input).text_color(t.foreground).shadow_sm(),
    )
    .when(!o.active, (el: El) =>
      el
        .border_color(TRANSPARENT)
        .text_color(t.muted)
        .hover((s: El) => s.text_color(t.foreground)),
    )
    .on_mouse_down("left", stopPress)
    .on_click((_e: unknown, cx: Cx) => o.onClick(cx))
    .when(Boolean(o.tooltip), (el: El) => el.tooltip(o.tooltip as string))
    .when(Boolean(o.icon), (el: El) => el.child(icon(o.icon as IconName, ICON.sm)))
    .child(o.label)
    .when(o.count !== undefined, (el: El) =>
      el.child(
        div()
          .font_family(MONO)
          .text_size(TEXT.xs)
          .text_color(o.active ? t.muted : t.dim)
          .child(String(o.count)),
      ),
    );
}

/** "This space | All spaces": shadcn Tabs over a few values. */
export function tabs<T extends string>(
  id: string,
  options: { value: T; label: string; icon?: IconName; count?: number }[],
  value: T,
  onChange: (value: T, cx: Cx) => void,
): El {
  return tabsList(
    options.map((o) =>
      tabsTrigger(`${id}-${o.value}`, {
        label: o.label,
        icon: o.icon,
        count: o.count,
        active: o.value === value,
        onClick: (cx) => onChange(o.value, cx),
      }),
    ),
  );
}

/** shadcn Input with a leading icon (search by default), around retained input state. */
export function searchBox(
  id: string,
  state: InputState,
  o: { height?: number; icon?: IconName } = {},
): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h(o.height ?? 32)
    .px(10)
    .gap(8)
    .flex_1()
    .min_w(0)
    .items_center()
    .rounded(RADIUS.md)
    .border(1)
    .border_color(t.input)
    .bg(t.hover)
    .shadow_xs()
    .cursor_text()
    .on_mouse_down("left", stopPress)
    .child(icon(o.icon ?? "search", ICON.md, t.muted))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(TEXT.sm).text_color(t.foreground));
}

// ---------------------------------------------------------------------------------------------
// Card, alert, empty

/** shadcn Card, dense: bordered surface, lg radius, p12 gap8. Add `.id()` before `.hover()`. */
export function card(): El {
  const t = theme();
  return v_flex()
    .p(12)
    .gap(8)
    .rounded(RADIUS.lg)
    .border(1)
    .border_color(t.border)
    .bg(t.surface)
    .shadow_xs();
}

/** shadcn Alert: a bordered note with an icon; destructive colors it. */
export function alert(
  body: string,
  o: { title?: string; variant?: "default" | "destructive"; icon?: IconName } = {},
): El {
  const t = theme();
  const bad = o.variant === "destructive";
  const color = bad ? t.blocked : t.foreground;
  return h_flex()
    .items_start()
    .gap(10)
    .px(12)
    .py(10)
    .rounded(RADIUS.lg)
    .border(1)
    .border_color(bad ? alpha(t.blocked, "59") : t.border)
    .bg(t.surface)
    .text_size(TEXT.sm)
    .child(
      div()
        .pt(2)
        .child(icon(o.icon ?? (bad ? "circle-alert" : "info"), ICON.md, color)),
    )
    .child(
      v_flex()
        .flex_1()
        .min_w(0)
        .gap(2)
        .when(Boolean(o.title), (el: El) =>
          el.child(
            div()
              .font_medium()
              .text_color(color)
              .child(o.title as string),
          ),
        )
        .child(
          div()
            .text_color(bad ? alpha(t.blocked, "e6") : t.muted)
            .child(body),
        ),
    );
}

/** shadcn Empty: a centered icon, title, description and actions. */
export function emptyState(
  title: string,
  body: string,
  actions: El[] = [],
  iconName?: IconName,
): El {
  const t = theme();
  return v_flex()
    .flex_1()
    .min_h(0)
    .items_center()
    .justify_center()
    .gap(8)
    .p(24)
    .when(Boolean(iconName), (el: El) =>
      el.child(
        div()
          .size(36)
          .mb(4)
          .flex()
          .items_center()
          .justify_center()
          .rounded(RADIUS.md)
          .bg(t.selected)
          .child(icon(iconName as IconName, ICON.md + 2, t.foreground)),
      ),
    )
    .child(div().text_size(TEXT.md).font_medium().text_color(t.foreground).child(title))
    .when(Boolean(body), (el: El) =>
      el.child(div().max_w(420).text_size(TEXT.sm).text_color(t.muted).text_center().child(body)),
    )
    .when(actions.length > 0, (el: El) => el.child(h_flex().pt(8).gap(8).children(actions)));
}

// ---------------------------------------------------------------------------------------------
// Sidebar

/** shadcn SidebarGroupLabel, foldable: xs medium muted label, count, chevron, actions. */
export function groupLabel(
  id: string,
  label: string,
  o: {
    count?: number | null;
    open?: boolean;
    onToggle?: (cx: Cx) => void;
    /** Label color (a priority group's tone); muted by default. */
    tone?: string;
    /** Before the label: a machine icon, a status dot. */
    leading?: El | null;
    trailing?: El[];
    height?: number;
  } = {},
): El {
  const t = theme();
  const foldable = Boolean(o.onToggle);
  return h_flex()
    .id(id)
    .h(o.height ?? 32)
    .flex_none()
    .px(8)
    .gap(4)
    .items_center()
    .text_size(TEXT.xs)
    .font_medium()
    .child(
      h_flex()
        .id(`${id}-fold`)
        .flex_1()
        .min_w(0)
        .h_full()
        .gap(6)
        .items_center()
        .text_color(o.tone ?? t.muted)
        .when(foldable, (el: El) =>
          el
            .cursor_pointer()
            .hover((s: El) => s.text_color(t.foreground))
            .on_click((_e: unknown, cx: Cx) => o.onToggle?.(cx)),
        )
        .when(Boolean(o.leading), (el: El) => el.child(o.leading as El))
        .child(div().min_w(0).truncate().child(label))
        .when(o.count !== undefined && o.count !== null, (el: El) =>
          el.child(div().font_family(MONO).text_color(t.dim).child(String(o.count))),
        )
        .when(foldable, (el: El) =>
          el.child(
            icon(o.open === false ? "chevron-right" : "chevron-down", ICON.sm, t.dim).ml_auto(),
          ),
        ),
    )
    .children(o.trailing ?? []);
}

/** shadcn SidebarMenuButton chrome: rounded row, hover, active (selected + medium). Add children. */
export function menuButton(
  id: string,
  o: { active?: boolean; size?: "default" | "sm" | "auto"; onClick?: (e: unknown, cx: Cx) => void },
): El {
  const t = theme();
  const size = o.size ?? "default";
  let el = h_flex()
    .id(id)
    .w_full()
    .min_w(0)
    .px(8)
    .gap(8)
    .items_center()
    .rounded(RADIUS.md)
    .text_size(size === "sm" ? TEXT.xs : TEXT.sm)
    .cursor_pointer();
  el = size === "auto" ? el.py(6) : el.h(size === "sm" ? 28 : 32);
  el = o.active
    ? el.bg(t.selected).font_medium().text_color(t.foreground)
    : el.text_color(t.foreground).hover((s: El) => s.bg(t.hover));
  if (o.onClick) el = el.on_click(o.onClick);
  return el;
}

/** shadcn SidebarMenuBadge: a small tabular count or tag at a row's right. */
export function menuBadge(text: string, color?: string, iconName?: IconName): El {
  const t = theme();
  return h_flex()
    .h(20)
    .min_w(20)
    .px(4)
    .gap(2)
    .flex_none()
    .items_center()
    .justify_center()
    .rounded(RADIUS.sm)
    .font_family(MONO)
    .text_size(TEXT.xs)
    .font_medium()
    .text_color(color ?? t.muted)
    .when(Boolean(iconName), (el: El) => el.child(icon(iconName as IconName, ICON.xs)))
    .child(text);
}

// ---------------------------------------------------------------------------------------------
// Status

/**
 * An agent status in a fixed 14px box: spinner (working), "Needs you" badge or alert icon
 * (blocked), filled dot (done), hollow dot (idle).
 */
export function statusMark(status: Status | string | null | undefined, compact = false): El {
  const t = theme();
  const box = () => div().size(ICON.sm).flex_none().flex().items_center().justify_center();
  if (status === "working") return box().child(spinner(ICON.sm, t.working));
  if (status === "blocked") {
    return compact
      ? box().child(icon("circle-alert", ICON.sm, t.blocked))
      : badge("Needs you", { variant: "destructive" });
  }
  if (status === "done") return box().child(dot(t.done, { size: 7 }));
  if (status === "idle") return box().child(dot(t.idle ?? t.dim, { size: 7, ring: true }));
  return box();
}

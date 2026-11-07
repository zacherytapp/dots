// Shared building blocks so every Mission Control mod looks the same. Colors always come
// from `theme()`, so the mods follow the layout's theme (gruvbox-material here).

import { div, image, svg, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex, Input, type InputState } from "gpui-base";
import { theme, type Program, type Status } from "herdr";
import { asset } from "./icons.ts";
import type { Source } from "./sources.ts";

export { asset };

export type Theme = Record<string, string>;

/** One of Herdr's shipped sidebar icons. */
export const chromeIcon = (name: string): string => `mods/workspace-chrome/${name}.svg`;
export const sourceIcon = (s: Source): string => (s.own ? asset(s.icon) : s.icon);

/** Keeps a press on a control from dragging the window or reaching the row under it. */
export const stopPress = (_e: unknown, cx: Cx): void => cx.stop_propagation();

/** `#rrggbb` plus an alpha byte, for tinted fills. */
export const alpha = (color: string | undefined, a: string): string =>
  color && /^#[0-9a-f]{6}$/i.test(color) ? `${color}${a}` : (color ?? "#00000000");

export function programIcon(p: Program | null | undefined, size: number, color: string): El | null {
  if (!p?.icon) return null;
  return p.tint
    ? svg(p.icon).size(size).flex_none().text_color(color)
    : image(p.icon).w(size).h(size).flex_none();
}

export function iconButton(
  id: string,
  icon: string,
  tooltip: string,
  onClick: (e: unknown, cx: Cx) => void,
  opts: { active?: boolean; size?: number; iconSize?: number } = {},
): El {
  const t = theme();
  const size = opts.size ?? 26;
  return div()
    .id(id)
    .size(size)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .rounded(6)
    .cursor_pointer()
    .text_color(opts.active ? t.foreground : t.dim)
    .when(Boolean(opts.active), (el: El) => el.bg(t.selected))
    .hover((s: El) => s.bg(t.hover).text_color(t.foreground))
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .tooltip(tooltip)
    .child(svg(icon).size(opts.iconSize ?? 15));
}

export function textButton(
  id: string,
  label: string,
  onClick: (e: unknown, cx: Cx) => void,
  opts: { primary?: boolean; icon?: string } = {},
): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h(28)
    .px(10)
    .gap(6)
    .flex_none()
    .items_center()
    .rounded(7)
    .text_size(12.5)
    .cursor_pointer()
    .when(Boolean(opts.primary), (el: El) => el.bg(t.solid).text_color(t.solid_foreground))
    .when(!opts.primary, (el: El) =>
      el
        .border(1)
        .border_color(t.border)
        .text_color(t.foreground)
        .hover((s: El) => s.bg(t.hover)),
    )
    .on_mouse_down("left", stopPress)
    .on_click(onClick)
    .when(Boolean(opts.icon), (el: El) => el.child(svg(opts.icon as string).size(13)))
    .child(label);
}

/** "This space | All spaces": a small segmented control. */
export function segmented<T extends string>(
  id: string,
  options: { value: T; label: string }[],
  value: T,
  onChange: (value: T, cx: Cx) => void,
): El {
  const t = theme();
  return h_flex()
    .flex_none()
    .gap(2)
    .p(2)
    .rounded(8)
    .bg(t.surface)
    .children(
      options.map((o) =>
        div()
          .id(`${id}-${o.value}`)
          .h(26)
          .px(10)
          .flex()
          .items_center()
          .rounded(6)
          .text_size(12.5)
          .cursor_pointer()
          .when(o.value === value, (el: El) => el.bg(t.selected).text_color(t.accent))
          .when(o.value !== value, (el: El) =>
            el.text_color(t.muted).hover((s: El) => s.text_color(t.foreground)),
          )
          .on_mouse_down("left", stopPress)
          .on_click((_e: unknown, cx: Cx) => onChange(o.value, cx))
          .child(o.label),
      ),
    );
}

/** A framed search field around retained input state (make the state in `init`). */
export function searchBox(id: string, state: InputState, opts: { height?: number } = {}): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h(opts.height ?? 30)
    .px(10)
    .gap(8)
    .flex_1()
    .min_w(0)
    .items_center()
    .rounded(8)
    .border(1)
    .border_color(t.border)
    .bg(t.background)
    .cursor_text()
    .on_mouse_down("left", stopPress)
    .child(svg(chromeIcon("search")).size(13).flex_none().text_color(t.dim))
    .child(Input.new(state).flex_1().min_w(0).h_full().text_size(12.5).text_color(t.foreground));
}

/** "All 3", "To do 1": a filter tab with its count. */
export function countChip(
  id: string,
  label: string,
  count: number,
  on: boolean,
  onClick: (cx: Cx) => void,
): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h(26)
    .px(9)
    .gap(6)
    .flex_none()
    .items_center()
    .rounded(6)
    .text_size(12.5)
    .cursor_pointer()
    .when(on, (el: El) => el.bg(t.selected).text_color(t.accent))
    .when(!on, (el: El) => el.text_color(t.muted).hover((s: El) => s.text_color(t.foreground)))
    .on_click((_e: unknown, cx: Cx) => onClick(cx))
    .child(label)
    .child(
      div()
        .text_size(11)
        .text_color(on ? t.accent : t.dim)
        .child(String(count)),
    );
}

/** An agent status: spinner (working), "Needs you" or ! (blocked), dot (done), ring (idle). */
export function statusMark(status: Status | string | null | undefined, compact = false): El {
  const t = theme();
  if (status === "working") {
    return svg(chromeIcon("spinner")).size(12).mx(1).flex_none().text_color(t.working).spin(900);
  }
  if (status === "blocked") {
    return compact
      ? div().size(7).mx(3).flex_none().rounded(4).bg(t.blocked)
      : div()
          .flex_none()
          .px(6)
          .h(18)
          .rounded(5)
          .bg(alpha(t.blocked, "26"))
          .text_size(10.5)
          .font_semibold()
          .text_color(t.blocked)
          .flex()
          .items_center()
          .child("Needs you");
  }
  if (status === "done") return div().size(7).mx(3).flex_none().rounded(4).bg(t.done);
  if (status === "idle")
    return div()
      .size(7)
      .mx(3)
      .flex_none()
      .rounded(4)
      .border(1.5)
      .border_color(t.idle ?? t.dim);
  return div().size(7).mx(3).flex_none();
}

/** A fold chevron with a label and a dim count: a sidebar section header. */
export function sectionHeader(
  id: string,
  label: string,
  count: number | null,
  open: boolean,
  onToggle: (cx: Cx) => void,
  trailing: El[] = [],
): El {
  const t = theme();
  return h_flex()
    .id(id)
    .h(34)
    .flex_none()
    .pl(10)
    .pr(8)
    .gap(6)
    .items_center()
    .text_size(12.5)
    .child(
      h_flex()
        .id(`${id}-fold`)
        .flex_1()
        .min_w(0)
        .h_full()
        .gap(7)
        .items_center()
        .cursor_pointer()
        .text_color(t.muted)
        .hover((s: El) => s.text_color(t.foreground))
        .on_click((_e: unknown, cx: Cx) => onToggle(cx))
        .child(
          svg(chromeIcon(open ? "chevron-down" : "chevron-right"))
            .size(12)
            .flex_none(),
        )
        .child(div().font_medium().text_color(t.foreground).child(label))
        .when(count !== null, (el: El) =>
          el.child(div().text_size(11.5).text_color(t.dim).child(String(count))),
        ),
    )
    .children(trailing);
}

/** A centered message with optional actions, for empty, loading and set-up states. */
export function emptyState(title: string, body: string, actions: El[] = []): El {
  const t = theme();
  return v_flex()
    .flex_1()
    .min_h(0)
    .items_center()
    .justify_center()
    .gap(8)
    .p(24)
    .child(div().text_size(13.5).font_medium().text_color(t.foreground).child(title))
    .when(Boolean(body), (el: El) =>
      el.child(div().max_w(420).text_size(12.5).text_color(t.muted).text_center().child(body)),
    )
    .when(actions.length > 0, (el: El) => el.child(h_flex().pt(6).gap(8).children(actions)));
}

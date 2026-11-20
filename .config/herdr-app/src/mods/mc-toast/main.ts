// Notifications (every notify(), Herdr's own included): the layout's root `"toast": "mc-toast"`
// shows them with this mod in place of Herdr's `toast`. As there, a click runs the notification's
// action (e.g. go to the agent) and closes it; the × closes it without running anything.

import { div, image, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, props, run, theme } from "herdr";
import { button, ICON, icon, MONO, TEXT, type IconName } from "../../shared/ui.ts";

interface ToastProps {
  title?: string;
  body?: string;
  level?: "info" | "success" | "warning" | "error";
  icon?: string;
  action?: { name: string; args?: Record<string, unknown> };
  overlay: string;
}

const LEVEL: Record<string, { icon: IconName; color: string }> = {
  error: { icon: "circle-x", color: "blocked" },
  warning: { icon: "triangle-alert", color: "working" },
  success: { icon: "circle-check", color: "done" },
  info: { icon: "info", color: "accent" },
};

/** herdr-core's "needs login" toast, which gets a copy button for its command. */
const LOGIN = /^([a-z0-9][a-z0-9_.-]{0,31}) needs login; run hc machine login \1$/;

export default class Toast extends View {
  declare copied: boolean;

  init(): void {
    this.copied = false;
  }

  render(): El {
    const t = theme();
    const p = (props() ?? {}) as ToastProps;
    const login = LOGIN.exec(p.body ?? "");
    const command = login ? `hc machine login ${login[1]}` : "";
    const level = LEVEL[p.level ?? "info"] ?? LEVEL.info;
    const close = () => closeOverlay(p.overlay);
    return h_flex()
      .id("toast")
      .size_full()
      .px(16)
      .gap(12)
      .items_center()
      .bg(t.popover)
      .cursor_pointer()
      .on_click(() => {
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        close();
      })
      .child(
        p.icon
          ? image(p.icon).w(ICON.md).h(ICON.md).flex_none()
          : icon(level.icon, ICON.md, t[level.color] ?? t.accent),
      )
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .overflow_hidden()
          .child(
            div()
              .truncate()
              .font_medium()
              .text_size(TEXT.sm)
              .text_color(t.foreground)
              .child(login ? `${login[1]} needs a login: run` : (p.title ?? "")),
          )
          .when(!login && Boolean(p.body), (el: El) =>
            el.child(
              div()
                .truncate()
                .text_size(TEXT.sm)
                .text_color(t.muted)
                .child(p.body ?? ""),
            ),
          )
          .when(Boolean(login), (el: El) =>
            el.child(
              h_flex()
                .gap(8)
                .items_center()
                .child(
                  div()
                    .flex_1()
                    .min_w(0)
                    .truncate()
                    .tooltip(command)
                    .font_family(MONO)
                    .text_size(TEXT.xs)
                    .text_color(t.muted)
                    .child(command),
                )
                .child(
                  button("toast-login-copy", {
                    label: this.copied ? "Copied" : "Copy",
                    variant: "outline",
                    size: "xs",
                    onClick: (_e: unknown, cx: Cx) => {
                      cx.stop_propagation();
                      cx.write_to_clipboard(command);
                      this.copied = true;
                      cx.notify();
                    },
                  }),
                ),
            ),
          ),
      )
      .child(
        button("toast-dismiss", {
          icon: "x",
          size: "icon-xs",
          tooltip: "Dismiss",
          onClick: (_e, cx) => {
            cx.stop_propagation();
            close();
          },
        }),
      );
  }
}

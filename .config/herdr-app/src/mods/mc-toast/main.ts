// Notifications (every notify(), Herdr's own included): the layout's root `"toast": "mc-toast"`
// shows them with this mod in place of Herdr's `toast`. As there, a click runs the notification's
// action (e.g. go to the agent) and closes it; the × closes it without running anything.

import { div, image, View, type Cx, type El } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { closeOverlay, props, run, theme } from "herdr";
import { asset, iconButton } from "../../shared/ui.ts";

interface ToastProps {
  title?: string;
  body?: string;
  level?: "info" | "success" | "warning" | "error";
  icon?: string;
  action?: { name: string; args?: Record<string, unknown> };
  overlay: string;
}

const DOT: Record<string, string> = {
  error: "blocked",
  warning: "working",
  success: "done",
  info: "accent",
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
    const close = () => closeOverlay(p.overlay);
    return h_flex()
      .id("toast")
      .size_full()
      .pl(18)
      .pr(8)
      .gap(12)
      .items_center()
      .bg(t.popover)
      .cursor_pointer()
      .hover((s: El) => s.bg(t.hover))
      .on_click(() => {
        if (p.action?.name) run(p.action.name, p.action.args ?? {});
        close();
      })
      .child(
        p.icon
          ? image(p.icon).w(18).h(18).flex_none()
          : div()
              .size(8)
              .rounded(4)
              .flex_none()
              .bg(t[DOT[p.level ?? "info"] ?? "accent"] ?? t.accent),
      )
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .overflow_hidden()
          .child(
            div()
              .truncate()
              .font_semibold()
              .text_size(13)
              .text_color(t.foreground)
              .child(login ? `${login[1]} needs a login: run` : (p.title ?? "")),
          )
          .when(!login && Boolean(p.body), (el: El) =>
            el.child(
              div()
                .truncate()
                .text_size(12)
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
                    .text_size(12)
                    .text_color(t.muted)
                    .child(command),
                )
                .child(
                  div()
                    .id("toast-login-copy")
                    .flex_none()
                    .px(6)
                    .py(3)
                    .rounded(4)
                    .bg(t.raised)
                    .text_size(12)
                    .text_color(t.foreground)
                    .cursor_pointer()
                    .hover((s: El) => s.bg(t.hover))
                    .on_click((_e: unknown, cx: Cx) => {
                      cx.stop_propagation();
                      cx.write_to_clipboard(command);
                      this.copied = true;
                      cx.notify();
                    })
                    .child(this.copied ? "Copied" : "Copy"),
                ),
            ),
          ),
      )
      .child(
        iconButton(
          "toast-dismiss",
          asset("close"),
          "Dismiss",
          (_e, cx) => {
            cx.stop_propagation();
            close();
          },
          { size: 24, iconSize: 13 },
        ),
      );
  }
}

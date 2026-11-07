// Generated from src/mods/tmux-status/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/tmux-status/main.ts
import { div, View } from "gpui-kit";
import { h_flex } from "gpui-base";
import { appHome, exec, home, panes, theme } from "herdr";
var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var pad = (n) => String(n).padStart(2, "0");
var clock = (d) =>
  `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
var TmuxStatus = class extends View {
  init(_props, cx) {
    this.stats = "";
    this.now = clock(/* @__PURE__ */ new Date());
    this.busy = false;
    this.refresh(cx);
    cx.timer.every(5e3, (cx2) => this.refresh(cx2));
  }
  refresh(cx) {
    const now = clock(/* @__PURE__ */ new Date());
    if (now !== this.now) {
      this.now = now;
      cx.notify();
    }
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async (cx2) => {
      try {
        const r = await exec(`${appHome()}/scripts/status.sh`, [], { cwd: home() });
        const stats = r.code === 0 ? r.stdout.trim() : "";
        if (stats !== this.stats) {
          this.stats = stats;
          cx2.notify();
        }
      } catch {
      } finally {
        this.busy = false;
      }
    });
  }
  render() {
    const t = theme();
    const zoomed = panes().some((p) => p.focused && p.zoomed);
    return h_flex()
      .size_full()
      .justify_end()
      .items_center()
      .gap(16)
      .pr(14)
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .font_family("JetBrainsMono Nerd Font")
      .text_size(12)
      .text_color(t.muted)
      .when(zoomed, (el) => el.child(div().flex_none().text_color(t.accent).child("󰁌 zoom")))
      .when(Boolean(this.stats), (el) => el.child(div().flex_none().child(this.stats)))
      .child(div().flex_none().text_color(t.foreground).child(this.now));
  }
};
export { TmuxStatus as default };

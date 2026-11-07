// The tmux status-right from ~/.config/tmux/tmux.conf, at the right of the top bar: zoom flag,
// cpu / temperature (°F) / battery (scripts/status.sh, every 5 s) and the clock ("%a %b %d %H:%M").

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex } from "gpui-base";
import { appHome, exec, home, panes, theme } from "herdr";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) =>
  `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default class TmuxStatus extends View {
  declare stats: string;
  declare now: string;
  declare busy: boolean;

  init(_props: unknown, cx: Cx): void {
    this.stats = "";
    this.now = clock(new Date());
    this.busy = false;
    this.refresh(cx);
    cx.timer.every(5000, (cx) => this.refresh(cx));
  }

  refresh(cx: Cx): void {
    const now = clock(new Date());
    if (now !== this.now) {
      this.now = now;
      cx.notify();
    }
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async (cx) => {
      try {
        const r = await exec(`${appHome()}/scripts/status.sh`, [], { cwd: home() });
        const stats = r.code === 0 ? r.stdout.trim() : "";
        if (stats !== this.stats) {
          this.stats = stats;
          cx.notify();
        }
      } catch {
        // keep the last reading
      } finally {
        this.busy = false;
      }
    });
  }

  render(): El {
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
      .when(zoomed, (el: El) => el.child(div().flex_none().text_color(t.accent).child("󰁌 zoom")))
      .when(Boolean(this.stats), (el: El) => el.child(div().flex_none().child(this.stats)))
      .child(div().flex_none().text_color(t.foreground).child(this.now));
  }
}

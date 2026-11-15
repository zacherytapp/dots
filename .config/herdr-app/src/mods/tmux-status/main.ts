// The tmux status-right from ~/.config/tmux/tmux.conf, at the right of the top bar: zoom flag,
// cpu / temperature (°F) / battery (read from /proc and /sys every 5 s) and the clock ("%a %b %d %H:%M").

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, readTextFile, theme } from "herdr";
import { CPU_CHIPS, cpuPercent, fahrenheit, format, parseCpu, type CpuSample } from "./stats.ts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) =>
  `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default class TmuxStatus extends View {
  declare stats: string;
  declare now: string;
  declare busy: boolean;
  declare cpu: CpuSample | null;
  /** The temperature file once found (a hwmon chip, else thermal_zone0); "" when there is none. */
  declare tempFile: string | undefined;
  declare batteryDir: string | undefined;

  init(_props: unknown, cx: Cx): void {
    this.stats = "";
    this.now = clock(new Date());
    this.busy = false;
    this.cpu = null;
    this.tempFile = undefined;
    this.batteryDir = undefined;
    this.refresh(cx);
    // The first CPU reading needs two samples: take the second soon, then poll gently.
    cx.timer.after(1500, (cx) => this.refresh(cx));
    cx.timer.every(5000, (cx) => this.refresh(cx));
  }

  async read(path: string): Promise<string | null> {
    try {
      return await readTextFile(path);
    } catch {
      return null;
    }
  }

  async findTempFile(): Promise<string> {
    const chips = await Promise.all(
      [0, 1, 2, 3, 4, 5, 6, 7].map(async (i) => ({
        i,
        name: ((await this.read(`/sys/class/hwmon/hwmon${i}/name`)) ?? "").trim(),
      })),
    );
    for (const want of CPU_CHIPS) {
      const hit = chips.find((c) => c.name === want);
      if (hit) return `/sys/class/hwmon/hwmon${hit.i}/temp1_input`;
    }
    return "/sys/class/thermal/thermal_zone0/temp";
  }

  async findBattery(): Promise<string> {
    for (const n of ["BAT0", "BAT1", "BAT2"]) {
      const dir = `/sys/class/power_supply/${n}`;
      if ((await this.read(`${dir}/capacity`)) !== null) return dir;
    }
    return "";
  }

  /** Reads /proc and /sys in one pass; no process is spawned. */
  async readStats(): Promise<string> {
    this.tempFile ??= await this.findTempFile();
    this.batteryDir ??= await this.findBattery();
    const [stat, temp, capacity, status] = await Promise.all([
      this.read("/proc/stat"),
      this.read(this.tempFile),
      this.batteryDir ? this.read(`${this.batteryDir}/capacity`) : null,
      this.batteryDir ? this.read(`${this.batteryDir}/status`) : null,
    ]);
    const sample = parseCpu(stat);
    const cpu = cpuPercent(this.cpu, sample);
    this.cpu = sample;
    const pct = (capacity ?? "").trim();
    return format(cpu, fahrenheit(temp), pct ? ` ${pct}%` : "");
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
        const stats = await this.readStats();
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

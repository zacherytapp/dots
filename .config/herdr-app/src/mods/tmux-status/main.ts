// The tmux status-right from ~/.config/tmux/tmux.conf, at the right of the top bar: zoom flag,
// cpu / temperature (°F) / battery (read from /proc and /sys every 5 s) and the clock ("%a %b %d %H:%M").

import { div, View, type Cx, type El } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, readTextFile, theme } from "herdr";
import { badge, ICON, icon, MONO, TEXT, type IconName } from "../../shared/ui.ts";
import {
  batteryIcon,
  CPU_CHIPS,
  cpuPercent,
  fahrenheit,
  parseCpu,
  readout,
  type CpuSample,
  type Stats,
} from "./stats.ts";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (d: Date) =>
  `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default class TmuxStatus extends View {
  declare stats: Stats | null;
  declare now: string;
  declare busy: boolean;
  declare cpu: CpuSample | null;
  /** The temperature file once found (a hwmon chip, else thermal_zone0); "" when there is none. */
  declare tempFile: string | undefined;
  declare batteryDir: string | undefined;

  init(_props: unknown, cx: Cx): void {
    this.stats = null;
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
  async readStats(): Promise<Stats> {
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
    return readout(cpu, fahrenheit(temp), capacity, status);
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
        if (JSON.stringify(stats) !== JSON.stringify(this.stats)) {
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

  /** A muted Lucide icon and a Geist Mono value. */
  item(name: IconName, value: string, color: string): El {
    const muted = theme().muted;
    return h_flex()
      .flex_none()
      .gap(6)
      .items_center()
      .child(icon(name, ICON.sm, muted))
      .child(div().font_family(MONO).text_color(color).child(value));
  }

  render(): El {
    const t = theme();
    const zoomed = panes().some((p) => p.focused && p.zoomed);
    const s = this.stats;
    return h_flex()
      .size_full()
      .justify_end()
      .items_center()
      .gap(16)
      .pr(12)
      .bg(t.chrome)
      .border_b(1)
      .border_color(t.border)
      .text_size(TEXT.xs)
      .text_color(t.muted)
      .when(zoomed, (el: El) => el.child(badge("zoom", { tone: t.accent, icon: "zoom-in" })))
      .when(Boolean(s), (el: El) => el.child(this.item("cpu", `${s?.cpu}%`, t.muted)))
      .when(s?.temp != null, (el: El) =>
        el.child(this.item("thermometer", `${s?.temp}°F`, t.muted)),
      )
      .when(s?.battery != null, (el: El) =>
        el.child(
          this.item(
            batteryIcon(s?.battery as number, Boolean(s?.charging)),
            `${s?.battery}%`,
            t.muted,
          ),
        ),
      )
      .child(this.item("clock", this.now, t.foreground));
  }
}

// Generated from src/mods/tmux-status/main.ts and its imports by `pnpm build:herdr`. Edit the sources, not this file.
// .config/herdr-app/src/mods/tmux-status/main.ts
import { div, View } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, readTextFile, theme } from "herdr";

// .config/herdr-app/src/mods/tmux-status/stats.ts
function parseCpu(stat) {
  const m = /^cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/m.exec(stat ?? "");
  if (!m) return null;
  const [u, n, s, i] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  return { idle: i, total: u + n + s + i };
}
function cpuPercent(prev, now) {
  if (!prev || !now) return null;
  const total = now.total - prev.total;
  if (total <= 0) return null;
  return Math.floor((100 * (total - (now.idle - prev.idle))) / total);
}
function fahrenheit(milli) {
  const c = Number((milli ?? "").trim()) / 1e3;
  if (!Number.isFinite(c) || c <= 0) return "";
  return `${Math.round((c * 9) / 5 + 32)}°F`;
}
var CPU_CHIPS = ["k10temp", "coretemp", "zenpower", "nvme"];
function format(cpu, temp, battery) {
  let out = ` ${cpu ?? 0}%`;
  if (temp) out += `  ${temp}`;
  if (battery) out += `  ${battery}`;
  return out;
}

// .config/herdr-app/src/mods/tmux-status/main.ts
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
    this.cpu = null;
    this.tempFile = void 0;
    this.batteryDir = void 0;
    this.refresh(cx);
    cx.timer.after(1500, (cx2) => this.refresh(cx2));
    cx.timer.every(5e3, (cx2) => this.refresh(cx2));
  }
  async read(path) {
    try {
      return await readTextFile(path);
    } catch {
      return null;
    }
  }
  async findTempFile() {
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
  async findBattery() {
    for (const n of ["BAT0", "BAT1", "BAT2"]) {
      const dir = `/sys/class/power_supply/${n}`;
      if ((await this.read(`${dir}/capacity`)) !== null) return dir;
    }
    return "";
  }
  /** Reads /proc and /sys in one pass; no process is spawned. */
  async readStats() {
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
        const stats = await this.readStats();
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

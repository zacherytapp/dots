// Pure helpers for the status readout: CPU load from two /proc/stat samples, °F from millidegrees
// and the readout line. The mod reads the files with readTextFile (no process per refresh).

export interface CpuSample {
  idle: number;
  total: number;
}

/** The aggregate "cpu" line of /proc/stat: user, nice, system and idle jiffies (as status.sh). */
export function parseCpu(stat: string | null): CpuSample | null {
  const m = /^cpu\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/m.exec(stat ?? "");
  if (!m) return null;
  const [u, n, s, i] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  return { idle: i, total: u + n + s + i };
}

/** Busy percentage between two samples; null when there is nothing to compare yet. */
export function cpuPercent(prev: CpuSample | null, now: CpuSample | null): number | null {
  if (!prev || !now) return null;
  const total = now.total - prev.total;
  if (total <= 0) return null;
  return Math.floor((100 * (total - (now.idle - prev.idle))) / total);
}

/** Whole °F from a sysfs millidegree-Celsius reading; null when there is none. */
export function fahrenheit(milli: string | null): number | null {
  const c = Number((milli ?? "").trim()) / 1000;
  if (!Number.isFinite(c) || c <= 0) return null;
  return Math.round((c * 9) / 5 + 32);
}

/** Hwmon chips whose temp1_input is the CPU package (same preference as status.sh's sensors). */
export const CPU_CHIPS = ["k10temp", "coretemp", "zenpower", "nvme"];

export interface Stats {
  cpu: number;
  /** °F, when a sensor was found. */
  temp: number | null;
  /** Percent, when there is a battery. */
  battery: number | null;
  charging: boolean;
}

/** The readout's parts: cpu defaults to 0 before the second sample; battery from sysfs text. */
export function readout(
  cpu: number | null,
  temp: number | null,
  capacity: string | null,
  status: string | null,
): Stats {
  const pct = Number((capacity ?? "").trim());
  const has = (capacity ?? "").trim() !== "" && Number.isFinite(pct);
  return {
    cpu: cpu ?? 0,
    temp,
    battery: has ? pct : null,
    charging: (status ?? "").trim() === "Charging",
  };
}

/** The Lucide battery icon for a charge level and status. */
export function batteryIcon(
  pct: number,
  charging: boolean,
): "battery-charging" | "battery-full" | "battery-medium" | "battery-low" | "battery-warning" {
  if (charging) return "battery-charging";
  if (pct >= 70) return "battery-full";
  if (pct >= 40) return "battery-medium";
  if (pct >= 15) return "battery-low";
  return "battery-warning";
}

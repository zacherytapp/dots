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

/** "74°F" from a sysfs millidegree-Celsius reading. */
export function fahrenheit(milli: string | null): string {
  const c = Number((milli ?? "").trim()) / 1000;
  if (!Number.isFinite(c) || c <= 0) return "";
  return `${Math.round((c * 9) / 5 + 32)}°F`;
}

/** Hwmon chips whose temp1_input is the CPU package (same preference as status.sh's sensors). */
export const CPU_CHIPS = ["k10temp", "coretemp", "zenpower", "nvme"];

/** The readout exactly as status.sh printed it: " 12%  74°F   80%". */
export function format(cpu: number | null, temp: string, battery: string): string {
  let out = ` ${cpu ?? 0}%`;
  if (temp) out += `  ${temp}`;
  if (battery) out += `  ${battery}`;
  return out;
}

// Console output and the setup log. Only step boundaries and messages go to the
// log file; command output stays on the terminal.

import { appendFileSync } from "node:fs";

const color = process.stdout.isTTY || process.env.FORCE_COLOR !== undefined;
const paint = (code: string) => (text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);

export const red = paint("0;31");
export const green = paint("0;32");
export const yellow = paint("1;33");
export const blue = paint("0;34");
export const bold = paint("1");

let logFile: string | null = null;

/** Start appending messages to `path`; unwritable paths just disable the log. */
export function openLog(path: string): void {
  try {
    appendFileSync(path, "");
    logFile = path;
  } catch {
    logFile = null;
  }
}

export function logPath(): string | null {
  return logFile;
}

export function record(message: string): void {
  if (!logFile) return;
  const stamp = new Date().toISOString().replace("T", " ").slice(0, 19);
  try {
    appendFileSync(logFile, `${stamp} - ${message}\n`);
  } catch {
    // a full or vanished disk must not fail the step that logged
  }
}

export function info(message: string): void {
  console.log(blue(message));
}

export function ok(message: string): void {
  console.log(green(message));
}

export function warn(message: string): void {
  console.log(yellow(message));
  record(`warning: ${message}`);
}

export function error(message: string): void {
  // stdout, so it stays in order with the step output when piped to a log
  console.log(red(message));
  record(`error: ${message}`);
}

/** Plain progress line, e.g. "pmd already installed". */
export function note(message: string): void {
  console.log(message);
}

// File helpers for root-owned system config. Each one only writes when the
// content differs, so a re-run leaves mtimes alone.

import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { note } from "./log.ts";

export function read(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

/** Write `content` to `path` (creating parent dirs) unless it already matches. Returns true if written. */
export function ensureFile(path: string, content: string, mode = 0o644): boolean {
  if (read(path) === content) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  chmodSync(path, mode);
  note(`wrote ${path}`);
  return true;
}

/** Copy a file from the checkout into place unless it already matches. */
export function installFile(src: string, dest: string, mode = 0o644): boolean {
  const content = read(src);
  if (content === null) throw new Error(`missing ${src}`);
  return ensureFile(dest, content, mode);
}

/** Rewrite the lines of `path` with `edit`; writes only when something changed. */
export function editLines(path: string, edit: (line: string) => string): boolean {
  const text = read(path);
  if (text === null) throw new Error(`missing ${path}`);
  const next = text
    .split("\n")
    .map((line) => edit(line))
    .join("\n");
  if (next === text) return false;
  writeFileSync(path, next);
  note(`updated ${path}`);
  return true;
}

export function exists(path: string): boolean {
  return existsSync(path);
}

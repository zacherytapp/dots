// The sessionizer picker's pure parts: what a row is, how a key edits the prompt or moves the
// highlight, and which space a folder opens as (the same name sessionizer-lib.sh gives it).

export type Row =
  | { kind: "dir"; path: string }
  | { kind: "machine"; machine: string }
  | { kind: "host"; host: string };

/** A line of `sessionizer.sh --list-machines` or `--list-dirs` as a row. */
export function parseRow(line: string): Row | null {
  const s = line.trim();
  if (!s) return null;
  if (s.startsWith("⇄ ")) return { kind: "machine", machine: s.slice(2).trim() };
  if (s.startsWith("+ ")) return { kind: "host", host: s.slice(2).trim() };
  return { kind: "dir", path: s };
}

/** What the row is matched and drawn as. */
export function rowText(row: Row): string {
  if (row.kind === "dir") return row.path;
  if (row.kind === "machine") return row.machine;
  return row.host;
}

/** The space a local folder opens as: its basename with dots as underscores, `dots_` inside the repo. */
export function spaceNameFor(path: string, home: string, dots = `${home}/Projects/dots`): string {
  const abs = path.replace(/^~(?=\/|$)/, home).replace(/\/+$/, "");
  const name = abs.slice(abs.lastIndexOf("/") + 1).replaceAll(".", "_");
  return abs.startsWith(`${dots}/`) ? `dots_${name}` : name;
}

export interface Key {
  key: string;
  keystroke: string;
  key_char?: string;
  modifiers?: { control?: boolean; alt?: boolean; platform?: boolean };
}

export type KeyAction =
  | { type: "move"; by: number }
  | { type: "edit"; query: string }
  | { type: "submit" }
  | { type: "back" }
  | { type: "close" }
  | null;

const MOVES: Record<string, number> = {
  down: 1,
  "ctrl-n": 1,
  "ctrl-j": 1,
  tab: 1,
  up: -1,
  "ctrl-p": -1,
  "ctrl-k": -1,
  "shift-tab": -1,
  pagedown: 10,
  pageup: -10,
};

/** What a key press does in the picker, fzf-style. `back` only on backspace with an empty prompt. */
export function keyAction(query: string, k: Key): KeyAction {
  const stroke = k.keystroke;
  if (stroke in MOVES) return { type: "move", by: MOVES[stroke] };
  if (stroke === "enter" || stroke === "ctrl-m") return { type: "submit" };
  if (stroke === "escape" || stroke === "ctrl-c" || stroke === "ctrl-g") return { type: "close" };
  if (stroke === "backspace" || stroke === "ctrl-h") {
    return query ? { type: "edit", query: query.slice(0, -1) } : { type: "back" };
  }
  if (stroke === "ctrl-backspace" || stroke === "ctrl-w" || stroke === "alt-backspace") {
    return { type: "edit", query: query.replace(/[^\s/._-]*[\s/._-]*$/, "") };
  }
  if (stroke === "ctrl-u") return { type: "edit", query: "" };
  const m = k.modifiers ?? {};
  if (k.key_char && !m.control && !m.alt && !m.platform && k.key_char >= " ") {
    return { type: "edit", query: query + k.key_char };
  }
  return null;
}

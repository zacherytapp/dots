/**
 * Credential patterns vendored from dwarvesf/claude-guardrails
 * (https://github.com/dwarvesf/claude-guardrails, patterns/ at 590bc5d):
 *
 *  - patterns/secrets.json: `{ n: name, r: regex }` entries, written for
 *    Oniguruma (jq). Only a leading `(?i)` needs translating for JS.
 *  - patterns/bip39-english.txt: the 2048-word BIP-39 English wordlist, used
 *    for set-membership mnemonic detection, which a regex can't do.
 *
 * Both files are kept byte-identical to upstream (Prettier ignores them), so
 * updating is a copy of the two files. They are loaded at runtime from
 * ../patterns, which stow links into ~/.claude/hooks/patterns.
 *
 * Loading never throws: a missing or broken file yields no patterns and
 * `loadError()` reports why, which hook-doctor surfaces at session start.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRecord } from "./hook-io.ts";

export const PATTERNS_DIR = join(import.meta.dirname, "..", "patterns");

export interface GuardrailsPattern {
  /** Stable id derived from the name, e.g. `guardrails.aws-access-key-id`. */
  id: string;
  /** Upstream `n` without its trailing parenthetical, e.g. "GitHub token". */
  label: string;
  /** Upstream `n`, a human-readable label. */
  name: string;
  /** Upstream `r`, untranslated. */
  source: string;
  /** Global JS RegExp equivalent of `source`. */
  re: RegExp;
}

/** Translate an Oniguruma pattern to a global JS RegExp (leading inline flags only). */
export function toJsRegExp(source: string): RegExp {
  let flags = "g";
  let body = source;
  const inline = /^\(\?([a-z]+)\)/.exec(body);
  if (inline) {
    for (const flag of inline[1]!) {
      if (!"ims".includes(flag)) throw new Error(`unsupported inline flag (?${flag})`);
      if (!flags.includes(flag)) flags += flag;
    }
    body = body.slice(inline[0].length);
  }
  return new RegExp(body, flags);
}

/** Parse a secrets.json document. Throws on anything malformed. */
export function parseSecretPatterns(json: string): GuardrailsPattern[] {
  const data: unknown = JSON.parse(json);
  if (!Array.isArray(data)) throw new Error("secrets.json is not an array");
  return data.map((entry, i) => {
    if (!isRecord(entry) || typeof entry.n !== "string" || typeof entry.r !== "string")
      throw new Error(`secrets.json entry ${i} needs string "n" and "r" fields`);
    const label = entry.n.replace(/\s*\(.*\)\s*$/, "");
    const slug = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return {
      id: `guardrails.${slug}`,
      label,
      name: entry.n,
      source: entry.r,
      re: toJsRegExp(entry.r),
    };
  });
}

/** Parse a BIP-39 wordlist: one lowercase word per line. */
export function parseWordlist(text: string): Set<string> {
  const words = text
    .split("\n")
    .map((w) => w.trim())
    .filter((w) => /^[a-z]{3,8}$/.test(w));
  if (words.length !== 2048) throw new Error(`BIP-39 wordlist has ${words.length} words, not 2048`);
  return new Set(words);
}

const errors: string[] = [];

function load<T>(file: string, parse: (text: string) => T, empty: T): T {
  try {
    return parse(readFileSync(join(PATTERNS_DIR, file), "utf8"));
  } catch (err) {
    errors.push(`${join(PATTERNS_DIR, file)}: ${err instanceof Error ? err.message : String(err)}`);
    return empty;
  }
}

export const SECRET_PATTERNS: GuardrailsPattern[] = load("secrets.json", parseSecretPatterns, []);
export const BIP39_WORDS: Set<string> = load("bip39-english.txt", parseWordlist, new Set());

/** Why the vendored patterns failed to load, or null if both loaded. */
export function loadError(): string | null {
  return errors.length ? errors.join("; ") : null;
}

/**
 * Runs of 12+ candidate tokens (3-8 lowercase letters) separated only by
 * whitespace, as in upstream's v0.3.7 hotfix: prose is broken up by
 * punctuation, contractions, digits and short words, so counting wordlist hits
 * across a sentence is not enough.
 */
const MNEMONIC_RUN = /(?:\b[a-z]{3,8}\b\s+){11,}\b[a-z]{3,8}\b/g;
const MNEMONIC_MIN = 12;

/**
 * First 12+ consecutive BIP-39 words inside one whitespace-only run, or null.
 * Upstream requires the whole run to be wordlist words, which misses a phrase
 * led by ordinary words ("restore from abandon ability …"); this checks for a
 * 12-word window instead.
 */
export function findMnemonic(text: string, words: Set<string> = BIP39_WORDS): string | null {
  if (words.size === 0) return null;
  for (const [run] of text.toLowerCase().matchAll(MNEMONIC_RUN)) {
    let streak: string[] = [];
    // Trailing sentinel flushes a streak that runs to the end of the run.
    for (const token of [...run.split(/\s+/), ""]) {
      if (words.has(token)) streak.push(token);
      else if (streak.length >= MNEMONIC_MIN) return streak.join(" ");
      else streak = [];
    }
  }
  return null;
}

// Token usage from a Claude Code session line. Pure, so tests feed it real lines.

export interface Usage {
  /** Tokens the last request sent: input + cache writes + cache reads. */
  tokens: number;
  model: string | null;
  /** The reasoning effort that turn ran at ("high", "xhigh"...), when Claude Code recorded one. */
  effort: string | null;
}

/** The context in use after the last assistant turn, from its JSONL line. */
export function parseUsage(line: string): Usage | null {
  const text = line.trim();
  if (!text) return null;
  try {
    const row = JSON.parse(text) as {
      type?: string;
      effort?: unknown;
      message?: {
        model?: string;
        usage?: {
          input_tokens?: number;
          cache_creation_input_tokens?: number;
          cache_read_input_tokens?: number;
        };
      };
    };
    const u = row.message?.usage;
    if (row.type !== "assistant" || !u) return null;
    const tokens =
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0);
    const effort = typeof row.effort === "string" && row.effort ? row.effort : null;
    return tokens > 0 ? { tokens, model: row.message?.model ?? null, effort } : null;
  } catch {
    // A line cut short: read the numbers out of it.
    const num = (k: string) => Number(new RegExp(`"${k}":(\\d+)`).exec(text)?.[1] ?? 0);
    const tokens =
      num("input_tokens") + num("cache_creation_input_tokens") + num("cache_read_input_tokens");
    const model = /"model":"([^"]+)"/.exec(text)?.[1] ?? null;
    // The line's own field comes after its message, so the last match is it.
    const efforts = [...text.matchAll(/"effort":"([a-z]+)"/g)];
    const effort = efforts.at(-1)?.[1] ?? null;
    return tokens > 0 ? { tokens, model, effort } : null;
  }
}

/** "claude-opus-5-5" → "opus 5.5". */
export function shortModel(model: string | null): string {
  if (!model) return "";
  const m = /claude-([a-z]+)-(\d+)(?:-(\d+))?/.exec(model);
  return m ? `${m[1]} ${m[2]}${m[3] && m[3].length <= 2 ? `.${m[3]}` : ""}` : model;
}

/** Splits `\x1e<dir>\n<line>` blocks from the reader's output. */
export function splitBlocks(stdout: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const block of stdout.split("\x1e").slice(1)) {
    const nl = block.indexOf("\n");
    if (nl < 0) continue;
    out.set(block.slice(0, nl), block.slice(nl + 1));
  }
  return out;
}

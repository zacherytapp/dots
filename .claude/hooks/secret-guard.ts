#!/usr/bin/env node
/**
 * UserPromptSubmit hook that blocks prompts containing live credentials.
 *
 * A TypeScript port of dwarvesf/claude-guardrails (scan-secrets.sh). Rules:
 *
 *  - Local vendor token formats (below), checked first.
 *  - Every upstream regex from patterns/secrets.json and, for prompts only, the
 *    BIP-39 wordlist run check (see lib/guardrails-patterns.ts). An upstream
 *    match that overlaps a local finding is not reported twice.
 *  - Upstream's 64-hex, Bitcoin WIF, generic assignment and Google key rules
 *    are "heuristic": they still block prompts, but bash-guard asks rather
 *    than denies on commit. A 64-hex value labeled as a digest (`sha256:`,
 *    `checksum = "`, `"integrity": "`) is skipped, generalizing upstream's
 *    Cargo.lock exemption.
 *  - Known documentation keys (`...EXAMPLE`) and sops `ENC[...]` values pass.
 *  - Matches are redacted in the message so the block notice does not repeat
 *    the secret.
 *
 * A blocked prompt never reaches the model, but Claude Code still records it in
 * the session transcript on disk, so a real leak still needs rotating.
 *
 * `findSecrets` is shared with bash-guard.ts, which scans staged diffs on
 * `git commit`. Any internal error allows the prompt: this hook fails open.
 *
 * Runs on Node's built-in TypeScript type stripping (erasable syntax only).
 */

import { findMnemonic, SECRET_PATTERNS } from "./lib/guardrails-patterns.ts";
import type { GuardrailsPattern } from "./lib/guardrails-patterns.ts";
import { isRecord, readStdin } from "./lib/hook-io.ts";

export type Confidence = "high" | "heuristic";

interface SecretRule {
  id: string;
  name: string;
  confidence: Confidence;
  re: RegExp;
  /** Also scan staged commits (false for keys that are routinely public, e.g. Firebase web keys). */
  commit: boolean;
  /** Capture group holding the secret value (default: the whole match). */
  group?: number;
  /** Skip a match given the text and its offset (e.g. a labeled digest). */
  exempt?: (text: string, start: number) => boolean;
}

export interface SecretFinding {
  id: string;
  name: string;
  confidence: Confidence;
  redacted: string;
}

const LOCAL_RULES: SecretRule[] = [
  {
    id: "aws-access-key",
    name: "AWS access key ID",
    confidence: "high",
    commit: true,
    re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "github-token",
    name: "GitHub token",
    confidence: "high",
    commit: true,
    re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
  },
  {
    id: "github-pat",
    name: "GitHub fine-grained token",
    confidence: "high",
    commit: true,
    re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g,
  },
  {
    id: "gitlab-token",
    name: "GitLab token",
    confidence: "high",
    commit: true,
    re: /\bglpat-[A-Za-z0-9_-]{20,}/g,
  },
  {
    id: "anthropic-key",
    name: "Anthropic API key",
    confidence: "high",
    commit: true,
    re: /\bsk-ant-[A-Za-z0-9_-]{40,}/g,
  },
  {
    id: "openai-key",
    name: "OpenAI API key",
    confidence: "high",
    commit: true,
    re: /\bsk-(?!ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{40,}/g,
  },
  {
    id: "google-api-key",
    name: "Google API key",
    confidence: "high",
    commit: false,
    re: /\bAIza[0-9A-Za-z_-]{35}(?![0-9A-Za-z_-])/g,
  },
  {
    id: "slack-token",
    name: "Slack token",
    confidence: "high",
    commit: true,
    re: /\bxox[abposr]-[A-Za-z0-9-]{10,}/g,
  },
  {
    id: "slack-webhook",
    name: "Slack webhook URL",
    confidence: "high",
    commit: true,
    re: /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]{20,}/g,
  },
  {
    id: "stripe-key",
    name: "Stripe live secret key",
    confidence: "high",
    commit: true,
    re: /\b(?:sk|rk)_live_[A-Za-z0-9]{24,}\b/g,
  },
  {
    id: "npm-token",
    name: "npm token",
    confidence: "high",
    commit: true,
    re: /\bnpm_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "huggingface-token",
    name: "Hugging Face token",
    confidence: "high",
    commit: true,
    re: /\bhf_[A-Za-z]{34}\b/g,
  },
  {
    id: "digitalocean-token",
    name: "DigitalOcean token",
    confidence: "high",
    commit: true,
    re: /\bdo[por]_v1_[a-f0-9]{64}\b/g,
  },
  {
    id: "sendgrid-key",
    name: "SendGrid API key",
    confidence: "high",
    commit: true,
    re: /\bSG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}\b/g,
  },
  {
    id: "1password-token",
    name: "1Password service account token",
    confidence: "high",
    commit: true,
    re: /\bops_eyJ[A-Za-z0-9+/=_-]{40,}/g,
  },
  {
    id: "age-secret-key",
    name: "age secret key",
    confidence: "high",
    commit: true,
    re: /\bAGE-SECRET-KEY-1[0-9A-Z]{58}\b/g,
  },
  {
    id: "pem-private-key",
    name: "PEM private key block",
    confidence: "high",
    commit: true,
    re: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/g,
  },
  {
    id: "bip32-xprv",
    name: "BIP-32 extended private key",
    confidence: "high",
    commit: true,
    re: /\b[xyztuv]prv[1-9A-HJ-NP-Za-km-z]{107,108}\b/g,
  },
  {
    id: "quoted-assignment",
    name: "Secret-like value assigned to a key/token/password field",
    confidence: "heuristic",
    commit: true,
    group: 1,
    re: /\b(?:api[_-]?key|api[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret[_-]?key|private[_-]?key|password|passwd)["']?\s*[:=]\s*["'`]([^"'`\s]{16,})["'`]/gi,
  },
  {
    id: "env-assignment",
    name: "Secret-like environment variable",
    confidence: "heuristic",
    commit: true,
    group: 1,
    re: /^[ \t]*(?:export[ \t]+)?[A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD|PASSWD)[A-Z0-9_]*=["']?([^"'\s#]{16,})/gm,
  },
];

/** Upstream rules that commonly match non-secrets; bash-guard asks instead of denying. */
const HEURISTIC_GUARDRAILS = new Set([
  "guardrails.hex-private-key",
  "guardrails.bitcoin-wif-private-key",
  "guardrails.secret-like-variable-assignment",
  "guardrails.google-api-key",
]);

/** A 64-hex value introduced as a digest, e.g. `sha256:…`, `checksum = "…"`, `"integrity": "…"`. */
const DIGEST_LABEL = /(?:sha-?(?:256|3-256|512)|checksum|digest|integrity|hash)\W{0,4}(?:0x)?$/i;

const isLabeledDigest = (text: string, start: number) =>
  DIGEST_LABEL.test(text.slice(Math.max(0, start - 24), start));

function guardrailsRule(pattern: GuardrailsPattern): SecretRule {
  return {
    id: pattern.id,
    name: pattern.label,
    confidence: HEURISTIC_GUARDRAILS.has(pattern.id) ? "heuristic" : "high",
    commit: true,
    re: pattern.re,
    exempt: pattern.id === "guardrails.hex-private-key" ? isLabeledDigest : undefined,
  };
}

/**
 * High-confidence rules first, so a generic assignment rule never claims a
 * value that a vendor format would report (and bash-guard would deny). Within
 * a tier, local rules come first, so a local id wins over an upstream one.
 */
export const SECRET_RULES: SecretRule[] = [
  ...LOCAL_RULES,
  ...SECRET_PATTERNS.map(guardrailsRule),
].sort((a, b) => Number(a.confidence !== "high") - Number(b.confidence !== "high"));

/** Values that are clearly references or placeholders, not real secrets. */
const PLACEHOLDER =
  /example|your|placeholder|changeme|change_me|dummy|sample|redacted|xxxx|\*\*\*|\.\.\.|<[^>]*>|\$\{|\$\(|^\$|^ENC\[|process\.env|os\.environ|getenv|secrets\.|vault:|op:\/\//i;

function redact(value: string): string {
  return value.length <= 8 ? "[redacted]" : `${value.slice(0, 4)}...(${value.length} chars)`;
}

/**
 * Credentials in `text`, one finding per rule. A match overlapping one already
 * claimed by an earlier rule is skipped, so a key is reported once.
 * BIP-39 mnemonics are checked for prompts only: in commits they mostly match
 * docs, fixtures and the wordlist itself (upstream makes the same call).
 */
export function findSecrets(text: string, scope: "prompt" | "commit" = "prompt"): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const claimed: [number, number][] = [];
  for (const rule of SECRET_RULES) {
    if (scope === "commit" && !rule.commit) continue;
    const spans: [number, number][] = [];
    for (const match of text.matchAll(rule.re)) {
      const value = (rule.group && match[rule.group]) || match[0];
      if (PLACEHOLDER.test(value) || /^(.)\1+$/.test(value)) continue;
      const start = match.index;
      const end = start + match[0].length;
      if (claimed.some(([s, e]) => start < e && s < end)) continue;
      if (rule.exempt?.(text, start)) continue;
      if (spans.length === 0)
        findings.push({
          id: rule.id,
          name: rule.name,
          confidence: rule.confidence,
          redacted: redact(value),
        });
      spans.push([start, end]);
    }
    claimed.push(...spans);
  }
  if (scope === "prompt") {
    const mnemonic = findMnemonic(text);
    if (mnemonic)
      findings.push({
        id: "guardrails.bip39-mnemonic",
        name: "BIP-39 seed phrase (12+ consecutive wordlist words)",
        confidence: "high",
        redacted: `${mnemonic.split(/\s+/).length} words`,
      });
  }
  return findings;
}

export function formatFindings(findings: SecretFinding[]): string {
  return findings.map((f) => `  - ${f.name} (${f.redacted})`).join("\n");
}

/** Hook output for a UserPromptSubmit event, or null to let the prompt through. */
export function evaluatePrompt(event: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof event.prompt !== "string") return null;
  const findings = findSecrets(event.prompt);
  if (findings.length === 0) return null;
  return {
    decision: "block",
    reason: [
      "secret-guard: prompt blocked, it looks like it contains a credential:",
      formatFindings(findings),
      "It was not sent to Claude, but Claude Code still saved it to the session transcript on disk.",
      "If it is real, rotate it now. If it is a false positive, rephrase or mask the value and resend.",
    ].join("\n"),
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", suppressOriginalPrompt: true },
  };
}

async function main(): Promise<void> {
  try {
    const event: unknown = JSON.parse(await readStdin());
    if (!isRecord(event)) return;
    const output = evaluatePrompt(event);
    if (output) process.stdout.write(JSON.stringify(output));
  } catch {
    // fail open
  }
}

if (import.meta.main) await main();

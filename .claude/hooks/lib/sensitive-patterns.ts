/**
 * Regex detectors for sensitive data: credentials, Salesforce tokens and
 * regulated PII. Shared by sensitive-data-guard (prompts, tool inputs, tool
 * output, final responses).
 *
 * "high" findings are values that are dangerous on their own (a live key, a
 * Luhn-valid card number, an SSN). "medium" findings need a human eye
 * (generic `password = "..."` assignments, bulk email/phone dumps, labeled
 * dates of birth).
 *
 * Structured numbers are validated (Luhn, IBAN mod-97, SSN ranges) and
 * obvious placeholders are dropped to keep false positives down.
 */

import { SECRET_PATTERNS } from "./guardrails-patterns.ts";

export type Severity = "high" | "medium";

export interface Finding {
  id: string;
  label: string;
  severity: Severity;
  /** Masked excerpt, safe to show back to Claude or the user. */
  masked: string;
  /** 1-based line of the first occurrence. */
  line: number;
  /** Character offsets of the sensitive value inside the scanned text. */
  start: number;
  end: number;
}

interface Detector {
  id: string;
  label: string;
  severity: Severity;
  re: RegExp;
  /** Capture group holding the secret value (default: whole match). */
  group?: number;
  validate?: (value: string, match: RegExpExecArray) => boolean;
}

const PLACEHOLDER =
  /^(?:x+|\*+|\.+|-+|_+|0+|1234.*|changeme|change_me|password|passw(?:or)?d|secret|example|sample|dummy|test|fake|redacted|placeholder|your[_-]?\w*|<[^>]*>|\{\{.*\}\}|\$\{.*\}|\$\w+|%\w+%|null|none|undefined|true|false)$/i;

function notPlaceholder(value: string): boolean {
  const v = value.trim().replace(/^["']|["']$/g, "");
  if (PLACEHOLDER.test(v)) return false;
  if (/^(?:process\.env|os\.environ|env\.|import\.meta\.env|System\.getenv)/.test(v)) return false;
  if (/(?:xxxx|\*\*\*\*|<|>|\$\{|\{\{|your_|_here\b|example|redacted)/i.test(v)) return false;
  return new Set(v).size >= 4;
}

/** Mixed character classes, so ordinary words and identifiers don't count. */
function looksRandom(value: string): boolean {
  if (!notPlaceholder(value)) return false;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(value)).length;
  return classes >= 3 || (classes >= 2 && value.length >= 20);
}

export function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Published processor test numbers; seeing these in code is expected. */
const TEST_CARDS = new Set([
  "4111111111111111",
  "4242424242424242",
  "4012888888881881",
  "4000056655665556",
  "4000000000000002",
  "4000000000000077",
  "5555555555554444",
  "5105105105105100",
  "5200828282828210",
  "2223003122003222",
  "378282246310005",
  "371449635398431",
  "6011111111111117",
  "6011000990139424",
  "3056930009020004",
  "36227206271667",
  "3566002020360505",
]);

function isCard(raw: string): boolean {
  const d = raw.replace(/[ -]/g, "");
  if (d.length < 13 || d.length > 19 || TEST_CARDS.has(d) || /^(\d)\1+$/.test(d)) return false;
  const brand =
    (/^4/.test(d) && [13, 16, 19].includes(d.length)) ||
    (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]|720))/.test(d) && d.length === 16) ||
    (/^3[47]/.test(d) && d.length === 15) ||
    (/^(6011|65|64[4-9])/.test(d) && d.length >= 16) ||
    (/^35(2[89]|[3-8]\d)/.test(d) && d.length >= 16) ||
    (/^3(0[0-5]|[689])/.test(d) && d.length === 14);
  // Separators must be consistent (all spaces, all dashes, or none).
  const seps = new Set(raw.replace(/\d/g, ""));
  return brand && seps.size <= 1 && luhn(d);
}

const IBAN_LENGTHS: Record<string, number> = {
  AD: 24,
  AE: 23,
  AT: 20,
  BE: 16,
  BG: 22,
  BH: 22,
  BR: 29,
  CH: 21,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  EE: 20,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  GI: 23,
  GR: 27,
  HR: 21,
  HU: 28,
  IE: 22,
  IL: 23,
  IS: 26,
  IT: 27,
  KW: 30,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MT: 31,
  NL: 18,
  NO: 15,
  PK: 24,
  PL: 28,
  PT: 25,
  QA: 29,
  RO: 24,
  SA: 24,
  SE: 24,
  SI: 19,
  SK: 24,
  SM: 27,
  TR: 26,
  UA: 29,
};

export function isIban(raw: string): boolean {
  const s = raw.replace(/ /g, "");
  if (IBAN_LENGTHS[s.slice(0, 2)] !== s.length) return false;
  const moved = s.slice(4) + s.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    const v = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const c of v) rem = (rem * 10 + (c.charCodeAt(0) - 48)) % 97;
  }
  return rem === 1;
}

/**
 * Upstream rules left out here because this guard also redacts tool output:
 * bare 64-hex matches every SHA-256 digest (sha256sum, image digests, git
 * object ids in SHA-256 repos) and Base58 WIF matches many IDs. secret-guard
 * and bash-guard still apply both to prompts and commits, as upstream does.
 */
const GUARDRAILS_TOOL_OUTPUT_SKIP = new Set([
  "guardrails.hex-private-key",
  "guardrails.bitcoin-wif-private-key",
]);

/**
 * Detector table. Patterns are assembled from fragments where a literal
 * token prefix would otherwise trip secret scanners on this file.
 */
export const DETECTORS: Detector[] = [
  // --- Credentials and keys ---
  {
    id: "secret.private-key",
    label: "Private key block",
    severity: "high",
    re: new RegExp(
      "-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED |PGP )?PRIVATE KEY(?: BLOCK)?-----",
      "g",
    ),
  },
  {
    id: "secret.aws-access-key",
    label: "AWS access key ID",
    severity: "high",
    re: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g,
  },
  {
    id: "secret.aws-secret-key",
    label: "AWS secret access key",
    severity: "high",
    re: /\baws_?secret_?access_?key\b["']?\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})\b/gi,
    group: 1,
  },
  {
    id: "secret.github-token",
    label: "GitHub token",
    severity: "high",
    re: /\b(?:gh[pousr]_[A-Za-z0-9]{36,255}|github_pat_[A-Za-z0-9_]{60,255})\b/g,
  },
  {
    id: "secret.gitlab-token",
    label: "GitLab token",
    severity: "high",
    re: /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    id: "secret.slack-token",
    label: "Slack token or webhook",
    severity: "high",
    re: /\bxox[abposr]-[A-Za-z0-9-]{10,}|https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/g,
  },
  {
    id: "secret.stripe-key",
    label: "Stripe live key",
    severity: "high",
    re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{20,}\b/g,
  },
  {
    id: "secret.google-api-key",
    label: "Google API key",
    severity: "high",
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    id: "secret.anthropic-key",
    label: "Anthropic API key",
    severity: "high",
    re: new RegExp("\\bsk-" + "ant-[a-z]{3,6}\\d{2}-[A-Za-z0-9_-]{60,}", "g"),
  },
  {
    id: "secret.openai-key",
    label: "OpenAI API key",
    severity: "high",
    re: new RegExp(
      "\\bsk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}T3Blbk" + "FJ[A-Za-z0-9_-]{20,}",
      "g",
    ),
  },
  {
    id: "secret.npm-token",
    label: "npm access token",
    severity: "high",
    re: /\bnpm_[A-Za-z0-9]{36}\b/g,
  },
  {
    id: "secret.jwt",
    label: "JSON Web Token",
    severity: "high",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  },
  {
    id: "secret.bearer-header",
    label: "Authorization header credential",
    severity: "high",
    re: /\bAuthorization["']?\s*[:=]\s*["']?(?:Bearer|Basic|token|OAuth)\s+([A-Za-z0-9._~+/=-]{20,})/gi,
    group: 1,
    validate: notPlaceholder,
  },
  {
    id: "secret.url-password",
    label: "Password embedded in URL",
    severity: "high",
    re: /\b(?!force:)[a-z][a-z0-9+.-]{1,20}:\/\/[^/\s:@'"]+:([^/\s:@'"]{3,})@[A-Za-z0-9.-]+/gi,
    group: 1,
    validate: notPlaceholder,
  },
  // --- Salesforce ---
  {
    id: "salesforce.access-token",
    label: "Salesforce session ID / access token",
    severity: "high",
    re: /\b00D[A-Za-z0-9]{12,15}![A-Za-z0-9._]{60,}/g,
  },
  {
    id: "salesforce.refresh-token",
    label: "Salesforce refresh token",
    severity: "high",
    re: /\b5Aep8[A-Za-z0-9._]{70,}/g,
  },
  {
    id: "salesforce.auth-url",
    label: "SFDX auth URL (refresh token)",
    severity: "high",
    re: /\bforce:\/\/[A-Za-z0-9._-]+:[^:@\s'"]*:([A-Za-z0-9._%-]{20,})@[A-Za-z0-9.-]+/g,
    group: 1,
  },
  {
    id: "secret.client-secret",
    label: "OAuth client / consumer secret",
    severity: "high",
    re: /\b(?:consumer|client)[_ -]?secret\b["']?\s*[:=]\s*["']?([A-Za-z0-9._~-]{16,})/gi,
    group: 1,
    validate: looksRandom,
  },
  // --- Generic credential assignments (lower confidence) ---
  {
    id: "secret.assignment",
    label: "Hard-coded credential assignment",
    severity: "medium",
    re: /\b(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|private[_-]?key)\b["']?\s*[:=]\s*["']([^"'\s]{8,})["']/gi,
    group: 1,
    validate: looksRandom,
  },
  {
    id: "secret.env-assignment",
    label: "Credential in environment assignment",
    severity: "medium",
    re: /^[ \t]*(?:export[ \t]+)?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*[ \t]*=[ \t]*([^\s#'"$]{8,})/gm,
    group: 1,
    validate: looksRandom,
  },
  // --- Regulated PII ---
  {
    id: "pii.ssn",
    label: "US Social Security number",
    severity: "high",
    re: /\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g,
    validate: (v) => !/^(\d)\1\1-\1\1-\1{4}$/.test(v) && v !== "123-45-6789",
  },
  // --- dwarvesf/claude-guardrails patterns/secrets.json (see guardrails-patterns.ts) ---
  // Matches already covered by a detector above collapse in findAll's overlap pass.
  ...SECRET_PATTERNS.filter((p) => !GUARDRAILS_TOOL_OUTPUT_SKIP.has(p.id)).map((p): Detector => ({
    id: p.id,
    label: p.label,
    severity: p.id === "guardrails.secret-like-variable-assignment" ? "medium" : "high",
    re: p.re,
    validate: notPlaceholder,
  })),
  {
    id: "pii.ssn-labeled",
    label: "US Social Security number",
    severity: "high",
    re: /\b(?:ssn|social[ _-]?security(?:[ _-]?(?:number|no))?)\b\W{0,3}(\d{9})\b/gi,
    group: 1,
  },
  {
    id: "pii.credit-card",
    label: "Payment card number",
    severity: "high",
    re: /\b(?:\d[ -]?){12,18}\d\b/g,
    validate: isCard,
  },
  {
    id: "pii.iban",
    label: "IBAN bank account",
    severity: "high",
    re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g,
    validate: isIban,
  },
  {
    id: "pii.dob-labeled",
    label: "Date of birth",
    severity: "medium",
    re: /\b(?:dob|date[ _-]?of[ _-]?birth|birth[ _-]?date)\b["']?\s*[:=]?\s*["']?(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})/gi,
    group: 1,
  },
];

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?<![\d.])(?:\+?1[ .-]?)?\(?[2-9]\d{2}\)?[ .-]\d{3}[ .-]\d{4}(?![\d.])/g;
const BULK_THRESHOLD = 10;
const NOREPLY =
  /(?:noreply|no-reply|example\.(?:com|org|net)|users\.noreply\.github\.com|@localhost)$/i;

export function mask(value: string): string {
  const v = value.trim();
  if (v.length <= 6) return "*".repeat(v.length);
  const keep = v.length >= 16 ? 4 : 2;
  return `${v.slice(0, keep)}…${v.slice(-2)} (${v.length} chars)`;
}

function lineOf(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

const MAX_SCAN = 2 * 1024 * 1024;
const MAX_PER_DETECTOR = 25;

/** Every value-level finding (used for redaction). */
export function findAll(text: string): Finding[] {
  const body = text.length > MAX_SCAN ? text.slice(0, MAX_SCAN) : text;
  const out: Finding[] = [];
  for (const d of DETECTORS) {
    d.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = d.re.exec(body)) && n < MAX_PER_DETECTOR) {
      if (m[0].length === 0) {
        d.re.lastIndex++;
        continue;
      }
      const value = d.group ? (m[d.group] ?? m[0]) : m[0];
      if (d.validate && !d.validate(value, m)) continue;
      const start = m.index + m[0].indexOf(value);
      out.push({
        id: d.id,
        label: d.label,
        severity: d.severity,
        masked: mask(value),
        line: lineOf(body, start),
        start,
        end: start + value.length,
      });
      n++;
    }
  }
  // Drop findings fully contained in an earlier/longer one (e.g. a JWT inside a Bearer header).
  // On an identical span the high finding wins, so the value is still redacted.
  const rank = (f: Finding) => (f.severity === "high" ? 0 : 1);
  out.sort((a, b) => a.start - b.start || b.end - a.end || rank(a) - rank(b));
  const kept: Finding[] = [];
  for (const f of out) {
    const last = kept[kept.length - 1];
    if (last && f.start >= last.start && f.end <= last.end) continue;
    kept.push(f);
  }
  return kept;
}

function bulk(body: string, re: RegExp, id: string, label: string): Finding | null {
  const seen = new Set<string>();
  let first = -1;
  re.lastIndex = 0;
  for (const m of body.matchAll(re)) {
    if (id === "pii.email-bulk" && NOREPLY.test(m[0])) continue;
    seen.add(m[0].toLowerCase());
    if (first < 0) first = m.index ?? 0;
    if (seen.size >= 500) break;
  }
  if (seen.size < BULK_THRESHOLD) return null;
  return {
    id,
    label: `${label} (${seen.size}${seen.size >= 500 ? "+" : ""} distinct)`,
    severity: "medium",
    masked: `${seen.size} values`,
    line: lineOf(body, first),
    start: first,
    end: first,
  };
}

/** Findings for reporting: value-level detectors plus bulk email/phone heuristics. */
export function scanSensitive(text: string): Finding[] {
  const body = text.length > MAX_SCAN ? text.slice(0, MAX_SCAN) : text;
  const findings = findAll(body);
  for (const b of [
    bulk(body, EMAIL, "pii.email-bulk", "Email addresses"),
    bulk(body, PHONE, "pii.phone-bulk", "Phone numbers"),
  ])
    if (b) findings.push(b);
  return findings;
}

/** Replace every high-severity value with a typed placeholder. */
export function redact(text: string): { text: string; count: number } {
  const hits = findAll(text).filter((f) => f.severity === "high");
  if (hits.length === 0) return { text, count: 0 };
  let out = "";
  let pos = 0;
  for (const f of hits) {
    if (f.start < pos) continue;
    out += text.slice(pos, f.start) + `[REDACTED:${f.id}]`;
    pos = f.end;
  }
  return { text: out + text.slice(pos), count: hits.length };
}

/** One line per distinct detector, e.g. "- [high] AWS access key ID (line 3): AKIA…XY (20 chars)". */
export function describe(findings: Finding[], limit = 12): string {
  const byId = new Map<string, Finding[]>();
  for (const f of findings) byId.set(f.id, [...(byId.get(f.id) ?? []), f]);
  const lines = [...byId.values()]
    .sort((a, b) => (a[0]!.severity === b[0]!.severity ? 0 : a[0]!.severity === "high" ? -1 : 1))
    .map((group) => {
      const f = group[0]!;
      const more = group.length > 1 ? ` (+${group.length - 1} more)` : "";
      return `  - [${f.severity}] ${f.label} at line ${f.line}: ${f.masked}${more}`;
    });
  return (
    lines.slice(0, limit).join("\n") +
    (lines.length > limit ? `\n  - …${lines.length - limit} more types` : "")
  );
}

export function summarize(findings: Finding[]): string {
  return [...new Set(findings.map((f) => f.label.replace(/ \(\d+\+? distinct\)$/, "")))].join(", ");
}

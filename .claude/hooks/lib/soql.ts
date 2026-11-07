/**
 * Minimal SOQL extraction and field classification for the SOQL guard and
 * the Apex quality gate.
 *
 * This is not a full SOQL parser. It finds `SELECT … FROM Object` statements
 * in arbitrary text (shell commands, URL-encoded REST paths, Apex `[ … ]`
 * blocks, MCP tool arguments), splits the select list at depth 0, recurses
 * into parent-to-child subqueries, and classifies each field name.
 */

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Severity } from "./sensitive-patterns.ts";

export interface SoqlQuery {
  object: string;
  fields: string[];
  /** FIELDS(ALL|STANDARD|CUSTOM) markers, upper-cased. */
  fieldsFunctions: string[];
  hasLimit: boolean;
  hasWhere: boolean;
  userMode: boolean;
  text: string;
}

export interface SensitiveField {
  object: string;
  field: string;
  severity: Severity;
  reason: string;
}

/** Strip trailing tokens and normalize SOQL that has been URL-encoded or escaped. */
export function decodeVariants(text: string): string[] {
  const variants = [text];
  if (/%[0-9A-Fa-f]{2}|\+SELECT|SELECT\+/i.test(text)) {
    try {
      variants.push(decodeURIComponent(text.replace(/\+/g, " ")));
    } catch {
      variants.push(text.replace(/\+/g, " ").replace(/%2C/gi, ",").replace(/%20/g, " "));
    }
  }
  return variants;
}

function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of list) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

/** Index of the FROM that closes the SELECT starting at `from`, skipping nested parens. */
function findFrom(text: string, from: number): number {
  let depth = 0;
  const re = /\(|\)|\bFROM\b/gi;
  re.lastIndex = from;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[0] === "(") depth++;
    else if (m[0] === ")") {
      depth--;
      if (depth < 0) return -1;
    } else if (depth === 0) return m.index;
  }
  return -1;
}

/**
 * Text after FROM up to the end of this statement: an unmatched ")" or "]",
 * a double quote or ";", or a single quote that closes a shell argument
 * rather than opening a SOQL string literal.
 */
function clauseTail(text: string, from: number): string {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")" || ch === "]") {
      if (depth === 0) return text.slice(from, i);
      depth--;
    } else if (ch === '"' || ch === ";") return text.slice(from, i);
    else if (ch === "'") {
      // SOQL literal: follows an operator, comma, paren or LIKE/IN/INCLUDES.
      if (!/(?:[=<>(,]|\b(?:LIKE|IN|INCLUDES|EXCLUDES))\s*$/i.test(text.slice(from, i)))
        return text.slice(from, i);
      const close = text.indexOf("'", i + 1);
      if (close < 0) return text.slice(from);
      i = close;
    }
  }
  return text.slice(from);
}

function fieldName(expr: string): string[] {
  let e = expr.replace(/\s+/g, " ").trim();
  // TYPEOF Owner WHEN User THEN Name, Email ELSE Name END
  const typeOf = /^TYPEOF\s+(\w+)\s+([\s\S]*?)\bEND\b/i.exec(e);
  if (typeOf) {
    const rel = typeOf[1]!;
    const names = (
      typeOf[2]!.match(/\bTHEN\s+([\w.,\s]+?)(?=\bWHEN\b|\bELSE\b|$)|\bELSE\s+([\w.,\s]+)/gi) ?? []
    )
      .flatMap((s) => s.replace(/^(THEN|ELSE)\s+/i, "").split(","))
      .map((s) => s.trim())
      .filter(Boolean);
    return names.map((n) => `${rel}.${n}`);
  }
  // Unwrap toLabel(), FORMAT(), convertCurrency(), aggregates; drop aliases.
  for (let i = 0; i < 3; i++) e = e.replace(/^\w+\s*\(\s*([\w.]+)\s*\)/, "$1");
  e = e.split(" ")[0] ?? "";
  return /^[A-Za-z_][\w.]*$/.test(e) ? [e] : [];
}

/** All SELECT statements in `text`, including subqueries, flattened. */
export function extractQueries(text: string): SoqlQuery[] {
  const out: SoqlQuery[] = [];
  for (const variant of decodeVariants(text)) {
    const re = /\bSELECT\b/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(variant))) {
      const listStart = m.index + m[0].length;
      const fromIdx = findFrom(variant, listStart);
      if (fromIdx < 0) continue;
      const objMatch = /^FROM\s+([A-Za-z_][\w]*)/i.exec(variant.slice(fromIdx));
      if (!objMatch) continue;
      const list = variant.slice(listStart, fromIdx);
      if (list.length > 20000) continue;
      const tail = clauseTail(variant, fromIdx + objMatch[0].length);
      const fields: string[] = [];
      const fieldsFunctions: string[] = [];
      // TYPEOF … END contains commas of its own: lift it out before splitting.
      const typeOf = /\bTYPEOF\b[\s\S]*?\bEND\b/gi;
      for (const t of list.match(typeOf) ?? []) fields.push(...fieldName(t));
      for (const item of splitTopLevel(list.replace(typeOf, ""))) {
        if (/^\(\s*SELECT\b/i.test(item)) continue; // subquery: found by the outer loop
        const fx = /^FIELDS\s*\(\s*(ALL|STANDARD|CUSTOM)\s*\)$/i.exec(item);
        if (fx) fieldsFunctions.push(fx[1]!.toUpperCase());
        else fields.push(...fieldName(item));
      }
      out.push({
        object: objMatch[1]!,
        fields,
        fieldsFunctions,
        hasLimit: /\bLIMIT\s+\d/i.test(tail),
        hasWhere: /\bWHERE\b/i.test(tail),
        userMode: /\bWITH\s+(?:USER_MODE|SECURITY_ENFORCED)\b/i.test(tail),
        text: `SELECT${list}${objMatch[0]}${tail}`.replace(/\s+/g, " ").trim().slice(0, 300),
      });
    }
    if (out.length > 0) break;
  }
  return out;
}

/** Split `Mailing_SSN__c` / `PersonBirthdate` / `drivers-license` into lower-case words. */
export function words(name: string): string[] {
  return name
    .replace(/__(?:c|pc|r|x|e|mdt|b)$/i, "")
    .replace(/^[A-Za-z][A-Za-z0-9]{0,14}__(?=\w)/, "") // managed-package namespace prefix
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

interface WordRule {
  severity: Severity;
  reason: string;
  /** Matched against the space-joined word list. */
  re: RegExp;
}

const WORD_RULES: WordRule[] = [
  {
    severity: "high",
    reason: "Social Security number",
    re: /\b(?:ssn|social security(?: number)?|socialsecuritynumber)\b/,
  },
  {
    severity: "high",
    reason: "tax identifier",
    re: /\b(?:tax ?id|tin|ein|itin|vat ?number|tax ?number)\b/,
  },
  {
    severity: "high",
    reason: "government ID",
    re: /\b(?:passport|drivers? ?licen[cs]e|dl number|national ?id|nin|sin number|aadhaar|pan number)\b/,
  },
  {
    severity: "high",
    reason: "date of birth",
    re: /\b(?:birth ?date|birthdate|date of birth|dob)\b/,
  },
  {
    severity: "high",
    reason: "bank account",
    re: /\b(?:bank (?:account|acct)|account routing|routing (?:number|no)|iban|swift|bic code|sort code)\b/,
  },
  {
    severity: "high",
    reason: "payment card",
    re: /\b(?:credit ?card|card ?number|cc ?number|cvv|cvc|card verification|pan)\b/,
  },
  {
    severity: "high",
    reason: "credential",
    re: /\b(?:password|passwd|pwd|secret|api ?key|private ?key|access ?token|refresh ?token|auth ?token|session ?id|consumer ?secret|client ?secret|pin(?! code)|token)\b/,
  },
  {
    severity: "high",
    reason: "health data",
    re: /\b(?:medical|diagnosis|diagnoses|prescription|medication|treatment|condition code|icd ?\d*|hipaa|patient|health (?:record|condition|data|history|insurance|status|plan))\b/,
  },
  {
    severity: "high",
    reason: "special-category data",
    re: /\b(?:ethnicity|ethnic|race|religion|religious|sexual orientation|gender identity|biometric|fingerprint|disability|political|union membership|criminal)\b/,
  },
  {
    severity: "medium",
    reason: "compensation",
    re: /\b(?:salary|compensation|income|wage|bonus amount|net worth)\b/,
  },
  {
    severity: "medium",
    reason: "contact detail",
    re: /\b(?:email|e mail|phone|mobile ?phone|home ?phone|other ?phone|assistant ?phone|fax|mobile)\b/,
  },
  {
    severity: "medium",
    reason: "home address",
    re: /\b(?:mailing|home|other|person mailing|person other)\b.*\b(?:street|address|city|postal ?code|zip)\b|\bhome ?address\b/,
  },
  {
    severity: "medium",
    reason: "network identifier",
    re: /\b(?:ip ?address|source ?ip|login ?ip)\b/,
  },
  { severity: "medium", reason: "demographic", re: /\b(?:gender|age|marital ?status)\b/ },
];

/** Objects whose FIELDS(ALL) returns personal data. */
const PERSONAL_OBJECTS = new Set(
  [
    "contact",
    "lead",
    "user",
    "account",
    "case",
    "individual",
    "contactpointemail",
    "contactpointphone",
    "contactpointaddress",
    "personaccount",
    "patient",
    "healthcloudga__ehrpatient__c",
  ].map((s) => s.toLowerCase()),
);

/** Objects that hold secrets regardless of which fields are selected. */
const SECRET_OBJECTS: Record<string, string> = {
  authsession: "user session records",
  oauthtoken: "OAuth tokens",
  authprovider: "auth provider consumer secrets",
  namedcredential: "named credential configuration",
  externalcredential: "external credential configuration",
  loginhistory: "login history (source IPs)",
};

export interface FieldOverrides {
  high: Set<string>;
  allow: Set<string>;
}

/**
 * Load `.claude/soql-sensitive-fields` from the project and ~/.claude. One
 * entry per line: `Field__c` or `Object.Field__c` marks a field high
 * sensitivity; `!Object.Field` allows it. `#` starts a comment.
 */
export function loadOverrides(cwd: string, home = homedir()): FieldOverrides {
  const high = new Set<string>();
  const allow = new Set<string>();
  for (const file of [
    join(home, ".claude", "soql-sensitive-fields"),
    join(cwd, ".claude", "soql-sensitive-fields"),
  ]) {
    if (!existsSync(file)) continue;
    try {
      for (const raw of readFileSync(file, "utf8").split("\n")) {
        const line = raw.replace(/#.*/, "").trim().toLowerCase();
        if (!line) continue;
        if (line.startsWith("!")) allow.add(line.slice(1).trim());
        else high.add(line);
      }
    } catch {
      // unreadable override file: ignore
    }
  }
  return { high, allow };
}

const NO_OVERRIDES: FieldOverrides = { high: new Set(), allow: new Set() };

/** Classify one field reference such as `Account.Owner.Email` on object `Contact`. */
export function classifyField(
  object: string,
  field: string,
  overrides: FieldOverrides = NO_OVERRIDES,
): SensitiveField | null {
  const leaf = field.split(".").pop() ?? field;
  const keys = [`${object}.${field}`, `${object}.${leaf}`, field, leaf].map((k) => k.toLowerCase());
  if (keys.some((k) => overrides.allow.has(k))) return null;
  if (keys.some((k) => overrides.high.has(k)))
    return { object, field, severity: "high", reason: "listed in soql-sensitive-fields" };
  // Standard identifiers that contain trigger words but aren't sensitive.
  if (
    /^(?:id|name|accountnumber|ownerid|recordtypeid|tokenizedphone|ismobile\w*|mobilefirst\w*|hasoptedoutofemail|emailbouncedreason|emailbounceddate|healthcheck\w*)$/i.test(
      leaf,
    )
  )
    return null;
  const joined = words(leaf).join(" ");
  for (const rule of WORD_RULES) {
    if (rule.re.test(joined))
      return { object, field, severity: rule.severity, reason: rule.reason };
  }
  return null;
}

/** Sensitive fields across a set of queries, de-duplicated. */
export function sensitiveFields(
  queries: SoqlQuery[],
  overrides: FieldOverrides = NO_OVERRIDES,
): SensitiveField[] {
  const out = new Map<string, SensitiveField>();
  for (const q of queries) {
    const obj = q.object.toLowerCase();
    if (SECRET_OBJECTS[obj]) {
      const key = `${obj}.*`;
      out.set(key, {
        object: q.object,
        field: "*",
        severity: obj === "loginhistory" ? "medium" : "high",
        reason: SECRET_OBJECTS[obj]!,
      });
    }
    for (const fx of q.fieldsFunctions) {
      if (fx === "STANDARD" && !PERSONAL_OBJECTS.has(obj)) continue;
      const key = `${obj}.fields(${fx})`;
      out.set(key, {
        object: q.object,
        field: `FIELDS(${fx})`,
        severity: "medium",
        reason:
          "returns every field, which may include sensitive data; select only the fields you need",
      });
    }
    for (const f of q.fields) {
      const hit = classifyField(q.object, f, overrides);
      if (hit) out.set(`${obj}.${f.toLowerCase()}`, hit);
    }
  }
  return [...out.values()].sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === "high" ? -1 : 1,
  );
}

export function describeFields(fields: SensitiveField[]): string {
  return fields.map((f) => `  - [${f.severity}] ${f.object}.${f.field}: ${f.reason}`).join("\n");
}

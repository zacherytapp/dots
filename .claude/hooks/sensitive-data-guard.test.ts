import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { evaluate, onOversize, redactDeep } from "./sensitive-data-guard.ts";
import {
  DETECTORS,
  EMAIL_BULK_THRESHOLD,
  findAll,
  isIban,
  luhn,
  redact,
  scanSensitive,
} from "./lib/sensitive-patterns.ts";

// Fixtures are assembled at runtime so this file holds no literal secrets.
const j = (...p: string[]) => p.join("");
function withLuhn(partial: string): string {
  for (let d = 0; d <= 9; d++) if (luhn(partial + d)) return partial + d;
  throw new Error("unreachable");
}
const F = {
  aws: j("AKIA", "Q7RT2WX9", "ZP4M3N5K"),
  awsDocs: j("AKIA", "IOSFODNN7", "EXAMPLE"),
  github: j("ghp_", "a1B2c3D4".repeat(4), "e5F6"),
  sfToken: j("00D", "5e000000AbCdE", "!", "AQ", "x9Y8.w7V6".repeat(10)),
  sfRefresh: j("5Aep8", "61", "Zx".repeat(40)),
  sfAuthUrl: j("force://", "PlatformCLI::", "5Aep861", "Qw".repeat(20), "@acme.my.salesforce.com"),
  privateKey: j("-----BEGIN ", "RSA PRIVATE KEY", "-----\nMIIEow..."),
  jwt: j(
    "eyJ",
    "hbGciOiJIUzI1NiJ9",
    ".",
    "eyJ",
    "zdWIiOiIxMjM0NTY3ODkwIn0",
    ".",
    "dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
  ),
  ssn: ["219", "09", "9999"].join("-"),
  card: withLuhn("453201511283036"),
  iban: j("GB82", "WEST", "1234", "5698", "7654", "32"),
  bearer: j("Authorization: Bearer ", "Zm9v", "YmFyYmF6cXV4", "MTIzNDU2Nzg5MA"),
  urlPassword: j("postgres://admin:", "S3cr", "etPa55", "@db.internal:5432/app"),
};

const ids = (text: string) => scanSensitive(text).map((f) => f.id);

describe("detectors", () => {
  test("unique ids, all global regexes", () => {
    assert.equal(new Set(DETECTORS.map((d) => d.id)).size, DETECTORS.length);
    for (const d of DETECTORS) assert.ok(d.re.global, d.id);
  });

  const cases: [string, string][] = [
    [`refresh: ${F.sfRefresh}`, "salesforce.refresh-token"],
    [F.privateKey, "secret.private-key"],
    [`id_token=${F.jwt}`, "secret.jwt"],
    [`ssn ${F.ssn.replace(/-/g, "")}`, "pii.ssn-labeled"],
    [`card ${F.card}`, "pii.credit-card"],
    [`card ${F.card.replace(/(\d{4})(?=\d)/g, "$1 ")}`, "pii.credit-card"],
    [`IBAN ${F.iban}`, "pii.iban"],
    [F.bearer, "secret.bearer-header"],
    [F.urlPassword, "secret.url-password"],
    [`const password = "${j("Tr0ub4", "dor&3x")}";`, "secret.assignment"],
    [`export API_TOKEN=${j("q8Z", "w2Lm9", "Xv4Rt")}`, "secret.env-assignment"],
  ];
  for (const [text, id] of cases) {
    test(id, () => assert.ok(ids(text).includes(id), `${id} not in ${JSON.stringify(ids(text))}`));
  }

  test("validators", () => {
    assert.ok(isIban(F.iban));
    assert.ok(!isIban("GB82WEST12345698765433"));
    assert.ok(luhn(F.card));
  });
});

describe("no false positives", () => {
  const clean = [
    "const password = process.env.DB_PASSWORD;",
    'password: "changeme"',
    "export GITHUB_TOKEN=$GH_TOKEN",
    "postgres://user:password@localhost/db",
    "card 4111 1111 1111 1111 is the Visa test number",
    "commit 3f9c2a1b7e4d5c6f8a9b0c1d2e3f4a5b6c7d8e9f",
    "uuid 123e4567-e89b-12d3-a456-426614174000",
    "released 2024-11-05, version 1.2.3, port 5432",
    "timestamp 1730822400000",
    "Account 0015g00000XyZabAAB and Contact 0035g00000AbCdEAAX",
    "123-45-6789 is the classic fake SSN",
  ];
  for (const text of clean) {
    test(text.slice(0, 50), () => assert.deepEqual(ids(text), []));
  }
});

describe("claude-guardrails detectors", () => {
  test("upstream token formats this table lacked are high", () => {
    const xprv = j("xprv", "9s21ZrQH143K".repeat(9).slice(0, 107));
    const ops = j("ops_", "eyJzaWduSW5BZGRyZXNz".repeat(3));
    assert.ok(ids(`key ${xprv}`).includes("guardrails.bip-32-extended-private-key"));
    assert.ok(ids(ops).includes("guardrails.1password-service-account-token"));
    assert.equal(redact(`wallet ${xprv}`).count, 1);
  });

  test("a high upstream match beats a medium assignment on the same value", () => {
    const ops = j("ops_", "eyJzaWduSW5BZGRyZXNz".repeat(3));
    assert.deepEqual(ids(`TOKEN_REF=${ops}`), ["guardrails.1password-service-account-token"]);
    assert.equal(redact(`TOKEN_REF=${ops}`).count, 1);
  });

  test("a value a local detector found is not reported twice", () => {
    assert.deepEqual(ids(`gh ${F.github}`), ["secret.github-token"]);
  });

  test("64-hex and WIF stay out of tool-output scanning", () => {
    const sha = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    assert.deepEqual(ids(`${sha}  empty.txt`), []);
  });
});

const emails = (n: number, sep = "\n") =>
  Array.from({ length: n }, (_, i) => `user${i}@acme.io`).join(sep);

describe("bulk PII", () => {
  test(`${EMAIL_BULK_THRESHOLD} or more distinct emails is a medium finding`, () => {
    const f = scanSensitive(emails(EMAIL_BULK_THRESHOLD + 2));
    assert.equal(f.length, 1);
    assert.equal(f[0]!.id, "pii.email-bulk");
    assert.equal(f[0]!.severity, "medium");
  });
  test("a few dozen emails (a git log page) is fine", () => {
    assert.deepEqual(ids(emails(EMAIL_BULK_THRESHOLD - 1, " ")), []);
  });
});

describe("redaction", () => {
  test("replaces only high values and keeps the rest", () => {
    const r = redact(`aws ${F.aws} ssn ${F.ssn} ok`);
    assert.equal(r.count, 2);
    assert.equal(r.text, "aws [REDACTED:secret.aws-access-key] ssn [REDACTED:pii.ssn] ok");
  });
  test("bearer header contains a JWT: one redaction, not two", () => {
    assert.equal(findAll(`Authorization: Bearer ${F.jwt}`).length, 1);
  });
  test("redactDeep preserves shape", () => {
    const r = redactDeep({
      stdout: `x ${F.github}`,
      stderr: "",
      interrupted: false,
      n: [1, `ssn ${F.ssn}`],
    });
    assert.deepEqual(r.value, {
      stdout: "x [REDACTED:secret.github-token]",
      stderr: "",
      interrupted: false,
      n: [1, "ssn [REDACTED:pii.ssn]"],
    });
    assert.equal(r.count, 2);
  });
});

describe("UserPromptSubmit", () => {
  const prompt = (p: string) => evaluate({ hook_event_name: "UserPromptSubmit", prompt: p });
  test("blocks high findings without echoing the prompt", () => {
    const out = prompt(`deploy with ${F.sfAuthUrl}`)!;
    assert.equal(out.decision, "block");
    assert.deepEqual(out.hookSpecificOutput, {
      hookEventName: "UserPromptSubmit",
      suppressOriginalPrompt: true,
    });
    assert.equal(out.suppressOriginalPrompt, undefined);
    assert.match(String(out.reason), /SFDX auth URL/);
    assert.ok(!String(out.reason).includes(F.sfAuthUrl));
  });
  test("[allow-sensitive] lets it through", () => {
    assert.equal(prompt(`[allow-sensitive] key ${F.aws}`), null);
  });
  test("medium findings add context, no block", () => {
    const out = prompt("my dob: 1990-01-02")!;
    assert.equal(out.decision, undefined);
    assert.match(JSON.stringify(out), /Date of birth/);
  });
  test("clean prompt", () => assert.equal(prompt("refactor the Account trigger"), null));
});

describe("PreToolUse", () => {
  const pre = (tool_name: string, tool_input: Record<string, unknown>) =>
    evaluate({ hook_event_name: "PreToolUse", tool_name, tool_input }) as {
      hookSpecificOutput?: Record<string, unknown>;
    } | null;
  test("Write with a key asks", () => {
    const out = pre("Write", { file_path: "/p/config.ts", content: `const k = "${F.aws}";` })!;
    assert.equal(out.hookSpecificOutput!.permissionDecision, "ask");
  });
  test("Bash curl with an inline token asks", () => {
    const out = pre("Bash", { command: `curl -H "${F.bearer}" https://api.example.net` })!;
    assert.equal(out.hookSpecificOutput!.permissionDecision, "ask");
  });
  test("MCP args with a card number ask", () => {
    const out = pre("mcp__crm__create", { body: { note: `paid with card ${F.card}` } })!;
    assert.equal(out.hookSpecificOutput!.permissionDecision, "ask");
  });
  test("env var references are fine", () => {
    assert.equal(
      pre("Bash", { command: 'curl -H "Authorization: Bearer $TOKEN" https://x' }),
      null,
    );
  });
  test("medium findings add context without a decision", () => {
    const out = pre("Edit", {
      file_path: "/p/a.py",
      new_string: `pwd = "${j("Zq9", "!kLm2", "xV")}"`,
    })!;
    assert.equal(out.hookSpecificOutput!.permissionDecision, undefined);
    assert.ok(out.hookSpecificOutput!.additionalContext);
  });
  test("unmonitored tools are ignored", () => {
    assert.equal(pre("Agent", { prompt: F.aws }), null);
  });
});

describe("PostToolUse", () => {
  const post = (
    tool_name: string,
    tool_response: unknown,
    tool_input: Record<string, unknown> = {},
  ) =>
    evaluate({ hook_event_name: "PostToolUse", tool_name, tool_input, tool_response }) as Record<
      string,
      any
    > | null;
  test("redacts Bash output and keeps its shape", () => {
    const resp = {
      stdout: `Access Token  ${F.sfToken}\nInstance Url  https://x`,
      stderr: "",
      interrupted: false,
      isImage: false,
    };
    const out = post("Bash", resp, { command: "sf org display --verbose" })!;
    const updated = out.hookSpecificOutput.updatedToolOutput;
    assert.deepEqual(Object.keys(updated), Object.keys(resp));
    assert.match(updated.stdout, /\[REDACTED:salesforce\.access-token\]/);
    assert.ok(!updated.stdout.includes(F.sfToken));
    assert.match(out.systemMessage, /sensitive data/);
  });
  test("medium output warns without rewriting", () => {
    const rows = Array.from({ length: 60 }, (_, i) => `003${i} | lead${i}@acme.io`).join("\n");
    const out = post("mcp__salesforce__run_soql_query", {
      content: [{ type: "text", text: rows }],
    })!;
    assert.equal(out.hookSpecificOutput.updatedToolOutput, undefined);
    assert.match(out.hookSpecificOutput.additionalContext, /email addresses/i);
  });
  test("Write echoes are skipped", () => {
    assert.equal(post("Write", { content: F.aws }), null);
  });
  test("reading the guard's own sources is skipped, by real path", () => {
    const dir = import.meta.dirname;
    assert.equal(
      post("Read", { file: { content: F.aws } }, { file_path: `${dir}/lib/sensitive-patterns.ts` }),
      null,
    );
    assert.equal(
      evaluate({
        hook_event_name: "PostToolUse",
        tool_name: "Read",
        cwd: dir,
        tool_input: { file_path: "secret-guard.test.ts" },
        tool_response: { file: { content: F.aws } },
      }),
      null,
    );
  });
  test("a file named like a guard in another repo is still scanned", () => {
    for (const file_path of ["/x/sensitive-patterns.ts", "/other/repo/secret-guard.ts"]) {
      const out = post("Read", { file: { content: `k ${F.aws}` } }, { file_path })!;
      assert.ok(out?.hookSpecificOutput.updatedToolOutput, file_path);
    }
  });
});

describe("bulk email context", () => {
  const post = (tool_name: string, tool_input: Record<string, unknown>, stdout: string) =>
    evaluate({
      hook_event_name: "PostToolUse",
      tool_name,
      tool_input,
      tool_response: { stdout, stderr: "" },
    }) as Record<string, any> | null;
  const many = emails(80);

  test("git history and people files are expected to list addresses", () => {
    for (const command of [
      "git log --format='%an <%ae>' -n 200",
      "git --no-pager shortlog -sne",
      "cd repo && git -C sub blame README.md",
      "git show HEAD~3",
    ])
      assert.equal(post("Bash", { command }, many), null, command);
    for (const file_path of ["/r/CODEOWNERS", "/r/.github/AUTHORS.md", "/r/package.json"])
      assert.equal(post("Read", { file_path }, many), null, file_path);
  });

  test("other bulk email output still warns, briefly and without credential advice", () => {
    const out = post("Bash", { command: "cat customers.csv" }, many)!;
    const ctx: string = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /email addresses/i);
    assert.doesNotMatch(ctx, /rotate/);
    assert.ok(ctx.length < 250, `${ctx.length} chars`);
  });

  test("git log output with a real credential is still flagged", () => {
    const out = post("Bash", { command: "git log -p" }, `${many}\n+key ${F.github}`)!;
    assert.match(out.hookSpecificOutput.updatedToolOutput.stdout, /REDACTED:secret\.github-token/);
  });
});

describe("review fixes", () => {
  test("redaction replaces the captured value, not an earlier copy of its text", () => {
    const pw = j("Zq8v", "Lm2x", "R7tw");
    const url = `redis://${pw}:${pw}@cache.internal:6379`;
    assert.equal(
      redact(url).text,
      `redis://${pw}:[REDACTED:secret.url-password]@cache.internal:6379`,
    );
    const scheme = j("postgres://postgres:", "S3cr", "etPa55", "@db.internal:5432/app");
    assert.equal(
      redact(scheme).text,
      "postgres://postgres:[REDACTED:secret.url-password]@db.internal:5432/app",
    );
  });

  test("every group-capture detector reports exact offsets", () => {
    for (const d of DETECTORS) if (d.group) assert.ok(d.re.hasIndices, d.id);
  });

  test("local dev database URLs and stock passwords pass; remote ones are caught", () => {
    const strong = j("S3cr", "etPa55");
    for (const url of [
      "postgres://postgres:postgres@localhost:5432/app",
      `postgres://app:${strong}@localhost:5432/app`,
      `mysql://app:${strong}@127.0.0.1/app`,
      `amqp://svc:${strong}@rabbit.local`,
      `redis://u:${strong}@api.test`,
      `https://u:${strong}@example.com/x`,
      "mysql://root:root@prod-db.acme.io/app",
      "mongodb://admin:changeme@mongo:27017",
    ])
      assert.deepEqual(ids(url), [], url);
    assert.ok(ids(`postgres://app:${strong}@db.acme.io/app`).includes("secret.url-password"));
    assert.ok(ids(`postgres://app:${strong}@db:5432/app`).includes("secret.url-password"));
  });

  test("AWS documentation keys pass; other key ids are high", () => {
    assert.deepEqual(ids(`aws_access_key_id = ${F.awsDocs}`), []);
    assert.ok(ids(`aws_access_key_id = ${F.aws}`).includes("secret.aws-access-key"));
  });

  test("SSN and card shapes need a nearby label to be high", () => {
    const sev = (text: string, id: string) =>
      scanSensitive(text).find((f) => f.id === id)?.severity;
    assert.equal(sev(`order ref ${F.ssn}`, "pii.ssn"), "medium");
    assert.equal(sev(`SSN: ${F.ssn}`, "pii.ssn"), "high");
    assert.equal(sev(`"socialSecurityNumber": "${F.ssn}"`, "pii.ssn"), "high");
    assert.equal(sev(`id ${F.card}`, "pii.credit-card"), "medium");
    assert.equal(sev(`"cardNumber": "${F.card}"`, "pii.credit-card"), "high");
    assert.equal(sev(`Visa ${F.card}`, "pii.credit-card"), "high");
    assert.equal(redact(`ids ${F.ssn} ${F.card}`).count, 0);
    assert.equal(redact(`cc ${F.card}`).count, 1);
  });

  test("code and elided values are not credential assignments", () => {
    for (const text of [
      "  TOKEN = generateToken();",
      "export SESSION_SECRET=makeSecret(32)",
      `"accessToken": "${j("00D5g", "...")}"`,
      `password: "${j("Tr0ub", "…")}"`,
      "accessToken = refreshAccessTokenFor(user)",
    ])
      assert.deepEqual(ids(text), [], text);
    assert.ok(
      ids(`export API_TOKEN=${j("q8Z", "w2Lm9", "Xv4Rt")}`).includes("secret.env-assignment"),
    );
  });

  test("pathological inputs scan in linear time", () => {
    for (const seed of ["a.", "123-45-", j("s", "k-"), "1-", "eyJa.", j("xo", "xb-"), "a@", "1 "]) {
      const text = seed.repeat(Math.ceil(200_000 / seed.length));
      const t = performance.now();
      scanSensitive(text);
      redact(text);
      const ms = performance.now() - t;
      assert.ok(ms < 500, `${JSON.stringify(seed)}: ${ms.toFixed(0)} ms`);
    }
  });
});

describe("harness deliveries", () => {
  const prompt = (p: string) =>
    evaluate({ hook_event_name: "UserPromptSubmit", prompt: p }) as Record<string, any> | null;

  test("a subagent report quoting a credential warns instead of blocking", () => {
    for (const wrapper of [
      '<agent-message from="reviewer">',
      "\n  <task-notification>",
      '<cross-session-message from="s2">',
    ]) {
      const out = prompt(`${wrapper}\nFixture: ${F.github}\n`)!;
      assert.equal(out.decision, undefined, wrapper);
      assert.match(out.systemMessage, /not blocked/);
      assert.match(out.hookSpecificOutput.additionalContext, /GitHub token/);
      assert.ok(!JSON.stringify(out).includes(F.github));
    }
  });

  test("a user prompt that merely mentions the wrapper still blocks", () => {
    assert.equal(prompt(`what is <agent-message>? also ${F.github}`)!.decision, "block");
  });
});

describe("oversize payloads", () => {
  test("PostToolUse gets an unscanned notice, other events nothing", () => {
    const out = onOversize({ hookEventName: "PostToolUse", toolName: "Bash", bytes: 6 * 2 ** 20 })!;
    assert.match(
      String(out.systemMessage),
      /Bash output too large to scan for secrets \(6\.0 MB\)/,
    );
    assert.equal(onOversize({ hookEventName: "UserPromptSubmit", toolName: "", bytes: 1 }), null);
  });
});

describe("Stop", () => {
  test("notifies on high findings in the final response", () => {
    const out = evaluate({
      hook_event_name: "Stop",
      last_assistant_message: `Your key is ${F.github}`,
    })!;
    assert.match(String(out.systemMessage), /GitHub token/);
    assert.equal(out.decision, undefined);
  });
  test("respects stop_hook_active", () => {
    assert.equal(
      evaluate({
        hook_event_name: "Stop",
        stop_hook_active: true,
        last_assistant_message: F.github,
      }),
      null,
    );
  });
});

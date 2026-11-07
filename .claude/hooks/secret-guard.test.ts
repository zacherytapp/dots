import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  BIP39_WORDS,
  findMnemonic,
  loadError,
  SECRET_PATTERNS,
  toJsRegExp,
} from "./lib/guardrails-patterns.ts";
import { evaluatePrompt, findSecrets, SECRET_RULES } from "./secret-guard.ts";
import type { Confidence } from "./secret-guard.ts";

/** Token-shaped noise, built at runtime so this file never contains a literal credential. */
const noise = (n: number, alphabet = "A1b2C3d4E5f6G7h8") =>
  Array.from({ length: n }, (_, i) => alphabet[(i * 7) % alphabet.length]).join("");
const upper = (n: number) => noise(n, "QWERTYUIOPASDFGHJKLZXCVBNM234567");
const hex = (n: number) => noise(n, "0123456789abcdef");
/** A PEM armor line, assembled so scanners like gitleaks don't read the fixtures as a key. */
const pem = (label: string) => `-----BEGIN ${label}-----`;

const ids = (text: string, scope: "prompt" | "commit" = "prompt") =>
  findSecrets(text, scope).map((f) => f.id);

describe("rules", () => {
  test("unique ids", () => {
    assert.equal(new Set(SECRET_RULES.map((r) => r.id)).size, SECRET_RULES.length);
  });
});

describe("detects credentials", () => {
  const cases: [string, string][] = [
    ["github-pat", `${"github"}_pat_${noise(82)}`],
    ["gitlab-token", `${"glpat"}-${noise(20)}`],
    ["openai-key", `${"sk"}-proj-${noise(48)}`],
    ["google-api-key", `AIza${noise(35)}`],
    ["slack-token", `${"xox"}b-${noise(24)}`],
    ["stripe-key", `${"sk"}_live_${noise(24)}`],
    ["npm-token", `${"npm"}_${noise(36)}`],
    ["digitalocean-token", `${"dop"}_v1_${hex(64)}`],
    ["age-secret-key", `AGE-SECRET-KEY-1${upper(58)}`],
    ["pem-private-key", `${pem("OPENSSH PRIVATE KEY")}\nb3Bl`],
    ["pem-private-key", pem("PRIVATE KEY")],
    ["pem-private-key", pem("PGP PRIVATE KEY BLOCK")],
    ["quoted-assignment", `const config = { apiKey: "${noise(32)}" };`],
    ["env-assignment", `export DATABASE_PASSWORD=${noise(20)}`],
  ];
  for (const [id, text] of cases) {
    test(id, () => assert.ok(ids(text).includes(id), JSON.stringify(ids(text))));
  }

  test("an Anthropic key is not also reported as an OpenAI key", () => {
    assert.deepEqual(ids(`${"sk-ant"}-api03-${noise(90)}`), ["anthropic-key"]);
  });

  test("redacts the value in findings", () => {
    const secret = `${"gh"}p_${noise(36)}`;
    const [finding] = findSecrets(secret);
    assert.ok(!finding.redacted.includes(secret.slice(8)));
    assert.match(finding.redacted, /^ghp_\.\.\.\(40 chars\)$/);
  });
});

describe("ignores non-secrets", () => {
  const benign: [string, string][] = [
    ["AWS documentation key", "AKIAIOSFODNN7EXAMPLE"],
    ["git commit SHA", "commit 958cea711b2c3d4e5f60718293a4b5c6d7e8f901"],
    ["env var reference", 'apiKey: "${process.env.OPENAI_API_KEY}"'],
    ["placeholder", 'api_key = "your-api-key-goes-here"'],
    ["sops ciphertext", 'password: "ENC[AES256_GCM,data:abcdefghijklmnop,iv:xyz]"'],
    ["unquoted code", "const password = getPasswordFromVault(userId);"],
    ["short value", 'password = "hunter2"'],
    ["public key", "-----BEGIN PUBLIC KEY-----"],
    ["masked token", "GITHUB_TOKEN=****************"],
    ["identifier with ops_ prefix", "ops_handle_request_for_user_with_a_long_name_x"],
  ];
  for (const [name, text] of benign) {
    test(name, () => assert.deepEqual(ids(text), []));
  }

  test("Google API keys in commits are heuristic only (Firebase web keys are committed on purpose)", () => {
    const findings = findSecrets(`AIza${noise(35)}`, "commit");
    assert.deepEqual(
      findings.map((f) => [f.id, f.confidence]),
      [["guardrails.google-api-key", "heuristic"]],
    );
  });

  test("labeled digests pass the 64-hex rule", () => {
    for (const text of [
      `checksum = "${hex(64)}"`,
      `"sha256": "${hex(64)}"`,
      `image@sha256:${hex(64)}`,
      `integrity: ${hex(64)}`,
    ])
      assert.deepEqual(ids(text, "commit"), [], text);
  });
});

describe("claude-guardrails patterns", () => {
  test("every upstream pattern is loaded and compiles", () => {
    assert.equal(loadError(), null);
    assert.equal(SECRET_PATTERNS.length, 13);
    const upstream = SECRET_RULES.filter((r) => r.id.startsWith("guardrails."));
    assert.equal(upstream.length, SECRET_PATTERNS.length);
    assert.equal(BIP39_WORDS.size, 2048);
  });

  test("translates a leading (?i) to the i flag", () => {
    const re = toJsRegExp("(?i)\\bmnemonic\\b");
    assert.equal(re.flags, "gi");
    assert.ok(re.test("MNEMONIC"));
    assert.throws(() => toJsRegExp("(?x)a"));
  });

  const base58 = (n: number) =>
    noise(n, "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");
  const cases: [string, string, Confidence][] = [
    ["guardrails.bitcoin-wif-private-key", `wif ${"K"}${base58(51)} end`, "heuristic"],
    ["guardrails.hex-private-key", `PRIVATE=0x${hex(64)}`, "heuristic"],
    ["guardrails.stripe-key", `${"pk"}_test_${noise(24)}`, "high"],
    ["guardrails.secret-like-variable-assignment", `seed_phrase: ${noise(24)}`, "heuristic"],
  ];
  for (const [id, text, confidence] of cases) {
    test(id, () => {
      const hit = findSecrets(text).find((f) => f.id === id);
      assert.ok(hit, JSON.stringify(ids(text)));
      assert.equal(hit.confidence, confidence);
      assert.ok(ids(text, "commit").includes(id));
    });
  }

  test("an upstream pattern does not re-report a value a local rule found", () => {
    assert.deepEqual(ids(`deploy with AKIA${upper(16)} and ${"gh"}p_${noise(36)}`), [
      "aws-access-key",
      "github-token",
    ]);
  });

  test("a generic assignment does not shadow a high-confidence upstream format", () => {
    const findings = findSecrets(`TOKEN_REF=${"ops"}_${noise(48)}`, "commit");
    assert.deepEqual(
      findings.map((f) => [f.id, f.confidence]),
      [["guardrails.1password-service-account-token", "high"]],
    );
  });

  // First 12 words of the BIP-39 list; a real phrase would be random draws.
  const phrase = [...BIP39_WORDS].slice(0, 12).join(" ");

  test("blocks a 12-word BIP-39 phrase in a prompt, without echoing it", () => {
    const [hit] = findSecrets(`restore from ${phrase}`);
    assert.equal(hit?.id, "guardrails.bip39-mnemonic");
    assert.equal(hit?.redacted, "12 words");
    const long = [...BIP39_WORDS].slice(100, 124).join(" ");
    assert.equal(findSecrets(`seed was ${long} thanks`)[0]?.redacted, "24 words");
  });

  test("BIP-39 runs are prompt-only", () => {
    assert.deepEqual(ids(phrase, "commit"), []);
  });

  test("prose built from wordlist words is not a mnemonic (upstream v0.3.7 hotfix)", () => {
    const prose =
      "question. What else do you need? If you feel that's ready, then that's ready, okay.";
    assert.equal(findMnemonic(prose), null);
    assert.equal(findMnemonic([...BIP39_WORDS].slice(0, 11).join(" ")), null);
    assert.equal(findMnemonic(`${phrase.split(" ").slice(0, 11).join(" ")} zzzz`), null);
  });
});

describe("evaluatePrompt", () => {
  test("blocks a prompt with a key and suppresses the original text", () => {
    const out = evaluatePrompt({ prompt: `deploy with AKIA${upper(16)} please` });
    assert.equal(out?.decision, "block");
    assert.match(String(out?.reason), /AWS access key ID/);
    assert.deepEqual(out?.hookSpecificOutput, {
      hookEventName: "UserPromptSubmit",
      suppressOriginalPrompt: true,
    });
  });

  test("lets ordinary prompts through", () => {
    assert.equal(evaluatePrompt({ prompt: "review the hooks in .claude/hooks" }), null);
    assert.equal(evaluatePrompt({}), null);
  });
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { evaluate } from "./soql-guard.ts";
import {
  classifyField,
  extractQueries,
  loadOverrides,
  sensitiveFields,
  words,
} from "./lib/soql.ts";

describe("extractQueries", () => {
  test("basic query with clauses", () => {
    const [q] = extractQueries(
      `sf data query -q "SELECT Id, Name, Email FROM Contact WHERE Name LIKE 'A%' LIMIT 5" -o dev`,
    );
    assert.equal(q!.object, "Contact");
    assert.deepEqual(q!.fields, ["Id", "Name", "Email"]);
    assert.ok(q!.hasWhere && q!.hasLimit && !q!.userMode);
  });
  test("subqueries, relationship fields, functions and aliases", () => {
    const qs = extractQueries(
      "SELECT Id, toLabel(Status__c), Owner.Email, COUNT(Id) total, (SELECT Birthdate, SSN__c FROM Contacts) FROM Account",
    );
    const outer = qs.find((q) => q.object === "Account")!;
    const inner = qs.find((q) => q.object === "Contacts")!;
    assert.deepEqual(outer.fields, ["Id", "Status__c", "Owner.Email", "Id"]);
    assert.deepEqual(inner.fields, ["Birthdate", "SSN__c"]);
    assert.ok(!outer.hasLimit);
  });
  test("FIELDS() and TYPEOF", () => {
    const [q] = extractQueries(
      "SELECT FIELDS(ALL), TYPEOF What WHEN Account THEN Phone, Name ELSE Name END FROM Task LIMIT 200",
    );
    assert.deepEqual(q!.fieldsFunctions, ["ALL"]);
    assert.deepEqual(q!.fields, ["What.Phone", "What.Name", "What.Name"]);
  });
  test("URL-encoded REST query", () => {
    const [q] = extractQueries(
      "sf api request rest '/services/data/v62.0/query?q=SELECT+Id%2C+SSN__c+FROM+Contact'",
    );
    assert.equal(q!.object, "Contact");
    assert.deepEqual(q!.fields, ["Id", "SSN__c"]);
  });
  test("WITH USER_MODE inside Apex brackets", () => {
    const [q] = extractQueries(
      "List<Contact> c = [SELECT Id, Birthdate FROM Contact WITH USER_MODE];",
    );
    assert.ok(q!.userMode);
  });
});

describe("classification", () => {
  const sev = (obj: string, f: string) => classifyField(obj, f)?.severity ?? null;
  test("words splits camelCase, underscores and suffixes", () => {
    assert.deepEqual(words("Mailing_SSN__c"), ["mailing", "ssn"]);
    assert.deepEqual(words("PersonBirthdate"), ["person", "birthdate"]);
    assert.deepEqual(words("acme__Tax_ID__c"), ["tax", "id"]);
  });
  const high = [
    "SSN__c",
    "Social_Security_Number__c",
    "Birthdate",
    "Tax_ID__c",
    "Passport_Number__c",
    "Drivers_License__c",
    "Bank_Account_Number__c",
    "Routing_Number__c",
    "Credit_Card_Number__c",
    "CVV__c",
    "API_Key__c",
    "Access_Token__c",
    "Password__c",
    "Diagnosis__c",
    "Health_Record_Id__c",
    "Ethnicity__c",
    "Pin__c",
  ];
  for (const f of high) test(`high: ${f}`, () => assert.equal(sev("Contact", f), "high"));
  const medium = [
    "Email",
    "Phone",
    "MailingStreet",
    "PersonMailingPostalCode",
    "Salary__c",
    "Gender__c",
    "SourceIp",
  ];
  for (const f of medium) test(`medium: ${f}`, () => assert.equal(sev("Contact", f), "medium"));
  const none = [
    "Name",
    "BillingStreet",
    "Pin_Code__c",
    "HealthScore__c",
    "HasOptedOutOfEmail",
    "Language__c",
    "Shipping_Instructions__c",
  ];
  for (const f of none) test(`none: ${f}`, () => assert.equal(sev("Contact", f), null));

  test("secret-bearing objects and FIELDS(ALL)", () => {
    const f = sensitiveFields(
      extractQueries("SELECT Id FROM AuthSession; SELECT FIELDS(ALL) FROM Lead LIMIT 200"),
    );
    assert.ok(f.some((x) => x.object === "AuthSession" && x.severity === "high"));
    assert.ok(f.some((x) => x.field === "FIELDS(ALL)" && x.severity === "medium"));
  });

  test("override file adds and allows fields", () => {
    const dir = mkdtempSync(join(tmpdir(), "soql-"));
    mkdirSync(join(dir, ".claude"));
    writeFileSync(
      join(dir, ".claude", "soql-sensitive-fields"),
      "# org specific\nCust_Ident__c\n!Contact.Email\n",
    );
    const o = loadOverrides(dir, dir);
    assert.equal(classifyField("Contact", "Cust_Ident__c", o)?.severity, "high");
    assert.equal(classifyField("Contact", "Email", o), null);
    assert.equal(classifyField("Lead", "Email", o)?.severity, "medium");
  });
});

describe("soql-guard hook", () => {
  const bash = (command: string, cwd = "/nonexistent") =>
    evaluate({
      hook_event_name: "PreToolUse",
      tool_name: "Bash",
      tool_input: { command },
      cwd,
    }) as Record<string, any> | null;

  test("asks for high-sensitivity fields", () => {
    const out = bash(
      `sf data query --query "SELECT Id, SSN__c, Birthdate FROM Contact" --target-org acme-prod`,
    )!;
    const h = out.hookSpecificOutput;
    assert.equal(h.permissionDecision, "ask");
    assert.match(h.permissionDecisionReason, /Contact\.SSN__c/);
    assert.match(h.permissionDecisionReason, /no WHERE or LIMIT/);
    assert.match(h.permissionDecisionReason, /PRODUCTION/);
  });
  test("medium fields add context only", () => {
    const out = bash(`sf data query -q "SELECT Id, Email FROM Contact LIMIT 10"`)!;
    assert.equal(out.hookSpecificOutput.permissionDecision, undefined);
    assert.match(out.hookSpecificOutput.additionalContext, /Contact\.Email/);
  });
  test("harmless query passes", () => {
    assert.equal(bash(`sf data query -q "SELECT Id, Name FROM Account LIMIT 10"`), null);
  });
  test("non-Salesforce SQL is ignored", () => {
    assert.equal(bash(`psql -c "SELECT ssn FROM people"`), null);
  });
  test("reads referenced .soql files", () => {
    const dir = mkdtempSync(join(tmpdir(), "soql-"));
    writeFileSync(
      join(dir, "q.soql"),
      "SELECT Id,\n  Bank_Account_Number__c\nFROM Payment__c\nLIMIT 10\n",
    );
    const out = bash("sf data query --file q.soql -o dev", dir)!;
    assert.equal(out.hookSpecificOutput.permissionDecision, "ask");
    assert.match(out.hookSpecificOutput.permissionDecisionReason, /Bank_Account_Number__c/);
  });
  test("bulk export and legacy sfdx", () => {
    assert.ok(
      bash(`sf data export bulk --query "SELECT Id, Tax_ID__c FROM Account" --output-file a.csv`),
    );
    assert.ok(bash(`sfdx force:data:soql:query -q "SELECT Passport__c FROM Contact"`));
  });
  test("MCP tool input", () => {
    const out = evaluate({
      hook_event_name: "PreToolUse",
      tool_name: "mcp__salesforce__run_soql_query",
      tool_input: {
        query: "SELECT Id, Credit_Card_Number__c FROM Payment__c LIMIT 1",
        usernameOrAlias: "dev",
      },
    }) as Record<string, any>;
    assert.equal(out.hookSpecificOutput.permissionDecision, "ask");
  });
});

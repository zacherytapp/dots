import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { checkApex, checkLwc, evaluate, hasTestClass } from "./apex-quality.ts";
import { preprocessApex, trackLoopDepth } from "./lib/apex-analysis.ts";

const messages = (src: string, file = "Foo.cls") =>
  checkApex(file, src).map((i) => `${i.level}:${i.line}:${i.message}`);
const has = (src: string, re: RegExp, file?: string) => messages(src, file).some((m) => re.test(m));

describe("trackLoopDepth", () => {
  const depths = (src: string) => trackLoopDepth(preprocessApex(src).split("\n"));
  test("braced loop with nested if", () => {
    assert.deepEqual(
      depths("for (A a : as) {\n if (x) {\n  y();\n }\n z();\n}\nafter();"),
      [1, 1, 1, 1, 1, 1, 0],
    );
  });
  test("Allman braces and multi-line headers", () => {
    assert.deepEqual(
      depths("for (Integer i = 0;\n     i < 10; i++)\n{\n  x();\n}\ny();"),
      [0, 0, 1, 1, 1, 0],
    );
  });
  test("unbraced body and single-line loop", () => {
    assert.deepEqual(
      depths("while (x)\n  y();\nz();\nfor (A a : as) b(a);\nc();"),
      [0, 1, 0, 1, 0],
    );
  });
  test("braces in strings and comments don't count", () => {
    assert.deepEqual(depths("for (A a : as) { // }\n s = '}';\n}\nq();"), [1, 1, 1, 0]);
  });
});

describe("Apex governor checks", () => {
  const loop = (body: string) =>
    `public with sharing class Foo {\n  void run(List<Account> as) {\n    for (Account a : as) {\n      ${body}\n    }\n  }\n}`;
  test("SOQL in loop", () =>
    assert.ok(
      has(
        loop("Contact c = [SELECT Id FROM Contact WHERE AccountId = :a.Id LIMIT 1];"),
        /^CRITICAL:4:SOQL inside a loop/,
      ),
    ));
  test("DML in loop", () => assert.ok(has(loop("update a;"), /^CRITICAL:4:DML/)));
  test("Database DML in loop", () =>
    assert.ok(has(loop("Database.insert(a, AccessLevel.USER_MODE);"), /^CRITICAL:4:DML/)));
  test("SOSL in loop", () =>
    assert.ok(
      has(loop("List<List<SObject>> r = [FIND 'x' IN ALL FIELDS RETURNING Account];"), /SOSL/),
    ));
  test("callout in loop", () =>
    assert.ok(has(loop("HttpResponse r = new Http().send(req);"), /callout/)));
  test("enqueueJob / publish / sendEmail", () => {
    assert.ok(has(loop("System.enqueueJob(new Job());"), /^HIGH:4:System\.enqueueJob/));
    assert.ok(has(loop("EventBus.publish(evt);"), /EventBus/));
    assert.ok(has(loop("Messaging.sendEmail(mails);"), /sendEmail/));
  });
  test("describe in loop", () =>
    assert.ok(has(loop("Schema.SObjectType.Account.getDescribe();"), /^MEDIUM:4:Schema describe/)));
  test("SOQL in a string or comment is ignored", () => {
    assert.ok(!has(loop("String q = '[SELECT Id FROM Contact]'; // update a;"), /CRITICAL/));
  });
  test("DML-looking identifiers outside loops are fine", () => {
    assert.ok(
      !has(
        "public with sharing class Foo {\n  void x() { update accts; Boolean updated = true; }\n}",
        /CRITICAL/,
      ),
    );
  });
  test("deep nesting", () => {
    const src =
      "public with sharing class Foo {\n void x() {\n  for (A a : as) {\n   for (B b : bs) {\n    for (C c : cs) {\n     go();\n    }\n   }\n  }\n }\n}";
    assert.ok(has(src, /nesting depth 3/));
  });
  test("Trigger.new[0]", () =>
    assert.ok(
      has(
        "trigger T on Account (before insert) {\n  Account a = Trigger.new[0];\n}",
        /^HIGH:2:Trigger reads/,
        "T.trigger",
      ),
    ));
  test("unbounded SOQL on large object", () =>
    assert.ok(
      has(
        "public with sharing class Foo {\n List<Account> a = [SELECT Id FROM Account];\n}",
        /^LOW:2:SOQL on a large object/,
      ),
    ));
  test("test classes skip governor and security checks", () => {
    assert.deepEqual(
      messages(
        `@IsTest\nprivate class FooTest {\n static void t() { for (A a : as) { insert a; } }\n}`,
      ),
      [],
    );
  });
});

describe("Apex security checks", () => {
  test("missing sharing declaration", () =>
    assert.ok(
      has(
        "public class Foo {\n List<Account> a = [SELECT Id FROM Account LIMIT 1];\n}",
        /^HIGH:1:No sharing/,
      ),
    ));
  test("without sharing + @AuraEnabled", () => {
    assert.ok(
      has(
        "public without sharing class Foo {\n @AuraEnabled public static void x() {}\n}",
        /privilege escalation/,
      ),
    );
  });
  test("sensitive fields without user mode", () => {
    const src =
      "public with sharing class Foo {\n void x() {\n  List<Contact> c = [\n   SELECT Id, SSN__c, Birthdate\n   FROM Contact LIMIT 10\n  ];\n }\n}";
    const m = messages(src).find((x) => /sensitive fields/.test(x))!;
    assert.match(m, /^HIGH:3:.*Contact\.SSN__c, Contact\.Birthdate/);
  });
  test("sensitive fields with USER_MODE are fine", () => {
    const src =
      "public with sharing class Foo {\n List<Contact> c = [SELECT SSN__c FROM Contact WITH USER_MODE LIMIT 1];\n}";
    assert.ok(!has(src, /sensitive fields/));
  });
  test("dynamic SOQL and DML without USER_MODE", () => {
    const src =
      "public with sharing class Foo {\n void x(String q) {\n  Database.query(q);\n  Database.update(recs);\n }\n}";
    assert.ok(has(src, /^MEDIUM:3:Dynamic SOQL/));
    assert.ok(has(src, /^MEDIUM:4:Database DML without/));
  });
  test("hard-coded record id", () => {
    assert.ok(
      has(
        "public with sharing class Foo {\n Id rt = '0125g000000AbCdAAK';\n}",
        /^MEDIUM:2:Hard-coded record ID/,
      ),
    );
    assert.ok(
      !has("public with sharing class Foo {\n String s = 'HelloWorldTokens';\n}", /record ID/),
    );
  });
  test("System.debug threshold", () => {
    const src = `public with sharing class Foo {\n${"  System.debug('x');\n".repeat(6)}}`;
    assert.ok(has(src, /6 System\.debug/));
  });
});

describe("LWC checks", () => {
  const file = "/p/force-app/main/default/lwc/myCmp/myCmp.js";
  const lwc = (src: string) =>
    checkLwc(file, src)
      .map((i) => i.message)
      .join("\n");
  test("console statements", () =>
    assert.match(
      lwc(
        "import { LightningElement } from 'lwc';\nexport default class X extends LightningElement {\n connectedCallback() { console.log('x'); }\n}",
      ),
      /1 console statement\(s\) \(lines 3\)/,
    ));
  test("imperative apex without error handling", () => {
    assert.match(
      lwc(
        "import { LightningElement } from 'lwc';\nimport go from '@salesforce/apex/Ctrl.go';\nexport default class X extends LightningElement { a() { go(); } }",
      ),
      /without error handling/,
    );
  });
  test("missing default export / LightningElement", () => {
    assert.match(lwc("export class X {}"), /export default class/);
    assert.match(lwc("export default class X {}"), /LightningElement/);
    assert.equal(
      lwc(
        "import { LightningElement } from 'lwc';\nexport default class X extends NavigationMixin(LightningElement) {}",
      ),
      "",
    );
  });
});

describe("hook", () => {
  const proj = mkdtempSync(join(tmpdir(), "apexq-"));
  const classes = join(proj, "force-app", "main", "default", "classes");
  mkdirSync(classes, { recursive: true });

  test("hasTestClass conventions", () => {
    writeFileSync(join(classes, "Svc.cls"), "");
    writeFileSync(join(classes, "Svc_Test.cls"), "");
    assert.ok(hasTestClass(join(classes, "Svc.cls")));
    assert.ok(!hasTestClass(join(classes, "Other.cls")));
  });

  test("Write of a new class reports issues and missing test", () => {
    const file = join(classes, "Bad.cls");
    writeFileSync(
      file,
      "public class Bad {\n void x(List<Account> as) {\n  for (Account a : as) { update a; }\n }\n}",
    );
    const out = evaluate({
      tool_name: "Write",
      tool_input: { file_path: file },
      cwd: proj,
    }) as Record<string, any>;
    const ctx: string = out.hookSpecificOutput.additionalContext;
    assert.match(ctx, /\[CRITICAL\] line 3: DML/);
    assert.match(ctx, /No test class found for Bad/);
    assert.match(out.systemMessage, /critical\/high/);
  });

  test("clean class is quiet; other files ignored", () => {
    const file = join(classes, "Svc.cls");
    writeFileSync(
      file,
      "public with sharing class Svc {\n public static Integer two() { return 2; }\n}",
    );
    assert.equal(evaluate({ tool_name: "Edit", tool_input: { file_path: file } }), null);
    assert.equal(
      evaluate({ tool_name: "Edit", tool_input: { file_path: join(proj, "README.md") } }),
      null,
    );
  });
});

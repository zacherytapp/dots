import assert from "node:assert/strict";
import { test } from "node:test";
import {
  base64,
  columnOf,
  issueItem,
  projectFor,
  projectJql,
  repoFor,
  searchUrl,
} from "./model.ts";

test("base64 matches Buffer for ASCII and UTF-8", () => {
  for (const s of ["", "a", "ab", "abc", "zakk@example.com:tok-123", "ünïcødé ✳"]) {
    assert.equal(base64(s), Buffer.from(s, "utf8").toString("base64"));
  }
});

test("Cloud uses v3 search/jql, Server uses v2 search", () => {
  assert.match(
    searchUrl("https://x.atlassian.net", "basic", "project = WEB", 50),
    /\/rest\/api\/3\/search\/jql\?jql=project%20%3D%20WEB&maxResults=50/,
  );
  assert.match(searchUrl("https://jira.lan", "bearer", "a", 5), /\/rest\/api\/2\/search\?/);
});

test("repos map to projects both ways", () => {
  const projects = { "zakk/blastbeat": "BB", geocore: "GEO" };
  assert.equal(projectFor(projects, "zakk/blastbeat"), "BB");
  assert.equal(projectFor(projects, "someone/geocore"), "GEO");
  assert.equal(projectFor(projects, "zakk/dots"), null);
  assert.equal(repoFor(projects, "bb"), "zakk/blastbeat");
  assert.equal(repoFor(projects, "GEO"), null);
  assert.equal(
    projectJql('A"B'),
    'project = "AB" AND (statusCategory != Done OR resolved >= -14d) ORDER BY updated DESC',
  );
});

test("status categories become columns and cards link to the issue", () => {
  assert.equal(columnOf("new"), "todo");
  assert.equal(columnOf("indeterminate"), "progress");
  assert.equal(columnOf("done"), "done");
  const card = issueItem(
    {
      key: "WEB-142",
      fields: {
        summary: "Fix login redirect",
        updated: "2026-11-07T10:00:00Z",
        status: { name: "In Review", statusCategory: { key: "indeterminate" } },
        priority: { name: "High" },
      },
    },
    "https://x.atlassian.net",
    {},
    null,
  );
  assert.equal(card.url, "https://x.atlassian.net/browse/WEB-142");
  assert.equal(card.column, "progress");
  assert.equal(card.tabName, "WEB-142");
});

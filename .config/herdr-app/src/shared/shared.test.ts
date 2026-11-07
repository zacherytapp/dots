import assert from "node:assert/strict";
import { test } from "node:test";
import { columnFor, countByColumn, filterItems, sortItems, type BoardItem } from "./board-model.ts";
import { issueItem, pullItem, pullTask, type GhIssue, type GhPull } from "./github-model.ts";
import { hostOf, onHost, parseRemote } from "./remote.ts";
import { ago, claudeProjectDir, cleanTitle, compactNumber, findNode, matches } from "./util.ts";

test("parseRemote understands scp, ssh and https remotes", () => {
  assert.deepEqual(parseRemote("git@github.com:zacherytapp/dots.git"), {
    host: "github.com",
    port: null,
    owner: "zacherytapp",
    name: "dots",
    slug: "zacherytapp/dots",
  });
  assert.equal(
    parseRemote("ssh://git@Forgejo.lan:2222/zakk/blastbeat.git")?.slug,
    "zakk/blastbeat",
  );
  assert.equal(parseRemote("ssh://git@Forgejo.lan:2222/zakk/blastbeat.git")?.host, "forgejo.lan");
  assert.equal(parseRemote("https://git.lan:3000/sub/zakk/geocore")?.slug, "zakk/geocore");
  assert.equal(parseRemote("/srv/git/local.git"), null);
});

test("onHost matches a web URL or an ssh alias, ignoring ports", () => {
  const r = parseRemote("ssh://git@forgejo.lan:2222/zakk/x.git");
  assert.ok(onHost(r, "http://forgejo.lan:3000"));
  assert.ok(onHost(r, null, "forgejo.lan"));
  assert.ok(!onHost(r, "https://github.com"));
  assert.equal(hostOf("https://user@Git.Lan:3000/x"), "git.lan");
});

test("util helpers", () => {
  assert.equal(cleanTitle("✳ Fix login"), "Fix login");
  assert.equal(claudeProjectDir("/home/zakk/.config/nvim"), "-home-zakk--config-nvim");
  assert.equal(compactNumber(205091), "205k");
  assert.equal(compactNumber(1250000), "1.3M");
  assert.ok(matches("dots main", "dots", "main"));
  assert.ok(!matches("dots dev", "dots", "main"));
  assert.equal(ago(Date.now() - 5 * 60000), "5m ago");
  assert.equal(
    findNode({ id: "a", children: [{ id: "b", children: [{ id: "c" }] }] }, "c")?.id,
    "c",
  );
});

const item = (over: Partial<BoardItem>): BoardItem => ({
  id: "x",
  key: "#1",
  title: "t",
  url: "",
  column: "todo",
  status: "Open",
  where: "o/r",
  updated: 0,
  tabName: "r#1",
  task: "",
  ...over,
});

test("board grouping, filtering and order", () => {
  assert.equal(columnFor(true, [], []), "todo");
  assert.equal(columnFor(true, ["zakk"], []), "progress");
  assert.equal(columnFor(true, [], ["in progress"]), "progress");
  assert.equal(columnFor(false, ["zakk"], []), "done");
  const items = [
    item({ id: "a", title: "login bug" }),
    item({ id: "b", column: "done", title: "docs" }),
  ];
  assert.deepEqual(countByColumn(items), { all: 2, todo: 1, progress: 0, done: 1 });
  assert.deepEqual(
    filterItems(items, "all", "login").map((i) => i.id),
    ["a"],
  );
  assert.deepEqual(
    filterItems(items, "done", "").map((i) => i.id),
    ["b"],
  );
  const sorted = sortItems([
    item({ id: "low", priority: "Low", updated: 9 }),
    item({ id: "high", priority: "High", updated: 1 }),
  ]);
  assert.deepEqual(
    sorted.map((i) => i.id),
    ["high", "low"],
  );
});

test("GitHub issues and pull requests map to cards and tasks", () => {
  const issue: GhIssue = {
    number: 242,
    title: "Renovate dashboard",
    url: "https://github.com/z/homelab/issues/242",
    state: "OPEN",
    updatedAt: "2026-11-07T10:00:00Z",
    repository: { nameWithOwner: "z/homelab" },
    assignees: { nodes: [] },
    labels: { nodes: [{ name: "deps" }] },
  };
  const card = issueItem(issue);
  assert.equal(card.tabName, "homelab#242");
  assert.equal(card.column, "todo");
  assert.match(card.task, /gh issue view 242 -R z\/homelab/);

  const pull: GhPull = {
    number: 7,
    title: "Fix",
    url: "u",
    state: "OPEN",
    isDraft: false,
    updatedAt: "2026-11-07T10:00:00Z",
    headRefName: "fix",
    baseRefName: "main",
    additions: 3,
    deletions: 1,
    repository: { nameWithOwner: "z/dots" },
    author: { login: "someone" },
    reviewDecision: "CHANGES_REQUESTED",
    comments: { totalCount: 2 },
    reviewThreads: { nodes: [{ isResolved: false }, { isResolved: true }] },
    reviewRequests: { nodes: [{ requestedReviewer: { login: "zakk" } }] },
    commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] },
  };
  const row = pullItem(pull, "zakk");
  assert.equal(row.group, "review");
  assert.equal(row.checks, "failing");
  assert.equal(row.review, "changes");
  assert.equal(row.unresolved, 1);
  assert.match(pullTask(row, "checks"), /gh pr checks 7 -R z\/dots/);
});

test("Forgejo pull requests map to the same rows, with reviews and checks", async () => {
  const { checksOf, forgejoPull, reviewOf } = await import("./forgejo-model.ts");
  assert.equal(checksOf("success"), "passing");
  assert.equal(checksOf("error"), "failing");
  assert.equal(checksOf(""), "none");
  assert.equal(
    reviewOf(
      [
        { state: "REQUEST_CHANGES", user: { login: "a" } },
        { state: "APPROVED", user: { login: "a" } },
        { state: "APPROVED", user: { login: "b" } },
      ],
      0,
    ),
    "approved",
  );
  assert.equal(reviewOf([], 1), "required");
  const row = forgejoPull(
    {
      number: 4,
      title: "WIP: geocoder",
      html_url: "https://forgejo.abyssus.me/zakk/geocore/pulls/4",
      updated_at: "2026-11-07T10:00:00Z",
      user: { login: "zakk" },
      head: { ref: "geo", sha: "abc" },
      base: { ref: "main" },
      requested_reviewers: [],
      comments: 1,
      review_comments: 2,
    },
    "zakk/geocore",
    "zakk",
    "failing",
    [],
  );
  assert.equal(row.provider, "forgejo");
  assert.equal(row.draft, true);
  assert.equal(row.title, "geocoder");
  assert.equal(row.group, "mine");
  assert.equal(row.comments, 3);
  assert.equal(row.tabName, "geocore#4");
  const { pullTask } = await import("./github-model.ts");
  assert.match(pullTask(row, "review"), /git fetch origin pull\/4\/head:pr-4/);
});

test("statuses come from Projects, status labels or why an issue closed", async () => {
  const { statusFromLabels, columnForStatus } = await import("./board-model.ts");
  assert.equal(statusFromLabels(["bug", "status/in-progress"]), "In progress");
  assert.equal(statusFromLabels(["Status: Review"]), "Review");
  assert.equal(statusFromLabels(["state::blocked"]), "Blocked");
  assert.equal(statusFromLabels(["bug", "statusbar"]), null);
  assert.equal(columnForStatus("Backlog", true), "todo");
  assert.equal(columnForStatus("In Review", true), "progress");
  assert.equal(columnForStatus("Done", true), "done");

  const base: GhIssue = {
    number: 9,
    title: "t",
    url: "u",
    state: "OPEN",
    updatedAt: "2026-11-07T10:00:00Z",
    repository: { nameWithOwner: "z/r" },
    labels: { nodes: [{ name: "status: doing", color: "fbca04" }] },
    comments: { totalCount: 3 },
    closedByPullRequestsReferences: {
      nodes: [
        {
          number: 5,
          title: "Fix",
          url: "p",
          isDraft: false,
          commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] },
        },
      ],
    },
  };
  const card = issueItem(base);
  assert.equal(card.status, "Doing");
  assert.equal(card.column, "progress");
  assert.equal(card.comments, 3);
  assert.equal(card.labelColors?.["status: doing"], "#fbca04");
  assert.deepEqual(card.pulls, [
    { number: 5, title: "Fix", url: "p", draft: false, checks: "failing" },
  ]);
  assert.equal(issueItem(base, "Ready").status, "Ready");
  assert.equal(issueItem(base, "Ready").column, "todo");
  const closed = issueItem({ ...base, state: "CLOSED", stateReason: "NOT_PLANNED" });
  assert.equal(closed.status, "Not planned");
  assert.equal(closed.column, "done");
});

test("open work keeps each pull request's checks", async () => {
  const { attachWork } = await import("./work-model.ts");
  const [card] = attachWork(
    [item({ id: "a", key: "#12", repo: "z/r" })],
    new Map([
      [
        "z/r",
        {
          branches: [
            { name: "fix/12-login", url: null },
            { name: "main", url: null },
          ],
          pulls: [
            {
              number: 3,
              title: "Login",
              url: "p3",
              draft: false,
              head: "other",
              body: "Closes #12",
              checks: "pending" as const,
            },
          ],
        },
      ],
    ]),
  );
  assert.deepEqual(card.pulls, [
    { number: 3, title: "Login", url: "p3", draft: false, checks: "pending" },
  ]);
  assert.deepEqual(
    card.branches?.map((b) => b.name),
    ["fix/12-login"],
  );
});

test("an Open issue's status follows its work; a tracker status wins", async () => {
  const { withWorkStatus, attachWork } = await import("./work-model.ts");
  const pr = (draft: boolean) => ({ number: 1, title: "p", url: "u", draft });
  assert.equal(withWorkStatus(item({ pulls: [pr(false)] })).status, "In review");
  assert.equal(withWorkStatus(item({ pulls: [pr(false)] })).column, "progress");
  assert.equal(withWorkStatus(item({ pulls: [pr(true)] })).status, "In progress");
  assert.equal(
    withWorkStatus(item({ branches: [{ name: "fix-1", url: null }] })).status,
    "In progress",
  );
  assert.equal(withWorkStatus(item({})).status, "Open");
  assert.equal(withWorkStatus(item({ status: "Blocked", pulls: [pr(false)] })).status, "Blocked");
  assert.equal(
    withWorkStatus(item({ column: "done", status: "Closed", pulls: [pr(false)] })).status,
    "Closed",
  );

  // A branch the tracker links stays even when its name doesn't carry the number.
  const [card] = attachWork(
    [item({ key: "#7", repo: "z/r", branches: [{ name: "login-rework", url: "l" }] })],
    new Map([["z/r", { branches: [{ name: "fix/7-login", url: "f" }], pulls: [] }]]),
  );
  assert.deepEqual(
    card.branches?.map((b) => b.name),
    ["login-rework", "fix/7-login"],
  );
  assert.equal(card.status, "In progress");
});

test("Forgejo issues carry their linked branch and milestone", async () => {
  const { issueItem: fjIssue, linkedBranch } = await import("../mods/mc-forgejo/model.ts");
  assert.equal(linkedBranch("refs/heads/feat/login"), "feat/login");
  assert.equal(linkedBranch("refs/tags/v1.0"), null);
  assert.equal(linkedBranch(""), null);
  const card = fjIssue(
    {
      id: 1,
      number: 54,
      title: "Login",
      html_url: "https://f/zakk/x/issues/54",
      state: "open",
      updated_at: "2026-11-07T10:00:00Z",
      ref: "refs/heads/feat/login",
      milestone: { title: "v0.5" },
      comments: 2,
    },
    "https://f",
    "zakk/x",
  );
  assert.deepEqual(card.branches, [
    { name: "feat/login", url: "https://f/zakk/x/src/branch/feat/login" },
  ]);
  assert.equal(card.milestone, "v0.5");
  assert.equal(card.comments, 2);
});

test("issue actions type each agent's skill command with the issue link", async () => {
  const { actionPrompt, actionTabName, agentKeyOf, chooseAgent, fill } =
    await import("./issue-actions.ts");
  const card = item({
    key: "#12",
    url: "https://forgejo.abyssus.me/zakk/homedge/issues/12",
    tabName: "homedge#12",
    title: "Login",
    repo: "zakk/homedge",
    pulls: [{ number: 3, title: "p", url: "https://f/pulls/3", draft: false }],
  });
  const review = { label: "Review issue", skill: "review-issue" };
  assert.equal(
    actionPrompt(review, { skill: "/{skill}" }, card),
    "/review-issue https://forgejo.abyssus.me/zakk/homedge/issues/12",
  );
  assert.equal(
    actionPrompt(review, { skill: "/skill:{skill}" }, card),
    "/skill:review-issue https://forgejo.abyssus.me/zakk/homedge/issues/12",
  );
  assert.equal(
    actionPrompt(
      {
        label: "Review code",
        skill: "review-code",
        prompt: "{command} {pulls} for {key} {missing}",
      },
      undefined,
      card,
    ),
    "/review-code https://f/pulls/3 for #12 {missing}",
  );
  assert.equal(actionTabName(review, card), "Review issue: homedge#12");
  assert.equal(fill("{a}-{b}", { a: "1" }), "1-{b}");

  assert.equal(agentKeyOf("claude-code"), "claude");
  assert.equal(agentKeyOf("opencode"), "opencode");
  assert.equal(chooseAgent(review, "pi", ["claude"]), "pi");
  assert.equal(chooseAgent(review, null, ["/usr/bin/opencode"]), "opencode");
  assert.equal(chooseAgent({ ...review, agent: "claude" }, "pi", ["claude"]), "claude");
});

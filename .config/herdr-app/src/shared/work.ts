// The open branches and pull requests on each card's remote, so a card can say work has started.
// GitHub: one GraphQL request for every repo on the board (each repo alone if the batch fails,
// so one missing repo doesn't hide the rest). Forgejo: its branches and open pulls per repo.
// What belongs to which card is decided in work-model.

import type { BoardItem, PullChecks } from "./board-model.ts";
import type { Forgejo } from "./forgejo.ts";
import { graphql } from "./github.ts";
import { rollupChecks } from "./github-model.ts";
import { checksOf, type ForgejoPull } from "./forgejo-model.ts";
import type { Remote } from "./remote.ts";
import { attachWork, type RepoWork } from "./work-model.ts";

export interface WorkTarget {
  provider: "github" | "forgejo";
  /** "owner/repo". */
  slug: string;
}

/** At most this many repos are asked per refresh (All spaces can span many). */
const MAX_REPOS = 20;

/** Where a git remote's branches and pull requests can be read, if anywhere. */
export function targetOf(remote: Remote, fj: Forgejo | null): WorkTarget | null {
  if (remote.host === "github.com") return { provider: "github", slug: remote.slug };
  if (fj?.isRemote(remote)) return { provider: "forgejo", slug: remote.slug };
  return null;
}

interface GhRepo {
  refs: { nodes: { name: string }[] };
  pullRequests: {
    nodes: {
      number: number;
      title: string;
      url: string;
      isDraft: boolean;
      headRefName: string;
      body: string;
      commits?: { nodes: { commit: { statusCheckRollup: { state: string } | null } }[] };
    }[];
  };
}

const GH_WORK = `fragment work on Repository {
  refs(refPrefix: "refs/heads/", first: 100) { nodes { name } }
  pullRequests(states: OPEN, first: 50, orderBy: { field: UPDATED_AT, direction: DESC }) {
    nodes { number title url isDraft headRefName body
      commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }
}`;

const branchPath = (name: string) => name.split("/").map(encodeURIComponent).join("/");

function ghRepoWork(slug: string, repo: GhRepo): RepoWork {
  return {
    branches: repo.refs.nodes.map((b) => ({
      name: b.name,
      url: `https://github.com/${slug}/tree/${branchPath(b.name)}`,
    })),
    pulls: repo.pullRequests.nodes.map((p) => ({
      number: p.number,
      title: p.title,
      url: p.url,
      draft: p.isDraft,
      head: p.headRefName,
      body: p.body ?? "",
      checks: rollupChecks(p.commits?.nodes[0]?.commit.statusCheckRollup?.state),
    })),
  };
}

async function githubBatch(slugs: string[]): Promise<Map<string, RepoWork>> {
  const vars: Record<string, string> = {};
  const decl: string[] = [];
  const parts: string[] = [];
  slugs.forEach((slug, i) => {
    const cut = slug.indexOf("/");
    vars[`o${i}`] = slug.slice(0, cut);
    vars[`n${i}`] = slug.slice(cut + 1);
    decl.push(`$o${i}: String!, $n${i}: String!`);
    parts.push(`r${i}: repository(owner: $o${i}, name: $n${i}) { ...work }`);
  });
  const data = await graphql<Record<string, GhRepo | null>>(
    `query(${decl.join(", ")}) { ${parts.join("\n")} }\n${GH_WORK}`,
    vars,
  );
  const out = new Map<string, RepoWork>();
  slugs.forEach((slug, i) => {
    const repo = data[`r${i}`];
    if (repo) out.set(slug.toLowerCase(), ghRepoWork(slug, repo));
  });
  return out;
}

async function forgejoWork(fj: Forgejo, slug: string): Promise<RepoWork> {
  const names: string[] = [];
  // Forgejo pages at 50; three pages covers all but the busiest repos.
  for (let page = 1; page <= 3; page++) {
    const list = await fj.get<{ name: string }[]>(`/repos/${slug}/branches?limit=50&page=${page}`);
    names.push(...list.map((b) => b.name));
    if (list.length < 50) break;
  }
  const pulls = await fj.get<ForgejoPull[]>(`/repos/${slug}/pulls?state=open&limit=50`);
  return {
    branches: names.map((name) => ({
      name,
      url: `${fj.base}/${slug}/src/branch/${branchPath(name)}`,
    })),
    pulls: pulls.map((p) => ({
      number: p.number,
      title: p.title.replace(/^(WIP|Draft):\s*/i, ""),
      url: p.html_url,
      draft: Boolean(p.draft) || /^(WIP|Draft):/i.test(p.title),
      head: p.head?.ref ?? "",
      body: p.body ?? "",
      sha: p.head?.sha,
    })),
  };
}

/**
 * The cards with their open branches and pull requests. Never throws: a repo that can't be
 * read leaves its cards as they were and is named in `warning`.
 */
export async function withWork(
  items: BoardItem[],
  targets: WorkTarget[],
  fj: Forgejo | null,
): Promise<{ items: BoardItem[]; warning?: string }> {
  const seen = new Set<string>();
  const unique = targets
    .filter((t) => {
      const key = `${t.provider}:${t.slug.toLowerCase()}`;
      if (seen.has(key) || !t.slug.includes("/")) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REPOS);
  const work = new Map<string, RepoWork>();
  const failed: string[] = [];

  const github = unique.filter((t) => t.provider === "github").map((t) => t.slug);
  const jobs: Promise<void>[] = [];
  if (github.length) {
    jobs.push(
      githubBatch(github)
        .catch(async () => {
          // One repo the batch can't see fails all of it: ask each alone.
          const each = new Map<string, RepoWork>();
          await Promise.all(
            github.map((slug) =>
              githubBatch([slug])
                .then((m) => m.forEach((v, k) => each.set(k, v)))
                .catch(() => failed.push(slug)),
            ),
          );
          return each;
        })
        .then((m) => m.forEach((v, k) => work.set(k, v))),
    );
  }
  for (const t of unique.filter((t) => t.provider === "forgejo")) {
    if (!fj) continue;
    jobs.push(
      forgejoWork(fj, t.slug)
        .then((w) => void work.set(t.slug.toLowerCase(), w))
        .catch(() => void failed.push(t.slug)),
    );
  }
  await Promise.all(jobs);
  const attached = attachWork(items, work);
  if (fj) await forgejoChecks(fj, attached, work);
  return {
    items: attached,
    warning: failed.length
      ? `Couldn't read branches and pull requests of ${failed.join(", ")}`
      : undefined,
  };
}

/** One target per repo on the board, for trackers whose cards all live on one provider. */
export function targetsFor(items: BoardItem[], provider: WorkTarget["provider"]): WorkTarget[] {
  return items.filter((i) => i.repo).map((i) => ({ provider, slug: i.repo as string }));
}

/**
 * Fills in the checks of the Forgejo pull requests a card shows: one combined-status request per
 * pull request on the board (Forgejo's pull list doesn't carry them). Failures leave them unknown.
 */
async function forgejoChecks(
  fj: Forgejo,
  items: BoardItem[],
  work: Map<string, RepoWork>,
): Promise<void> {
  const wanted = new Map<string, { slug: string; sha: string }>();
  for (const item of items) {
    const repo = item.repo?.toLowerCase();
    const w = repo ? work.get(repo) : undefined;
    if (!w || !item.repo) continue;
    for (const p of item.pulls ?? []) {
      const sha = w.pulls.find((r) => r.number === p.number)?.sha;
      if (sha && !p.checks) wanted.set(`${repo}#${p.number}`, { slug: item.repo, sha });
    }
  }
  const found = new Map<string, PullChecks>();
  await Promise.all(
    [...wanted].slice(0, 30).map(async ([key, { slug, sha }]) => {
      const s = await fj
        .get<{ state?: string }>(`/repos/${slug}/commits/${sha}/status`)
        .catch(() => null);
      if (s) found.set(key, checksOf(s.state));
    }),
  );
  for (const item of items) {
    for (const p of item.pulls ?? []) {
      const checks = found.get(`${item.repo?.toLowerCase()}#${p.number}`);
      if (checks) p.checks = checks;
    }
  }
}

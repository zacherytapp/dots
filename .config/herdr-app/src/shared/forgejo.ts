// Your Forgejo server's API (Gitea-compatible), shared by the issues, pull request and branch
// panels. A missing or refused token becomes a TokenError, which the panels turn into the
// in-panel token form instead of a dead end.

import { loadConfig, readSecret } from "./config.ts";
import { checksOf, forgejoPull, type ForgejoPull, type ForgejoReview } from "./forgejo-model.ts";
import type { PullItem } from "./github-model.ts";
import type { TokenAsk } from "./list-view.ts";
import { hostOf, onHost, type Remote } from "./remote.ts";
import { mapLimit } from "./util.ts";

/** Requests at once per batch of pull request details: enough to be quick, not a flood. */
const PARALLEL = 6;

/** A commit's settled status (success, failure, error), by "slug@sha": it never changes again. */
const settled = new Map<string, string>();
/** A pull request's reviews, by "slug#number", kept while its updated_at stays the same. */
const reviewCache = new Map<string, { updated: string; reviews: ForgejoReview[] }>();
/** The signed-in login per server and token. */
const viewers = new Map<string, string>();

export class TokenError extends Error {
  ask: TokenAsk;
  constructor(message: string, ask: TokenAsk) {
    super(message);
    this.ask = ask;
  }
}

export interface Forgejo {
  /** "https://forgejo.example": no trailing slash. */
  base: string;
  host: string;
  token: string;
  /** Hosts its git remotes use: the web host and any ssh aliases. */
  isRemote(remote: Remote): boolean;
  get<T>(path: string): Promise<T>;
  /** Asks for a token, saying why. */
  ask(refused: boolean): TokenAsk;
}

/** The configured server, or null when `forgejo.url` is empty. */
export async function forgejo(): Promise<Forgejo | null> {
  const config = (await loadConfig()).forgejo;
  if (!config.url.trim()) return null;
  const base = config.url.trim().replace(/\/+$/, "");
  const host = hostOf(base);
  const token = await readSecret(config, "forgejo");
  const ask = (refused: boolean): TokenAsk => ({
    service: "forgejo",
    title: refused ? "Forgejo refused the token" : `Add a token for ${host}`,
    body: refused
      ? "Paste a new access token. It needs read access to issues and repositories."
      : "Your repositories there are private, so the panel needs an access token with read access to issues and repositories.",
    createUrl: `${base}/user/settings/applications`,
  });
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `token ${token}`;
  return {
    base,
    host,
    token,
    isRemote: (remote) => onHost(remote, base, ...config.sshHosts),
    ask,
    async get<T>(path: string): Promise<T> {
      const r = await fetch(`${base}/api/v1${path}`, { headers });
      if (r.status === 401 || r.status === 403) {
        throw new TokenError(`Forgejo answered ${r.status}`, ask(Boolean(token)));
      }
      // Without a token a private repository looks missing.
      if (r.status === 404 && !token) throw new TokenError("Forgejo answered 404", ask(false));
      if (!r.ok) throw new Error(`Forgejo answered ${r.status} for ${path.split("?")[0]}.`);
      return (await r.json()) as T;
    },
  };
}

/** Open pull requests on one Forgejo repository, with checks and reviews. */
export async function forgejoRepoPulls(
  fj: Forgejo,
  slug: string,
  viewer: string,
): Promise<PullItem[]> {
  const pulls = await fj.get<ForgejoPull[]>(`/repos/${slug}/pulls?state=open&limit=50`);
  return mapLimit(pulls, PARALLEL, (p) => detail(fj, slug, p, viewer));
}

/** A commit's combined status ("success", "pending", ...), or undefined when it can't be read. */
export async function commitStatus(
  fj: Forgejo,
  slug: string,
  sha: string,
): Promise<string | undefined> {
  const key = `${fj.base} ${slug}@${sha}`;
  const known = settled.get(key);
  if (known) return known;
  const s = await fj
    .get<{ state?: string }>(`/repos/${slug}/commits/${sha}/status`)
    .catch(() => null);
  if (s?.state === "success" || s?.state === "failure" || s?.state === "error") {
    settled.set(key, s.state);
  }
  return s?.state;
}

async function pullReviews(fj: Forgejo, slug: string, p: ForgejoPull): Promise<ForgejoReview[]> {
  const key = `${fj.base} ${slug}#${p.number}`;
  const hit = reviewCache.get(key);
  if (hit && hit.updated === p.updated_at) return hit.reviews;
  const reviews = await fj
    .get<ForgejoReview[]>(`/repos/${slug}/pulls/${p.number}/reviews`)
    .catch(() => null);
  if (!reviews) return hit?.reviews ?? [];
  reviewCache.set(key, { updated: p.updated_at, reviews });
  return reviews;
}

async function detail(
  fj: Forgejo,
  slug: string,
  p: ForgejoPull,
  viewer: string,
): Promise<PullItem> {
  const [state, reviews] = await Promise.all([
    p.head?.sha ? commitStatus(fj, slug, p.head.sha) : undefined,
    pullReviews(fj, slug, p),
  ]);
  return forgejoPull(p, slug, viewer, checksOf(state), reviews);
}

/** The signed-in user's login, or "" without a token. */
export async function forgejoViewer(fj: Forgejo): Promise<string> {
  if (!fj.token) return "";
  const key = `${fj.base} ${fj.token}`;
  const known = viewers.get(key);
  if (known) return known;
  const login = (await fj.get<{ login: string }>("/user").catch(() => null))?.login ?? "";
  if (login) viewers.set(key, login);
  return login;
}

/** Open pull requests involving you on the whole server (needs a token). */
export async function forgejoMyPulls(fj: Forgejo, viewer: string): Promise<PullItem[]> {
  const search = "/repos/issues/search?type=pulls&state=open&limit=30";
  const pages = await Promise.all(
    ["created", "assigned", "review_requested", "mentioned"].map((f) =>
      fj
        .get<{ number: number; repository?: { full_name: string } | null }[]>(`${search}&${f}=true`)
        .catch(() => []),
    ),
  );
  const seen = new Map<string, { slug: string; number: number }>();
  for (const i of pages.flat()) {
    const slug = i.repository?.full_name;
    if (slug) seen.set(`${slug}#${i.number}`, { slug, number: i.number });
  }
  return mapLimit([...seen.values()].slice(0, 30), PARALLEL, async ({ slug, number }) => {
    const p = await fj.get<ForgejoPull>(`/repos/${slug}/pulls/${number}`);
    return detail(fj, slug, p, viewer);
  });
}

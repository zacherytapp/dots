// Your Forgejo server's API (Gitea-compatible), shared by the issues, pull request and branch
// panels. A missing or refused token becomes a TokenError, which the panels turn into the
// in-panel token form instead of a dead end.

import { loadConfig, readSecret } from "./config.ts";
import { checksOf, forgejoPull, type ForgejoPull, type ForgejoReview } from "./forgejo-model.ts";
import type { PullItem } from "./github-model.ts";
import type { TokenAsk } from "./list-view.ts";
import { hostOf, onHost, type Remote } from "./remote.ts";

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
  return Promise.all(pulls.map((p) => detail(fj, slug, p, viewer)));
}

async function detail(
  fj: Forgejo,
  slug: string,
  p: ForgejoPull,
  viewer: string,
): Promise<PullItem> {
  const [status, reviews] = await Promise.all([
    p.head?.sha
      ? fj.get<{ state?: string }>(`/repos/${slug}/commits/${p.head.sha}/status`).catch(() => null)
      : null,
    fj.get<ForgejoReview[]>(`/repos/${slug}/pulls/${p.number}/reviews`).catch(() => []),
  ]);
  return forgejoPull(p, slug, viewer, checksOf(status?.state), reviews);
}

/** The signed-in user's login, or "" without a token. */
export async function forgejoViewer(fj: Forgejo): Promise<string> {
  if (!fj.token) return "";
  return (await fj.get<{ login: string }>("/user").catch(() => null))?.login ?? "";
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
  return Promise.all(
    [...seen.values()].slice(0, 30).map(async ({ slug, number }) => {
      const p = await fj.get<ForgejoPull>(`/repos/${slug}/pulls/${number}`);
      return detail(fj, slug, p, viewer);
    }),
  );
}

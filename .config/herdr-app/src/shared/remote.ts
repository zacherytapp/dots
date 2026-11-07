// Git remote URLs to { host, owner, name }. Pure, so it is tested directly.

export interface Remote {
  /** Lowercased host without user or port: "github.com", "git.home.lan". */
  host: string;
  /** Port when the URL named one (an ssh port is not the web port). */
  port: string | null;
  owner: string;
  name: string;
  /** "owner/name". */
  slug: string;
  /** The git remote it came from ("origin"), when read from a repository. */
  remoteName?: string;
}

/**
 * Understands `git@host:owner/name(.git)`, `ssh://git@host:2222/owner/name(.git)`,
 * `https://host/owner/name(.git)` and `https://host/sub/path/owner/name`.
 */
export function parseRemote(url: string | null | undefined): Remote | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  let host = "";
  let port: string | null = null;
  let path = "";
  const scp = /^(?:[\w.-]+@)?([\w.-]+):(?!\/\/)(.+)$/.exec(raw);
  if (scp && !/^[a-z][\w+.-]*:\/\//i.test(raw)) {
    host = scp[1];
    path = scp[2];
  } else {
    // scheme://[user@]host[:port]/path, without the URL global (not every mod runtime has it).
    const u = /^[a-z][\w+.-]*:\/\/(?:[^@/]*@)?([^:/?#]+)(?::(\d+))?(\/[^?#]*)?/i.exec(raw);
    if (!u) return null;
    host = u[1];
    port = u[2] ?? null;
    path = u[3] ?? "";
  }
  const parts = path
    .replace(/\.git\/?$/, "")
    .split("/")
    .filter(Boolean);
  if (parts.length < 2 || !host) return null;
  const owner = parts[parts.length - 2];
  const name = parts[parts.length - 1];
  return { host: host.toLowerCase(), port, owner, name, slug: `${owner}/${name}` };
}

/** True when `remote` lives on `host`, given also as a URL ("https://git.lan:3000"). */
export function onHost(remote: Remote | null, ...hosts: (string | null | undefined)[]): boolean {
  if (!remote) return false;
  return hosts.some((h) => Boolean(h) && hostOf(h as string) === remote.host);
}

/** "http://user@Git.lan:3000/x" → "git.lan"; "git.lan:2222" → "git.lan". */
export function hostOf(urlOrHost: string): string {
  return urlOrHost
    .trim()
    .toLowerCase()
    .replace(/^[a-z][\w+.-]*:\/\//, "")
    .replace(/^[^@/]*@/, "")
    .split(/[/?#]/)[0]
    .replace(/:\d+$/, "");
}

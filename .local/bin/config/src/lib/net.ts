// Downloads go through curl rather than fetch(): it honours the system proxy
// and CA settings the same way the vendor install scripts do. Most of these run
// as root and feed apt keys, repo files and tarballs, so a redirect may never
// drop to plain http.

import { capture, output, run } from "./exec.ts";

const CURL = ["--proto", "=https", "--proto-redir", "=https", "--tlsv1.2", "-fsSL"];

/** Tag of a GitHub repo's latest release, via the releases/latest redirect (no API rate limit). */
export function latestGithubTag(repo: string): string {
  const url = output("curl", [
    ...CURL,
    "-I",
    "-o",
    "/dev/null",
    "-w",
    "%{url_effective}",
    `https://github.com/${repo}/releases/latest`,
  ]);
  const tag = url.split("/tag/")[1];
  if (!tag) throw new Error(`could not resolve the latest release of ${repo} (got ${url})`);
  return decodeURIComponent(tag);
}

export function download(url: string, dest: string): void {
  run("curl", [...CURL, "--retry", "3", "-o", dest, url]);
}

export function fetchText(url: string): string {
  return output("curl", [...CURL, "--retry", "3", url]);
}

/** True when `url` answers a HEAD request with a success status. */
export function urlExists(url: string): boolean {
  return capture("curl", [...CURL, "-I", "-o", "/dev/null", url]).status === 0;
}

// Java-side Salesforce tooling: PMD (nvim-lint's Apex linter), the Code
// Analyzer sf plugin (the sf-cli-guard and apex-quality Claude hooks) and the
// language servers that only ship inside the Salesforce VS Code extensions.

import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { output, run, which } from "../lib/exec.ts";
import { note } from "../lib/log.ts";
import { download, fetchText, latestGithubTag } from "../lib/net.ts";
import type { Context } from "../lib/context.ts";

/** Apex LSP and PMD both run on the JVM; jorje needs 17+, Code Analyzer v5 11+. */
export const MIN_JAVA = 17;

export function javaMajor(java = "java"): number | null {
  const res = output("bash", [
    "-c",
    `${java} -XshowSettings:properties -version 2>&1 | grep 'java.specification.version' || true`,
  ]);
  const m = /=\s*(\d+)/.exec(res);
  return m?.[1] ? Number(m[1]) : null;
}

export function requireJava(): void {
  const major = which("java") ? javaMajor() : null;
  if (major === null)
    throw new Error("java is not on PATH; install a JDK first (the packages/java step)");
  if (major < MIN_JAVA)
    throw new Error(`java ${major} found; the Apex LSP and PMD need ${MIN_JAVA}+`);
}

/** Latest PMD 7 release in /opt/pmd-bin-<v>, linked as /opt/pmd (.zshenv puts /opt/pmd/bin on PATH). */
export function installPmd(ctx: Context): void {
  ctx.pkg.install(["unzip", "curl"]);
  if (existsSync("/opt/pmd/bin/pmd"))
    return note(`PMD already installed: ${realpathSync("/opt/pmd")}`);
  requireJava();
  const tag = latestGithubTag("pmd/pmd");
  const version = tag.replace(/^pmd_releases\//, "");
  const tmp = mkdtempSync(join(tmpdir(), "dots-pmd-"));
  try {
    const zip = join(tmp, "pmd.zip");
    download(
      `https://github.com/pmd/pmd/releases/download/${tag}/pmd-dist-${version}-bin.zip`,
      zip,
    );
    run("unzip", ["-q", "-o", zip, "-d", "/opt"]);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
  run("ln", ["-sfn", `/opt/pmd-bin-${version}`, "/opt/pmd"]);
  note(`installed PMD ${version}`);
}

/** Mirrors lua/util/salesforce_lsp.lua's M.servers; the layout must stay identical. */
const SERVERS = {
  apex: { extension: "salesforcedx-vscode-apex", unzip: ["extension/dist/apex-jorje-lsp.jar"] },
  visualforce: {
    extension: "salesforcedx-vscode-visualforce",
    unzip: ["extension/dist/visualforceServer.js"],
  },
  // the Aura server needs the extension's node_modules
  aura: { extension: "salesforcedx-vscode-lightning", unzip: ["extension/*"] },
} as const;

interface OpenVsxLatest {
  version: string;
  files: { download: string };
}

function isOpenVsxLatest(value: unknown): value is OpenVsxLatest {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const files = v.files as Record<string, unknown> | undefined;
  return typeof v.version === "string" && typeof files?.download === "string";
}

/**
 * What `:SalesforceLspInstall` does, run here so a fresh machine has the Apex,
 * Visualforce and Aura servers before Neovim first opens an sfdx project.
 * Installed into stdpath("data")/salesforce-lsp/<name> with a VERSION file.
 */
export function installSalesforceLsps(ctx: Context): void {
  ctx.pkg.install(["unzip", "curl"]);
  const { user } = ctx;
  const root = user.path(".local", "share", "nvim", "salesforce-lsp");
  user.mkdir(root);
  for (const [name, server] of Object.entries(SERVERS)) {
    const dir = join(root, name);
    if (existsSync(join(dir, "VERSION"))) {
      note(`${name} LSP already installed: ${readFileSync(join(dir, "VERSION"), "utf8").trim()}`);
      continue;
    }
    const meta: unknown = JSON.parse(
      fetchText(`https://open-vsx.org/api/salesforce/${server.extension}/latest`),
    );
    if (!isOpenVsxLatest(meta))
      throw new Error(`unexpected Open VSX metadata for ${server.extension}`);
    const vsix = `${dir}.vsix`;
    const staging = `${dir}.new`;
    note(`${name}: downloading ${server.extension} ${meta.version}`);
    user.run("curl", [
      "--proto",
      "=https",
      "-fsSL",
      "--retry",
      "3",
      "--max-time",
      "600",
      "-o",
      vsix,
      meta.files.download,
    ]);
    user.run("rm", ["-rf", staging]);
    try {
      user.run("unzip", ["-q", "-o", vsix, ...server.unzip, "-d", staging]);
    } finally {
      user.run("rm", ["-f", vsix]);
    }
    user.run("rm", ["-rf", dir]);
    user.run("mv", [staging, dir]);
    user.writeFile(join(dir, "VERSION"), meta.version);
    note(`${name}: installed ${meta.version}`);
  }
}

/** Code Analyzer v5, which sf-cli-guard runs before pushes and hook-doctor checks for. */
export function installCodeAnalyzer(ctx: Context): void {
  const { user } = ctx;
  if (!user.which("sf")) throw new Error("sf is not installed; run the node step first");
  requireJava();
  const manifest = user.path(".local", "share", "sf", "package.json");
  if (existsSync(manifest)) {
    const deps = (JSON.parse(readFileSync(manifest, "utf8")) as { dependencies?: object })
      .dependencies;
    if (deps && "@salesforce/plugin-code-analyzer" in deps)
      return note("code-analyzer already installed");
  }
  // `sf plugins install` asks before installing unsigned plugins; this one is signed
  user.run("sf", ["plugins", "install", "@salesforce/plugin-code-analyzer"], {
    env: { SF_AUTOUPDATE_DISABLE: "true", SF_DISABLE_TELEMETRY: "true" },
  });
}

export function salesforceStep(ctx: Context): void {
  installSalesforceLsps(ctx);
  installCodeAnalyzer(ctx);
}

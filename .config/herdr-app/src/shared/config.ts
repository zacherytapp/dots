// Mission Control settings: ~/.config/herdr-app/mission-control.json (stowed from the dots
// repo). Mods only read it; tokens never live in it, only where to find them.

import { appHome, exec, readTextFile, writeTextFile } from "herdr";
import { parseJson } from "./util.ts";

/** Where a secret comes from: an environment variable, or a command that prints it. */
export interface SecretSpec {
  tokenEnv?: string | null;
  /** argv, e.g. ["pass", "show", "forgejo/token"] or ["secret-tool", "lookup", "service", "jira"]. */
  tokenCommand?: string[] | null;
}

/** A button on every issue card: runs a skill on the issue in a new agent session. */
export interface IssueAction {
  label: string;
  /** The skill to run ("review-issue"). */
  skill: string;
  /**
   * The first message, instead of the agent's `skill` template. Placeholders: {skill}, {command}
   * (the agent's skill command, e.g. "/review-issue"), {url}, {key}, {title}, {repo}, {pulls}.
   */
  prompt?: string;
  /** Always this agent (a key of `agents`), instead of the one in the main window. */
  agent?: string;
}

/** How to start an agent and run a skill in it; keyed like Herdr's program table ("claude"). */
export interface AgentRunner {
  /** The program to run; empty: Herdr's own launcher for it (programs.json `run`). */
  argv?: string[];
  /** The skill command it understands, with {skill}: "/{skill}" or "/skill:{skill}". */
  skill: string;
}

export interface Config {
  /** How to start an agent on a card or session. */
  agent: { argv: string[]; resume: string[] };
  /** The buttons on every issue card. */
  issueActions: IssueAction[];
  /** Per agent: how it runs a skill. The main window's agent is used, else `agent.argv`'s. */
  agents: Record<string, AgentRunner>;
  github: { closedDays: number; limit: number };
  forgejo: SecretSpec & {
    /** Web URL, e.g. "http://forgejo.lan:3000". Empty: the Forgejo panel shows set-up help. */
    url: string;
    /** Other hosts its git remotes use (an ssh alias). */
    sshHosts: string[];
    closedDays: number;
    limit: number;
  };
  jira: SecretSpec & {
    /** e.g. "https://acme.atlassian.net". Empty: the Jira panel shows set-up help. */
    site: string;
    /** "basic" (Cloud: email + API token) or "bearer" (Server / Data Center personal token). */
    auth: "basic" | "bearer";
    email: string;
    /** All spaces: this query. */
    jql: string;
    /** This space: repo name (or "owner/repo") to project key. */
    projects: Record<string, string>;
    limit: number;
  };
  sessions: { days: number; limit: number };
}

export const CONFIG_FILE = "mission-control.json";

const DEFAULTS: Config = {
  agent: { argv: ["claude"], resume: ["claude", "--resume"] },
  issueActions: [
    { label: "Review issue", skill: "review-issue" },
    { label: "Implement", skill: "implement" },
    { label: "Review code", skill: "review-code" },
  ],
  agents: {
    claude: { argv: ["claude"], skill: "/{skill}" },
    opencode: { argv: ["opencode"], skill: "/{skill}" },
    pi: { argv: ["pi"], skill: "/skill:{skill}" },
  },
  github: { closedDays: 14, limit: 50 },
  forgejo: {
    url: "",
    sshHosts: [],
    tokenEnv: "FORGEJO_TOKEN",
    tokenCommand: null,
    closedDays: 14,
    limit: 50,
  },
  jira: {
    site: "",
    auth: "basic",
    email: "",
    tokenEnv: "JIRA_API_TOKEN",
    tokenCommand: null,
    jql: "assignee = currentUser() AND (statusCategory != Done OR resolved >= -14d) ORDER BY updated DESC",
    projects: {},
    limit: 50,
  },
  sessions: { days: 30, limit: 80 },
};

let cache: { at: number; config: Config } | null = null;

export function configPath(): string {
  return `${appHome()}/${CONFIG_FILE}`;
}

/** The settings, merged over defaults; read again at most every 10 s. */
export async function loadConfig(): Promise<Config> {
  if (cache && Date.now() - cache.at < 10000) return cache.config;
  const raw = parseJson<Partial<Record<keyof Config, Record<string, unknown>>>>(
    await readTextFile(configPath()).catch(() => null),
    {},
  );
  // Lists replace the default; objects merge over it, key by key.
  const config = Object.fromEntries(
    Object.entries(DEFAULTS).map(([k, v]) => {
      const mine = raw[k as keyof Config] as unknown;
      if (Array.isArray(v)) return [k, Array.isArray(mine) ? mine : v];
      return [k, { ...v, ...((mine as Record<string, unknown> | undefined) ?? {}) }];
    }),
  ) as unknown as Config;
  cache = { at: Date.now(), config };
  return config;
}

const secrets = new Map<string, string>();
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Where a token saved from a panel lives: in the live app home only, never in the dots repo. */
export function tokenPath(service: string): string {
  return `${appHome()}/mission-control/${service}.token`;
}

/** An environment variable as the login shell sets it (Herdr started from the desktop may lack it). */
async function loginEnv(name: string): Promise<string> {
  if (!ENV_NAME.test(name)) return "";
  const shell = (await exec("printenv", ["SHELL"]).catch(() => null))?.stdout.trim() || "/bin/sh";
  const r = await exec(shell, ["-lic", `printf "\\036%s\\036" "$${name}"`]).catch(() => null);
  return /\x1e([^\x1e]*)\x1e/.exec(r?.stdout ?? "")?.[1].trim() ?? "";
}

/**
 * The token for a service, or "" when there is none: `tokenCommand`, else `tokenEnv` (Herdr's
 * environment, then the login shell's), else the token saved from the panel. Cached until
 * `forgetSecret`.
 */
export async function readSecret(spec: SecretSpec, service: string): Promise<string> {
  const known = secrets.get(service);
  if (known !== undefined) return known;
  let value = "";
  if (spec.tokenCommand?.length) {
    const [cmd, ...args] = spec.tokenCommand;
    const r = await exec(cmd, args).catch(() => null);
    if (r?.code === 0) value = r.stdout.trim();
  }
  if (!value && spec.tokenEnv) {
    const r = await exec("printenv", [spec.tokenEnv]).catch(() => null);
    value = (r?.code === 0 ? r.stdout.trim() : "") || (await loginEnv(spec.tokenEnv));
  }
  if (!value) value = ((await readTextFile(tokenPath(service)).catch(() => null)) ?? "").trim();
  if (value) secrets.set(service, value);
  return value;
}

export function forgetSecret(service: string): void {
  secrets.delete(service);
}

/** Saves a token pasted into a panel: a 700 folder, a 600 file, outside the repo. */
export async function saveToken(service: string, token: string): Promise<void> {
  const path = tokenPath(service);
  const dir = path.slice(0, path.lastIndexOf("/"));
  const made = await exec("mkdir", ["-p", "-m", "700", dir]);
  if (made.code !== 0) throw new Error(made.stderr || `Couldn't make ${dir}`);
  await exec("chmod", ["700", dir]);
  const now = await readTextFile(path).catch(() => null);
  await writeTextFile(path, `${token.trim()}\n`, now);
  await exec("chmod", ["600", path]);
  forgetSecret(service);
}

/** Opens the settings file in an editor tab. */
export function editConfigArgs(): { name: string; argv: string[] } {
  return { name: "mission-control.json", argv: ["nvim", configPath()] };
}

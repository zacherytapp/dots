// Entry point, run by install.sh with the bootstrapped Node.js:
//
//   sudo ./install.sh [step ...]   install (all default steps when none are named)
//   ./install.sh --list            the steps for this distro
//   ./install.sh verify            check the result, as your normal user
//
// Settings come from the environment, or a prompt when run interactively:
//   USER_NAME, USER_EMAIL, SETUP_HOSTNAME (default behemoth), LOCAL_IP,
//   NONINTERACTIVE=1 to never prompt, SKIP_UPGRADE=1 to skip the system upgrade.

import { createInterface } from "node:readline/promises";
import { arch } from "./distros/arch.ts";
import { fedora } from "./distros/fedora.ts";
import { ubuntu } from "./distros/ubuntu.ts";
import { detectDistro, isContainer, readOsRelease, repoDir, setupDir } from "./lib/context.ts";
import { error, info, openLog, record, warn } from "./lib/log.ts";
import { findStep, listSteps, printSummary, runSteps } from "./lib/steps.ts";
import { User, passwd } from "./lib/user.ts";
import { Verifier } from "./lib/verify.ts";
import type { Context, DistroId, Settings } from "./lib/context.ts";
import type { Distro } from "./distros/types.ts";

const DISTROS: Record<DistroId, Distro> = { cachyos: arch, arch, fedora, ubuntu };
const LOG_FILE = "/var/log/dots-setup.log";

const USAGE = `usage: sudo ./install.sh [step ...]
       ./install.sh --list
       ./install.sh verify`;

const truthy = (v: string | undefined) => v !== undefined && v !== "" && v !== "0";

async function loadSettings(): Promise<Settings> {
  const env = process.env;
  const nonInteractive = truthy(env.NONINTERACTIVE) || !process.stdin.isTTY;
  const rl = nonInteractive
    ? null
    : createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (value: string | undefined, question: string, fallback = "") => {
    if (value) return value;
    const answer = rl ? (await rl.question(`${question} `)).trim() : "";
    return answer || fallback;
  };
  try {
    return {
      userName: await ask(env.USER_NAME, "full name for git and keys?"),
      userEmail: await ask(env.USER_EMAIL, "email for git and keys?"),
      hostname: await ask(env.SETUP_HOSTNAME, "hostname? [behemoth]", "behemoth"),
      localIp: await ask(
        env.LOCAL_IP,
        "local network to allow through ufw (e.g. 192.168.1.0/24, blank to skip)?",
      ),
      nonInteractive,
      skipUpgrade: truthy(env.SKIP_UPGRADE),
    };
  } finally {
    rl?.close();
  }
}

function settingsFromEnv(): Settings {
  const env = process.env;
  return {
    userName: env.USER_NAME ?? "",
    userEmail: env.USER_EMAIL ?? "",
    hostname: env.SETUP_HOSTNAME ?? "behemoth",
    localIp: env.LOCAL_IP ?? "",
    nonInteractive: true,
    skipUpgrade: truthy(env.SKIP_UPGRADE),
  };
}

async function main(argv: string[]): Promise<number> {
  if (argv[0] === "-h" || argv[0] === "--help") {
    console.log(USAGE);
    return 0;
  }

  const os = readOsRelease();
  const id = detectDistro(os);
  if (!id) {
    error(`unsupported distro: ${os.prettyName} (supported: cachyos, arch, fedora, ubuntu)`);
    return 1;
  }
  const distro = DISTROS[id];
  const isRoot = process.getuid?.() === 0;
  const sudoUser = process.env.SUDO_USER;
  const userName = isRoot ? sudoUser : (process.env.USER ?? passwdSelf());

  const base = {
    distro: id,
    os,
    pkg: distro.pkg,
    container: isContainer(),
    setupDir,
    repoDir,
  };

  if (argv[0] === "--list" || argv[0] === "-l") {
    const ctx: Context = {
      ...base,
      user: new User(passwd(userName || "root")),
      settings: settingsFromEnv(),
    };
    console.log(`${os.prettyName}\n${listSteps(distro.plan(ctx))}`);
    return 0;
  }

  if (argv[0] === "verify") {
    if (isRoot) {
      error("run verify as your normal user, not with sudo");
      return 1;
    }
    const user = new User(passwd(userName ?? ""));
    const ctx: Context = { ...base, user, settings: settingsFromEnv() };
    const v = new Verifier(user.searchPath());
    distro.verify(ctx, v);
    return v.report() ? 0 : 1;
  }

  if (!isRoot || !sudoUser || sudoUser === "root") {
    error(
      `run with sudo from your normal user account: sudo ./install.sh ${argv.join(" ")}`.trim(),
    );
    return 1;
  }

  const user = new User(passwd(sudoUser));
  const settings = await loadSettings();
  const ctx: Context = { ...base, user, settings };
  const plan = distro.plan(ctx);

  const unknown = argv.filter((name) => !findStep(plan, name));
  if (unknown.length > 0) {
    error(`unknown step: ${unknown.join(" ")}`);
    console.log(listSteps(plan));
    return 1;
  }
  const steps = argv.length === 0 ? plan.defaults : argv.map((name) => findStep(plan, name)!);

  // `sudo -E` keeps the user's HOME, so root-run tools (pacman hooks, fc-cache)
  // would leave root-owned files in ~/.cache
  process.env.HOME = "/root";
  for (const v of [
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
    "XDG_STATE_HOME",
    "XDG_RUNTIME_DIR",
  ]) {
    delete process.env[v];
  }

  openLog(LOG_FILE);
  info(`${os.prettyName} setup for ${user.name}: ${steps.map((s) => s.name).join(" ")}`);
  record(`setup started for ${user.name}: ${steps.map((s) => s.name).join(" ")}`);
  if (ctx.container)
    warn("running in a container: services, firewall and hardware steps are skipped");

  return printSummary(runSteps(ctx, steps)) ? 0 : 1;
}

function passwdSelf(): string {
  const uid = process.getuid?.();
  return uid === undefined ? "" : String(uid);
}

process.exitCode = await main(process.argv.slice(2));

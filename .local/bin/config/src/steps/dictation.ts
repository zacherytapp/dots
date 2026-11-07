// Push-to-talk dictation: hyprwhspr with local faster-whisper transcription.
//
// The dots side is stowed: SUPER+F in .config/hypr/config/binds.lua writes
// start/release to hyprwhspr's control fifo, and the drop-in in
// .config/systemd/user/hyprwhspr.service.d keeps the service offline
// (HF_HUB_OFFLINE=1), so the model has to be downloaded here. This step does
// the rest, checking files first so a re-run on a working machine changes nothing:
//
//   config   ~/.config/hyprwhspr/config.json is app-written and saved sparse
//            (values equal to hyprwhspr's defaults are dropped), so it's
//            merged on effective values instead of stowed
//   backend  `hyprwhspr setup auto` builds ~/.local/share/hyprwhspr/venv. It
//            adds the CUDA pip wheels (cublas, cudnn) when `nvidia-smi -L`
//            answers and installs CPU-only otherwise; there's no system CUDA 12
//   model    large-v3-turbo when CUDA works; small on CPU, where turbo takes
//            seconds per utterance and hyprwhspr's own base default misses
//            too much technical vocabulary. Picked by the driver answering, not
//            the PCI device: containers see the host's GPU, and an NVIDIA card
//            on nouveau never runs CUDA
//   service  the packaged user unit, linked into graphical-session.target
//
// Groups: only `input` (the evdev hotkey path). ydotool, a hyprwhspr
// dependency, ships the /dev/uinput udev rule, and `tty` (which `hyprwhspr
// setup` also adds) would let the user write to every terminal.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { hasNvidiaGpu } from "../desktop/checks.ts";
import { capture, run, which } from "../lib/exec.ts";
import { note, warn } from "../lib/log.ts";
import { skipInContainer } from "../lib/system.ts";
import type { Context } from "../lib/context.ts";
import type { Verifier } from "../lib/verify.ts";

export type Config = Record<string, unknown>;

const SCHEMA = "https://raw.githubusercontent.com/goodroot/hyprwhspr/main/share/config.schema.json";
const UNIT = "hyprwhspr.service";
const PACKAGED_UNIT = `/usr/lib/systemd/user/${UNIT}`;
const CUDA_LIBS = ["cublas/lib/libcublas.so.12", "cudnn/lib/libcudnn.so.9"];

export const GPU_MODEL = "large-v3-turbo";
export const CPU_MODEL = "small";

/** hyprwhspr's defaults for the keys below: what an absent key means. */
const HYPRWHSPR_DEFAULTS: Config = {
  recording_mode: "toggle",
  push_to_talk_lock_seconds: 0,
  external_bindings: false,
  transcription_backend: "pywhispercpp",
  faster_whisper_model: "base",
  faster_whisper_device: "auto",
};

/** What the dots keybind and the fully local setup depend on; reset on every run. */
const REQUIRED: Config = {
  recording_mode: "push_to_talk",
  // > 0 latches a long hold, so the release no longer stops and pastes
  push_to_talk_lock_seconds: 0,
  // the hyprland bind drives recording, not hyprwhspr's own shortcut
  external_bindings: true,
  // local transcription; never a cloud backend
  transcription_backend: "faster-whisper",
};

const PROMPT =
  "Technical dictation for a software engineer using Claude Code in a terminal. Vocabulary: " +
  "Claude, Claude Code, Anthropic, Hyprland, Ghostty, CachyOS, Arch, paru, systemd, kubectl, " +
  "Docker, Tailscale, SSH, tmux, Neovim, Git, GitHub, Forgejo, Salesforce, Apex, LWC, " +
  "TypeScript, Python, JSON, YAML, API, CLI, MCP.";

export const defaultModel = (cuda: boolean): string => (cuda ? GPU_MODEL : CPU_MODEL);

/** The value hyprwhspr uses for `key`: the stored one, else its default. */
export function effective(config: Config, key: string): unknown {
  return key in config ? config[key] : HYPRWHSPR_DEFAULTS[key];
}

/** Settings that break the keybind, local transcription or the GPU, with the value each needs. */
export function requiredFixes(config: Config): Config {
  const fixes: Config = {};
  for (const [key, value] of Object.entries(REQUIRED)) {
    if (effective(config, key) !== value) fixes[key] = value;
  }
  // only "auto" preloads the venv's CUDA libs: with "cuda" the first
  // transcription fails on libcublas.so.12 and silently drops to CPU. "auto"
  // is still GPU when CUDA works and CPU otherwise; an explicit "cpu" stays
  if (effective(config, "faster_whisper_device") === "cuda") fixes.faster_whisper_device = "auto";
  return fixes;
}

/**
 * `current` with the required settings applied and the dots defaults filled in
 * where unset. Keys the user set are kept, apart from requiredFixes. (A sparse
 * save drops a value equal to hyprwhspr's default, so a deliberate "base"
 * model reads as unset and is replaced.)
 */
export function mergeConfig(current: Config, model: string): { config: Config; changes: string[] } {
  const config: Config = Object.keys(current).length > 0 ? { ...current } : { $schema: SCHEMA };
  const unset: Config = { language: "en", whisper_prompt: PROMPT, faster_whisper_model: model };
  const updates: Config = { ...requiredFixes(config) };
  for (const [key, value] of Object.entries(unset)) if (!(key in config)) updates[key] = value;
  Object.assign(config, updates);
  return { config, changes: Object.keys(updates) };
}

export interface Venv {
  fasterWhisper: boolean;
  cudaLibs: boolean;
}

function list(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/** What the backend venv holds, from its files alone (running its python would write bytecode). */
export function inspectVenv(dir: string): Venv {
  const python = list(join(dir, "lib")).find((d) => /^python3\.\d+$/.test(d));
  // bin/python is a symlink to the system interpreter; a python upgrade breaks it
  if (!python || !existsSync(join(dir, "bin", "python"))) {
    return { fasterWhisper: false, cudaLibs: false };
  }
  const site = join(dir, "lib", python, "site-packages");
  return {
    fasterWhisper: existsSync(join(site, "faster_whisper", "__init__.py")),
    cudaLibs: CUDA_LIBS.every((lib) => existsSync(join(site, "nvidia", lib))),
  };
}

/** The venv runs faster-whisper, with the CUDA libs when the driver can use them. */
export const backendReady = (venv: Venv, cuda: boolean): boolean =>
  venv.fasterWhisper && (!cuda || venv.cudaLibs);

/**
 * `repo` (a Hugging Face repo id, or a local model directory) has a complete
 * snapshot in the cache `hub`.
 */
export function modelCached(hub: string, repo: string): boolean {
  if (repo.startsWith("/")) return existsSync(join(repo, "model.bin"));
  const dir = join(hub, `models--${repo.replaceAll("/", "--")}`, "snapshots");
  return list(dir).some((s) => existsSync(join(dir, s, "model.bin")));
}

/**
 * The repo id faster-whisper loads for `model`, from the venv's own table
 * (large-v3-turbo is mobiuslabsgmbh, distil-* are faster-distil-whisper-*).
 * -I -B: no user site, no bytecode written into the venv. Null without a venv.
 */
function modelRepo(ctx: Context, model: string): string | null {
  if (model.includes("/")) return model;
  const res = ctx.user.capture(
    join(venvDir(ctx), "bin", "python"),
    [
      "-I",
      "-B",
      "-c",
      "import sys; from faster_whisper.utils import _MODELS as m; print(m.get(sys.argv[1], sys.argv[1]))",
      model,
    ],
    { input: "" },
  );
  const repo = res.stdout.trim();
  return res.status === 0 && repo ? repo : null;
}

const cached = (ctx: Context, model: string): boolean => {
  const repo = modelRepo(ctx, model);
  return repo !== null && modelCached(hubDir(ctx), repo);
};

/** The NVIDIA driver answers, the same test hyprwhspr uses to pick its CUDA wheels. */
export function cudaDriverResponds(): boolean {
  if (!which("nvidia-smi")) return false;
  const res = capture("nvidia-smi", ["-L"]);
  return res.status === 0 && /^GPU \d+:/m.test(res.stdout);
}

const configPath = (ctx: Context) => ctx.user.path(".config", "hyprwhspr", "config.json");
const venvDir = (ctx: Context) => ctx.user.path(".local", "share", "hyprwhspr", "venv");
const hubDir = (ctx: Context) => ctx.user.path(".cache", "huggingface", "hub");
const wantsLink = (ctx: Context) =>
  ctx.user.path(".config", "systemd", "user", "graphical-session.target.wants", UNIT);

/** The stored config; {} when there's none yet. Throws on invalid JSON rather than replace it. */
function readConfig(ctx: Context): Config {
  const path = configPath(ctx);
  const text = ctx.user.readFile(path);
  if (text === null || text.trim() === "") return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`${path}: ${e instanceof Error ? e.message : String(e)}, fix it by hand`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON object, fix it by hand`);
  }
  return parsed as Config;
}

/** Merges the dots settings into the config; returns true if it wrote the file. */
function writeConfig(ctx: Context, model: string): boolean {
  const { config, changes } = mergeConfig(readConfig(ctx), model);
  if (changes.length === 0) {
    note("hyprwhspr config already set");
    return false;
  }
  ctx.user.mkdir(ctx.user.path(".config", "hyprwhspr"));
  ctx.user.writeFile(configPath(ctx), `${JSON.stringify(config, null, 2)}\n`);
  note(`hyprwhspr config: set ${changes.join(", ")}`);
  return true;
}

function addInputGroup(ctx: Context): void {
  if (capture("id", ["-nG", ctx.user.name]).stdout.split(/\s+/).includes("input")) return;
  run("usermod", ["-aG", "input", ctx.user.name]);
  warn("added to the input group: log out and back in before dictating");
}

/** Links the packaged unit like `systemctl --user enable`; true if it made the link. */
function enableUnit(ctx: Context): boolean {
  // follows the link, so a dangling one is replaced; any live target counts
  // (`hyprwhspr systemd install` links a copy in ~/.config/systemd/user)
  const link = wantsLink(ctx);
  if (existsSync(link)) return false;
  if (!existsSync(PACKAGED_UNIT))
    throw new Error(`${PACKAGED_UNIT} is missing; reinstall hyprwhspr`);
  ctx.user.mkdir(dirname(link));
  ctx.user.run("ln", ["-sfn", PACKAGED_UNIT, link]);
  note(`enabled ${UNIT} for graphical-session.target`);
  return true;
}

/** (Re)starts the service in the user's running session; otherwise it starts at the next login. */
function restartService(ctx: Context, changed: boolean): void {
  if (skipInContainer(ctx, `systemctl --user restart ${UNIT}`)) return;
  // sudo has no session bus; -M user@ reaches the user's manager from root
  const userctl = ["--user", "-M", `${ctx.user.name}@`];
  const isActive = (unit: string) =>
    capture("systemctl", [...userctl, "is-active", "--quiet", unit]).status === 0;
  const graphical =
    existsSync(`/run/user/${ctx.user.uid}/systemd/private`) && isActive("graphical-session.target");
  if (!graphical) return note(`no graphical session: ${UNIT} starts at the next login`);
  const active = isActive(UNIT);
  if (active && !changed) return note(`${UNIT} already running`);
  run("systemctl", [...userctl, "daemon-reload"]);
  run("systemctl", [...userctl, "restart", UNIT]);
  note(`${active ? "restarted" : "started"} ${UNIT}`);
}

/** NVIDIA hardware, and whether its driver answers (what hyprwhspr installs CUDA for). */
function probeGpu(): { nvidia: boolean; cuda: boolean } {
  const cuda = cudaDriverResponds();
  return { nvidia: cuda || hasNvidiaGpu(), cuda };
}

/** Configures hyprwhspr for the user: permissions, config, backend venv, model and service. */
export function setupDictation(ctx: Context): void {
  if (!which("hyprwhspr")) throw new Error("hyprwhspr is not installed");
  const { nvidia, cuda } = probeGpu();
  if (nvidia && !cuda) {
    // the model stays the CPU one: switching it is the user's call once CUDA works
    warn("nvidia gpu, but nvidia-smi doesn't answer: dictation runs on the CPU. Once the driver");
    warn(
      `loads, re-run \`sudo ./install.sh dictation\` and set faster_whisper_model: ${GPU_MODEL}`,
    );
  }
  note(`transcription on ${cuda ? "the nvidia gpu (cuda), cpu as fallback" : "the cpu"}`);

  addInputGroup(ctx);
  let changed = writeConfig(ctx, defaultModel(cuda));
  const model = String(effective(readConfig(ctx), "faster_whisper_model"));

  if (!backendReady(inspectVenv(venvDir(ctx)), cuda)) {
    // `hyprwhspr --help` is routed to the top-level help, so the flags are from
    // its cli.py: no bar widget (noctalia has its own), no unit (linked below)
    const args = ["setup", "auto", "--backend", "faster-whisper", "--model", model];
    ctx.user.run("hyprwhspr", [...args, "--no-waybar", "--no-systemd"], { input: "" });
    const venv = inspectVenv(venvDir(ctx));
    if (!venv.fasterWhisper) {
      throw new Error(
        "hyprwhspr setup auto left no faster-whisper venv; see `hyprwhspr state show`",
      );
    }
    if (!backendReady(venv, cuda)) {
      throw new Error("hyprwhspr setup auto installed faster-whisper without the CUDA libraries");
    }
    // setup auto saves the config itself; re-apply anything it reset
    writeConfig(ctx, model);
    changed = true;
  } else note("faster-whisper backend already installed");

  if (!cached(ctx, model)) {
    ctx.user.run("hyprwhspr", ["model", "download", model], { input: "" });
    if (!cached(ctx, model)) throw new Error(`faster-whisper model ${model} did not download`);
    changed = true;
  } else note(`model ${model} already downloaded`);

  changed = enableUnit(ctx) || changed;
  restartService(ctx, changed);
}

/** Run as the user by `install.sh verify` (never as root), so plain `systemctl --user` works. */
export function verifyDictation(ctx: Context, v: Verifier): void {
  v.section("dictation (hyprwhspr)");
  v.commands("hyprwhspr", "wtype", "ydotool", "wl-copy");
  v.check("config: push-to-talk on the hyprland bind, local faster-whisper, device auto", () => {
    return Object.keys(requiredFixes(readConfig(ctx))).length === 0;
  });
  v.check("faster-whisper venv", () => inspectVenv(venvDir(ctx)).fasterWhisper);
  const { nvidia, cuda } = probeGpu();
  // a container sees the host's gpu but not its driver
  if (nvidia && !ctx.container) v.check("nvidia driver answers (dictation on the gpu)", () => cuda);
  if (cuda) {
    v.check("cuda libraries in the venv (cublas, cudnn)", () => inspectVenv(venvDir(ctx)).cudaLibs);
  }
  v.check("faster-whisper model downloaded", () =>
    cached(ctx, String(effective(readConfig(ctx), "faster_whisper_model"))),
  );
  v.check("in the input group", () =>
    capture("id", ["-nG", ctx.user.name]).stdout.split(/\s+/).includes("input"),
  );
  v.check(`${UNIT} enabled`, () => existsSync(wantsLink(ctx)));
  // only meaningful inside the desktop session the unit is part of
  const session = capture("systemctl", [
    "--user",
    "is-active",
    "--quiet",
    "graphical-session.target",
  ]);
  if (session.status === 0) {
    v.runs(`${UNIT} running`, "systemctl", ["--user", "is-active", "--quiet", UNIT]);
  }
}

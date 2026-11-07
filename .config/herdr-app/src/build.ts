// Builds the Herdr mods in src/mods/<name>/ into ../mods/<name>/, the folder stow links into
// ~/.config/herdr-app/mods/. Herdr loads plain JavaScript and refuses any module whose real path
// is outside the mod's folder, and stow links each file into the repo, so a stowed mod can't
// import a second file: each one is bundled (esbuild) into
//
//   mods/<name>/main.js              the mod, the src/shared code it imports and its icons
//   mods/<name>/mod.json             copied
//
// Icons can't be stowed either (Herdr won't draw a symlinked SVG), so shared/icons.ts writes
// them into the live mod folder at run time.
//
// `__MOD__` in any module becomes the mod's folder name, so shared code can name its own assets.
// Output is Prettier-formatted, so `pnpm lint` passes over it.
//
//   node src/build.ts               build every mod, then `herdr-app check` each one
//   node src/build.ts --check       fail if the built files differ from what the sources produce
//   node src/build.ts --sync-types  refresh src/types/herdr.d.ts from the installed app

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";
import { format, resolveConfig } from "prettier";

const SRC = dirname(fileURLToPath(import.meta.url));
const APP = dirname(SRC);
const OUT = join(APP, "mods");

const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");

if (args.has("--sync-types")) {
  syncTypes();
  process.exit(0);
}

const problems: string[] = [];
const built: string[] = [];
/** "<mod>/<file>" whose content this build changed. */
const changed = new Set<string>();
for (const name of readdirSync(join(SRC, "mods")).sort()) {
  if (!existsSync(join(SRC, "mods", name, "main.ts"))) continue;
  const files = await buildMod(name);
  built.push(name);
  if (checkOnly) compare(name, files);
  else write(name, files);
}

if (problems.length) {
  for (const p of problems) console.error(p);
  console.error(`\n${problems.length} problem(s). Run \`pnpm build:herdr\` and commit the result.`);
  process.exit(1);
}

if (!checkOnly) {
  appCheck(built);
  linkLive(built);
  console.log(`Built ${built.length} mods into ${relative(process.cwd(), OUT) || "."}`);
} else {
  console.log(`${built.length} built mods match their sources.`);
}

/** Every file one mod's folder should hold, by path relative to it. */
async function buildMod(name: string): Promise<Map<string, string>> {
  const dir = join(SRC, "mods", name);
  const out = new Map<string, string>();
  for (const file of readdirSync(dir).sort()) {
    if (file === "mod.json" || file.endsWith(".svg"))
      out.set(file, readFileSync(join(dir, file), "utf8"));
  }
  out.set("main.js", await bundle(name, join(dir, "main.ts")));
  return out;
}

/** The mod and everything it imports from src as one ES module; Herdr's own modules stay imports. */
async function bundle(name: string, entry: string): Promise<string> {
  const result = await esbuild({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "esm",
    platform: "neutral",
    target: "es2022",
    external: ["gpui-kit", "gpui-base", "herdr"],
    legalComments: "none",
    charset: "utf8",
    logLevel: "silent",
    // Icons ride inside main.js (see shared/icons.ts).
    loader: { ".svg": "text" },
  });
  const js = result.outputFiles[0].text.replaceAll("__MOD__", name);
  const from = relative(APP, entry);
  const banner = `// Generated from ${from} and its imports by \`pnpm build:herdr\`. Edit the sources, not this file.\n`;
  const options = (await resolveConfig(entry)) ?? {};
  return format(banner + js, { ...options, filepath: join(OUT, name, "main.js") });
}

function write(name: string, files: Map<string, string>): void {
  const dir = join(OUT, name);
  for (const [file, text] of files) {
    const path = join(dir, file);
    if (!existsSync(path) || readFileSync(path, "utf8") !== text) changed.add(`${name}/${file}`);
  }
  rmSync(dir, { recursive: true, force: true });
  for (const [file, text] of files) {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
  }
}

function compare(name: string, files: Map<string, string>): void {
  const dir = join(OUT, name);
  for (const [file, text] of files) {
    const path = join(dir, file);
    if (!existsSync(path)) problems.push(`missing: mods/${name}/${file}`);
    else if (readFileSync(path, "utf8") !== text)
      problems.push(`out of date: mods/${name}/${file}`);
  }
  for (const file of listFiles(dir)) {
    if (!files.has(file)) problems.push(`not built from src: mods/${name}/${file}`);
  }
}

function listFiles(dir: string, prefix = ""): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name), `${prefix}${e.name}/`) : [`${prefix}${e.name}`],
  );
}

/** `herdr-app check` each built mod when the app is installed. */
function appCheck(names: string[]): void {
  try {
    execFileSync("herdr-app", ["--version"], { stdio: "ignore" });
  } catch {
    console.log("herdr-app is not installed here: skipped `herdr-app check`.");
    return;
  }
  // The check writes editor typings (gpui-kit.d.ts, jsconfig.json) into the folder it loads,
  // so it runs on a throwaway copy, never on the stowed files.
  const scratch = mkdtempSync(join(tmpdir(), "herdr-check-"));
  const failed = names.filter((name) => {
    const copy = join(scratch, name);
    cpSync(join(OUT, name), copy, { recursive: true });
    try {
      execFileSync("herdr-app", ["check", copy], { stdio: "pipe" });
      return false;
    } catch (e) {
      const err = e as { stdout?: Buffer; stderr?: Buffer };
      console.error(`herdr-app check mods/${name}:\n${err.stdout ?? ""}${err.stderr ?? ""}`);
      return true;
    }
  });
  rmSync(scratch, { recursive: true, force: true });
  if (failed.length) process.exit(1);
}

/**
 * Links new built files into the live app home the way stow (--no-folding) would, and removes
 * links left pointing at files the build no longer makes, so a build is live without restowing
 * the whole repo. Existing files are never replaced.
 *
 * Herdr watches ~/.config/herdr-app/mods, and rewriting a link's target in the repo changes
 * nothing there, so the link of every changed file is made again (an atomic rename beside it):
 * that is the event that reloads the running mod.
 */
function linkLive(names: string[]): void {
  const live = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");
  if (!existsSync(live) || realpathSync(live) === realpathSync(APP)) return;
  let made = 0;
  let pruned = 0;
  const reloaded = new Set<string>();
  for (const name of names) {
    const liveDir = join(live, "mods", name);
    for (const file of listFiles(join(OUT, name))) {
      const at = join(liveDir, file);
      const target = relative(dirname(at), join(OUT, name, file));
      let link: boolean | null = null;
      try {
        link = lstatSync(at).isSymbolicLink();
      } catch {
        // missing: link it below
      }
      if (link !== null) {
        if (link && changed.has(`${name}/${file}`)) {
          const temp = `${at}.relink`;
          rmSync(temp, { force: true });
          symlinkSync(target, temp);
          renameSync(temp, at);
          reloaded.add(name);
        }
        continue;
      }
      mkdirSync(dirname(at), { recursive: true });
      symlinkSync(target, at);
      made++;
    }
    for (const file of listFiles(liveDir)) {
      const at = join(liveDir, file);
      if (lstatSync(at).isSymbolicLink() && !existsSync(at)) {
        unlinkSync(at);
        pruned++;
      }
    }
  }
  if (made || pruned)
    console.log(
      `Linked ${made} new file(s) into ${live}/mods, removed ${pruned} dangling link(s).`,
    );
  if (reloaded.size) console.log(`Reloaded in Herdr: ${[...reloaded].sort().join(", ")}`);
}

function syncTypes(): void {
  const home = process.env.HERDR_APP_HOME ?? join(homedir(), ".config", "herdr-app");
  const from = join(home, "herdr.d.ts");
  const version = execFileSync("herdr-app", ["--version"], { encoding: "utf8" }).trim();
  const body = readFileSync(from, "utf8")
    .split("\n")
    .slice(2)
    .map((line) => (line ? `  ${line}` : line))
    .join("\n");
  const text = [
    `// Vendored from ~/.config/herdr-app/herdr.d.ts (${version.replace("herdr-app", "Herdr")}) by \`pnpm build:herdr --sync-types\`.`,
    "// Wrapped as an ambient module so the repo type-checks without the app installed.",
    'declare module "herdr" {',
    body.trimEnd(),
    "}",
    "",
  ].join("\n");
  writeFileSync(join(SRC, "types", "herdr.d.ts"), text);
  console.log(`Synced src/types/herdr.d.ts from ${from}`);
}

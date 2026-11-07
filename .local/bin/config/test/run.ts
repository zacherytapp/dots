// Runs a distro's install in a fresh container as a sudo-capable, non-root
// user, then `install.sh verify`. From the repo root:
//
//   pnpm test:install <arch|cachy|fedora|ubuntu|all> [step ...]
//
// The build context is the repo's tracked and untracked-but-not-ignored files,
// streamed with tar, so the container sees what a fresh clone (plus local
// edits) would have. Step names go to install.sh, so one step can be re-tested.
// Output goes to .local/bin/config/test/logs/<distro>[-mode].log.
//
//   IDEMPOTENCY=1  install twice and diff test/snapshot.sh taken after each run;
//                  anything the second run changed is a failure
//   PRESEED=1      start from an existing home (test/preseed.sh: rc files, git
//                  identity, ssh and gpg keys) and check what install.sh did with it
//   NO_VERIFY=1    skip verify, for step subsets that don't install everything
//
// Every mode also fails if the install modified any file in the repo checkout
// (other than the pacman hook's package lists).

import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { PassThrough } from "node:stream";
import { fileURLToPath } from "node:url";

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(TEST_DIR, "..", "..", "..", "..");
const DISTROS = ["arch", "cachy", "fedora", "ubuntu"] as const;
type Distro = (typeof DISTROS)[number];

const isDistro = (s: string): s is Distro => (DISTROS as readonly string[]).includes(s);

/** Runs inside the container as the test user, from ~/setup/.local/bin/config. */
const CONTAINER_SCRIPT = String.raw`
repo_sums() {
  (cd ~/setup && find . -type f -not -path './.local/bin/config/cachy/pkglist.*' -print0 |
    sort -z | xargs -0 sha256sum)
}
[ -z "$PRESEED" ] || ./test/preseed.sh seed || exit 1
repo_sums >/tmp/repo.before
# report every check rather than stopping at the first failure: a failed
# install still runs verify, so one run shows everything that is missing
rc=0
sudo -E ./install.sh "$@" || { echo "install: FAILED"; rc=1; }
if [ -n "$IDEMPOTENCY" ]; then
  ./test/snapshot.sh >/tmp/snap1
  echo "==== second run ===="
  sudo -E ./install.sh "$@" || { echo "install: second run FAILED"; rc=1; }
  ./test/snapshot.sh >/tmp/snap2
fi
if [ -z "$NO_VERIFY" ]; then
  ./install.sh verify || rc=1
fi
if [ -n "$PRESEED" ]; then
  ./test/preseed.sh check || rc=1
fi
if [ -n "$IDEMPOTENCY" ]; then
  if diff -u /tmp/snap1 /tmp/snap2; then
    echo "idempotency: second run changed nothing"
  else
    echo "idempotency: second run CHANGED state (diff above)"
    rc=1
  fi
fi
if diff -u /tmp/repo.before <(repo_sums); then
  echo "repo: install left the checkout unmodified"
else
  echo "repo: install MODIFIED files in the checkout (diff above)"
  rc=1
fi
exit "$rc"
`;

function repoFiles(): string[] {
  const res = spawnSync(
    "git",
    ["-C", REPO, "ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (res.status !== 0) throw new Error(`git ls-files failed: ${res.stderr}`);
  // staged deletions are still listed by --cached
  return res.stdout.split("\0").filter((f) => f && existsSync(join(REPO, f)));
}

function exitCode(child: ReturnType<typeof spawn>): Promise<number> {
  return new Promise((done) => child.on("close", (code) => done(code ?? 1)));
}

async function build(distro: Distro, log: NodeJS.WritableStream): Promise<boolean> {
  const dockerfile = `.local/bin/config/test/Dockerfile.${distro}`;
  const tar = spawn("tar", ["--null", "-T", "-", "-cf", "-"], {
    cwd: REPO,
    stdio: ["pipe", "pipe", "inherit"],
  });
  const docker = spawn(
    "docker",
    ["build", "-f", dockerfile, "-t", `dots-setup-test:${distro}`, "-"],
    {
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  tar.stdout.pipe(docker.stdin);
  docker.stdout.pipe(log, { end: false });
  docker.stderr.pipe(log, { end: false });
  tar.stdin.end(repoFiles().join("\0"));
  const [tarCode, dockerCode] = await Promise.all([exitCode(tar), exitCode(docker)]);
  return tarCode === 0 && dockerCode === 0;
}

async function test(distro: Distro, steps: string[], echo: boolean): Promise<boolean> {
  const env = process.env;
  const suffix = `${env.IDEMPOTENCY ? "-idempotency" : ""}${env.PRESEED ? "-preseed" : ""}`;
  mkdirSync(join(TEST_DIR, "logs"), { recursive: true });
  const logPath = join(TEST_DIR, "logs", `${distro}${suffix}.log`);
  const file = createWriteStream(logPath);
  const log = echo
    ? new PassThrough().on("data", (chunk: Buffer) => {
        process.stdout.write(chunk);
        file.write(chunk);
      })
    : file;

  const started = Date.now();
  let ok = await build(distro, log);
  if (ok) {
    const run = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--name",
        `dots-setup-test-${distro}${suffix}-${process.pid}`,
        "-e",
        `IDEMPOTENCY=${env.IDEMPOTENCY ?? ""}`,
        "-e",
        `PRESEED=${env.PRESEED ?? ""}`,
        "-e",
        `NO_VERIFY=${env.NO_VERIFY ?? ""}`,
        "-e",
        `SKIP_UPGRADE=${env.SKIP_UPGRADE ?? ""}`,
        "-e",
        "FORCE_COLOR=1",
        `dots-setup-test:${distro}`,
        "bash",
        "-c",
        CONTAINER_SCRIPT,
        "_",
        ...steps,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    run.stdout.pipe(log, { end: false });
    run.stderr.pipe(log, { end: false });
    ok = (await exitCode(run)) === 0;
  }
  await new Promise<void>((done) => file.end(done));
  const minutes = ((Date.now() - started) / 60000).toFixed(1);
  console.log(`${ok ? "PASS" : "FAIL"}: ${distro}${suffix} (${minutes} min, log: ${logPath})`);
  return ok;
}

async function main(argv: string[]): Promise<number> {
  const [target, ...steps] = argv;
  if (!target || !(target === "all" || isDistro(target))) {
    console.error(`usage: pnpm test:install <${DISTROS.join("|")}|all> [step ...]`);
    return 2;
  }
  const targets: Distro[] = target === "all" ? [...DISTROS] : [target];
  // one distro streams to the terminal; several run in parallel into their logs
  const results = await Promise.all(targets.map((d) => test(d, steps, targets.length === 1)));
  return results.every(Boolean) ? 0 : 1;
}

process.exitCode = await main(process.argv.slice(2));

// git identity, gpg/pass and ssh keys. Each only fills in what is missing, so
// a stowed ~/.gitconfig and existing keys are left alone.

import { realpathSync } from "node:fs";
import { join } from "node:path";
import { run, which } from "../lib/exec.ts";
import { exists } from "../lib/files.ts";
import { note, warn } from "../lib/log.ts";
import type { Context } from "../lib/context.ts";

export function configureGit(ctx: Context): void {
  const { user, settings } = ctx;
  // once stowed, ~/.gitconfig is the repo's file: the identity comes from it,
  // and `git config --global` would write into the checkout
  const gitconfig = user.path(".gitconfig");
  const repoConfig = join(ctx.repoDir, ".gitconfig");
  if (exists(gitconfig) && realpathSync(gitconfig) === realpathSync(repoConfig)) {
    note("~/.gitconfig is the repo's; git identity comes from it");
    // say so when the settings ask for a different identity than the repo's
    for (const [key, want] of [
      ["user.email", settings.userEmail],
      ["user.name", settings.userName],
    ] as const) {
      const have = user.capture("git", ["config", "--file", repoConfig, key]).stdout.trim();
      if (want && have !== want) {
        warn(`${key} is ${have || "unset"} in the repo's .gitconfig, not ${want}; set it per repo`);
      }
    }
    return;
  }
  const fill = (key: string, value: string) => {
    if (!value) return;
    if (user.succeeds("git", ["config", "--global", key])) return;
    user.run("git", ["config", "--global", key, value]);
    note(`git ${key} = ${value}`);
  };
  fill("init.defaultBranch", "main");
  fill("user.email", settings.userEmail);
  fill("user.name", settings.userName);
}

export function configureKeys(ctx: Context): void {
  const { user, settings } = ctx;
  if (!settings.userName || !settings.userEmail) {
    warn("skipped: USER_NAME/USER_EMAIL not set, not generating keys");
    return;
  }
  // `<email>` is an exact uid match; a bare email would match substrings
  const uid = `<${settings.userEmail}>`;
  if (!user.succeeds("gpg", ["--list-secret-keys", uid])) {
    user.run("gpg", ["--batch", "--full-generate-key"], {
      input: [
        "%no-protection",
        "Key-Type: rsa",
        "Key-Length: 4096",
        "Subkey-Type: rsa",
        "Subkey-Length: 4096",
        `Name-Real: ${settings.userName}`,
        `Name-Email: ${settings.userEmail}`,
        "Expire-Date: 0",
        "%commit",
        "",
      ].join("\n"),
    });
  } else {
    note(`gpg key for ${uid} already exists`);
  }

  if (!exists(user.path(".password-store", ".gpg-id"))) {
    const listing = user.output("gpg", ["--list-secret-keys", "--with-colons", uid]);
    const keyId = listing
      .split("\n")
      .find((l) => l.startsWith("sec:"))
      ?.split(":")[4];
    if (!keyId) throw new Error(`no gpg secret key for ${settings.userEmail}`);
    user.run("pass", ["init", keyId]);
  }

  const sshDir = user.path(".ssh");
  user.run("install", ["-d", "-m", "700", sshDir, user.path(".ssh", "control")]);
  const key = user.path(".ssh", "id_ed25519");
  if (!exists(key)) {
    user.run("ssh-keygen", [
      "-t",
      "ed25519",
      "-C",
      `${settings.userName} <${settings.userEmail}>`,
      "-f",
      key,
      "-N",
      "",
      "-q",
    ]);
  }
}

/** usermod rather than chsh: it works without PAM, including in containers. */
export function setLoginShellZsh(ctx: Context): void {
  const zsh = which("zsh");
  if (!zsh) throw new Error("zsh is not installed");
  if (ctx.user.shell() === zsh) return note(`login shell already ${zsh}`);
  run("usermod", ["-s", zsh, ctx.user.name]);
  note(`login shell set to ${zsh}`);
}

/**
 * oh-my-zsh, powerlevel10k and the two plugins .zshrc loads when
 * cachyos-zsh-config is absent. KEEP_ZSHRC: ~/.zshrc is the stowed one.
 */
export function installOhMyZsh(ctx: Context): void {
  const { user } = ctx;
  const custom = user.path(".oh-my-zsh", "custom");
  // oh-my-zsh.sh, not the dir: a failed run can leave ~/.oh-my-zsh behind.
  // Skipping on the dir would hide that; this way the installer stops with
  // "The $ZSH folder already exists" and the run fails until it is removed
  if (!exists(user.path(".oh-my-zsh", "oh-my-zsh.sh"))) {
    user.installScript(
      "https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh",
      {
        args: ["--unattended", "--keep-zshrc"],
        env: { RUNZSH: "no", CHSH: "no", KEEP_ZSHRC: "yes" },
      },
    );
  }
  const clones: Array<[string, string]> = [
    ["https://github.com/romkatv/powerlevel10k.git", `${custom}/themes/powerlevel10k`],
    ["https://github.com/zsh-users/zsh-autosuggestions", `${custom}/plugins/zsh-autosuggestions`],
    [
      "https://github.com/zsh-users/zsh-syntax-highlighting.git",
      `${custom}/plugins/zsh-syntax-highlighting`,
    ],
  ];
  for (const [url, dir] of clones) {
    if (exists(dir)) continue;
    user.run("git", ["clone", "--quiet", "--depth", "1", url, dir]);
  }
  const settings = `${custom}/autosuggestion-settings.zsh`;
  const line = "bindkey '^ ' autosuggest-accept\n";
  if (user.readFile(settings) !== line) user.writeFile(settings, line);
}

/** tmux.conf runs ~/.tmux/plugins/tpm/tpm; plugins install with prefix + I. */
export function installTpm(ctx: Context): void {
  const dir = ctx.user.path(".tmux", "plugins", "tpm");
  if (exists(dir)) return note(`tpm already installed in ${dir}`);
  ctx.user.run("git", [
    "clone",
    "--quiet",
    "--depth",
    "1",
    "https://github.com/tmux-plugins/tpm",
    dir,
  ]);
}

# Zakk's Dotfiles

Work directly on `main`; don't create worktrees or branches.

## Layout

The repo is a GNU Stow package that mirrors `$HOME` (`.stowrc`: `--target=~ --no-folding`). Every tracked file gets linked into `$HOME` unless `.stow-local-ignore` excludes it, so add any new repo-only file there.

- `.agents/`: shared skills and hooks. Its `AGENTS.md` holds the conventions and the local skill inventory that `check:skills` validates.
- `.claude/`: Claude Code settings, TypeScript hooks (`hooks/`), global rules (`rules/`) and skill links, all stowed to `~/.claude`.
- `.local/bin/config/`: the machine installer, never stowed. `install.sh` bootstraps Node, then runs `src/main.ts`. Put shared steps in `src/steps/` and distro-specific ones in `src/distros/<distro>.ts`. Shell is only for the bootstrap and the Docker test fixtures.
- `.config/herdr-app/src/`: Herdr mod sources, never stowed. Edit them, then run `pnpm build:herdr` to rebuild `.config/herdr-app/mods/`. Never hand-edit a built `main.js`.

## Guidelines

- Write automation in TypeScript run by Node 24+, not bash or Python.
- Use pnpm. All tooling (`package.json`, `tsconfig.json`, Prettier and markdownlint configs) lives at the repo root. Don't add per-directory manifests, lockfiles or formatter configs. The exceptions are `.config/nvim/.stylua.toml` and `.luarc.json`, which must sit beside the Neovim config, and `.config/nvim/snippets/package.json`, which is a snippet manifest.
- Before finishing, run `pnpm check`. It needs `jq` and ShellCheck, and covers lint, typecheck, tests, JSON, skills, shell scripts and the built Herdr mods. The individual scripts are in `package.json`.
- `pnpm test:install <arch|cachy|fedora|ubuntu|all>` runs the installer in Docker. It's slow and not part of `check`.

## Formatting

- Prettier: `printWidth: 100`, `proseWrap: preserve`, double quotes. `.prettierignore` is the single ignore file, and markdownlint reads it too.
- `README.md` and `.config/nvim/README.md` are hand-formatted and left out of Prettier on purpose.
- Vendored skills are ignored as well. `check:skills` fails if that ignore list drifts from `.agents/.skill-lock.json`.

// parseConflicts against what stow 2.3 and 2.4 actually print for `stow -n`.

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseConflicts } from "./dotfiles.ts";

test("stow 2.4 conflicts", () => {
  const stderr = `WARNING! stowing . would cause conflicts:
  * cannot stow ../pkg/.bashrc over existing target .bashrc since neither a link nor a directory and --adopt not specified
  * cannot stow ../pkg/.config/app/conf over existing target .config/app/conf since neither a link nor a directory and --adopt not specified
  * cannot stow non-directory ../pkg/.claude/skills/x over existing directory target .claude/skills/x
  * cannot stow directory ../pkg/dir over existing non-directory target dir
  * existing target is not owned by stow: linkconf
  * existing target is stowed to a different package: .zshrc => ../other/.zshrc
All operations aborted.
`;
  assert.deepEqual(parseConflicts(stderr), [
    ".bashrc",
    ".config/app/conf",
    ".claude/skills/x",
    "dir",
    "linkconf",
    ".zshrc",
  ]);
});

test("stow 2.3 conflicts", () => {
  const stderr = `WARNING! stowing . would cause conflicts:
  * existing target is neither a link nor a directory: .bashrc
  * existing target is not owned by stow: .config/kitty/kitty.conf
All operations aborted.
`;
  assert.deepEqual(parseConflicts(stderr), [".bashrc", ".config/kitty/kitty.conf"]);
});

test("errors that aren't target conflicts", () => {
  assert.deepEqual(parseConflicts("  * source is an absolute symlink ./x => /etc/x\n"), []);
  assert.deepEqual(parseConflicts("stow: ERROR: no such directory\n"), []);
});

test("paths with spaces", () => {
  const stderr = `  * cannot stow ../pkg/.config/My App/conf over existing target .config/My App/conf since neither a link nor a directory and --adopt not specified
  * existing target is not owned by stow: .config/a b
  * existing target is stowed to a different package: .x y => ../other/.x y
  * existing target is neither a link nor a directory: .config/c d
`;
  assert.deepEqual(parseConflicts(stderr), [
    ".config/My App/conf",
    ".config/a b",
    ".x y",
    ".config/c d",
  ]);
});

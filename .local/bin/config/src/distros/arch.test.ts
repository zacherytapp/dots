// The pacman hook Exec line: what libalpm's word splitting and sh then see.

import assert from "node:assert/strict";
import { test } from "node:test";
import { renderPaclistHook } from "./arch.ts";

const TEMPLATE = `Exec = /usr/bin/runuser -u @USER@ -- /bin/sh -c 'grep -vxFf "$2/i" > "$1/a"' paclist @DIR@ @HOME@\n`;

test("quotes the dir as one Exec word", () => {
  assert.equal(
    renderPaclistHook(TEMPLATE, "/home/me/my dots/x", "me", "/home/me"),
    `Exec = /usr/bin/runuser -u me -- /bin/sh -c 'grep -vxFf "$2/i" > "$1/a"' paclist "/home/me/my dots/x" "/home/me"\n`,
  );
});

test("keeps single quotes and shell metacharacters out of the script", () => {
  const out = renderPaclistHook(TEMPLATE, "/home/me/it's $(x)", "me", "/home/me");
  assert.ok(out.endsWith(`paclist "/home/me/it's $(x)" "/home/me"\n`));
});

test("refuses what pacman can't pass through", () => {
  for (const dir of ['/a"b', "/a\\b", "/a\nb"]) {
    assert.throws(() => renderPaclistHook(TEMPLATE, dir, "me", "/home/me"));
    assert.throws(() => renderPaclistHook(TEMPLATE, "/x", "me", dir));
  }
  assert.throws(() => renderPaclistHook(TEMPLATE, "/x", "me; rm", "/home/me"));
});

# Herdr mods

TypeScript sources for every mod in `../mods/`, laid out like
[herdr-mission-control](https://github.com/CiprianSpiridon/herdr-mission-control/tree/main/mission-control):
one folder per mod under `mods/`, shared code in `shared/`, icons in `assets/`. This folder is
stow-ignored; only the built `../mods/<name>/` folders are linked into `~/.config/herdr-app`.

```bash
pnpm build:herdr                # bundle every mod, `herdr-app check` each, link new files live
pnpm check:herdr                # fail if ../mods is stale (part of `pnpm check`)
pnpm build:herdr --sync-types   # refresh types/herdr.d.ts after a Herdr update
```

Herdr refuses a module whose real path is outside its mod folder, and stow makes every file a
symlink into this repo, so each mod is bundled by esbuild into a single `main.js`. Icons ride
inside it too: `shared/icons.ts` writes them into the live mod folder (`mods/<name>/icons/`, not
in the repo) the first time they're drawn, because Herdr won't draw a symlinked SVG either.
After adding an SVG to `assets/`, add it to `shared/icon-data.ts`.

## Mods

| Mod                | Where                          | What                                                                                                            |
| ------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `mc-tabs`          | top bar, panel strip           | Space chip, tab pills (index, program icon, title, folder · branch, panes, working time), panel source buttons  |
| `mc-spaces`        | sidebar, top                   | Spaces by machine with search; sizes itself to its rows so Agents gets the rest                                 |
| `mc-agents`        | sidebar, below Spaces          | Every agent and open Claude Code background job on every machine; notifies when one needs you                   |
| `mc-github-issues` | panel `issues`                 | GitHub issues board (via `gh`)                                                                                  |
| `mc-pulls`         | panel `pulls`                  | GitHub and Forgejo pull requests with checks and reviews; Review / Address comments / Fix checks start an agent |
| `mc-branches`      | panel `branches`               | Local and remote branches together: local only, remote only or synced, ahead/behind, the PR on each             |
| `mc-forgejo`       | panel `forgejo`                | Forgejo issues board                                                                                            |
| `mc-jira`          | panel `jira`                   | Jira issues board                                                                                               |
| `mc-sessions`      | panel `sessions`               | Previous Claude Code sessions from every machine, resumable                                                     |
| `tmux-status`      | top bar, right                 | tmux status-right: zoom, cpu / temperature / battery, clock                                                     |
| others             | `mod.open:<name>` in keys.json | One-shot actions: `cht`, `sessionizer*`, `goto-*`                                                               |

The panel also keeps Herdr's own `files` and `changes` (diff and commit). Each space remembers
which source it had open. Bind `mc-tabs.panel`, `mc-tabs.expand` or `mc-tabs.source-<id>` in
`keys.json` to drive it from the keyboard.

## Settings: `../mission-control.json`

Read by the mods, never written, and never holds a token. A token is found, in order, from
`tokenCommand` (argv that prints it, e.g. `["pass", "show", "forgejo"]`), `tokenEnv` (Herdr's
environment, then your login shell's), or one pasted into the panel, which asks when a token is
missing or refused. Pasted tokens go to `~/.config/herdr-app/mission-control/<service>.token`
(folder 700, file 600): in the live app home only, never in this repo.

- `forgejo.url`: the server's web URL. `sshHosts`: other hosts its remotes use.
- `jira.site`, `jira.email` (Cloud), `jira.auth` (`basic` for Cloud, `bearer` for Server / Data
  Center), `jira.jql` (All spaces), `jira.projects` (`"owner/repo": "KEY"` for This space).
- `agent.argv` / `agent.resume`: the default agent, and how sessions resume.
- `issueActions`: the buttons on issue cards (`label`, `skill`, optional `prompt`, `agent`).
- `agents`: per agent, `argv` to start it and `skill`, its skill command template.
- `sessions.days` / `sessions.limit`: how far back Previous sessions looks on each machine.

## Agent state

Herdr's `agents()` lists only terminals that report a status. Claude Code started from a shell
reports none, so `mc-agents` also lists every pane whose program is an agent and reads its state
from two live sources. Its terminal title changes the instant a turn starts or ends (a spinner,
◐◓◑◒ or braille, while working; ✳ when idle), so it decides working vs idle. Claude Code's job
record (`~/.claude/jobs/<id>/state.json` on that machine) alone knows it is waiting for you
(`blocked`: a permission prompt keeps the spinner going), so that wins; it also gives the current
activity and the session. With no mark in the title, the job decides. This computer's job
records are watched, so a change shows at once; other machines' are read every 3 s, each on its
own. A pane is matched to its job by the session name in its terminal title (not a tab name you
gave it), in the same folder or one inside the other; the only open job in a folder goes to a
pane only when it is the only unmatched pane there.

Jobs not yet closed out (not done or failed) and not shown by a pane are listed too: current ones
by priority, stopped ones and those untouched for a week in folded groups. When a row starts
waiting for you, a notification says so (Herdr already does this for agents that report status).
Context comes from the exact session file when the job is known, else from the folder's newest
session only when one Claude agent is there. Its last reply also gives the model and the reasoning
effort it ran at (`Context 104k · opus 5.5 · high effort`), read every 15 s.

## Issue cards

Each GitHub, Forgejo and Jira card shows the tracker's status (tinted by its column), its labels
in their own colors, a comment count, and the open work on it: pull requests that close or
mention it, and remote branches named after it (`fix/12-login`, `WEB-142-form`), each linking to
the remote. A pull request's chip carries its checks (passing, failing, running).

Each card has a button per entry in `issueActions` (default: Review issue, Implement, Review
code). A button opens a new tab in the issue's space running the agent open in the main window
(the focused pane's, else one in the shown tab or space, else `agent.argv`), and types that
agent's skill command and the issue link: `/review-issue <url>` for Claude and opencode,
`/skill:review-issue <url>` for pi (`agents.<name>.skill`). Clicking again shows that tab.
An action can set its own `prompt` (placeholders `{command}`, `{skill}`, `{url}`, `{key}`,
`{title}`, `{repo}`, `{pulls}`) or always use one `agent`. The comment count sits in the
card's bottom-right corner.

Status comes from, in order: the issue's Status in a GitHub Project (needs the `read:project`
scope: `gh auth refresh -s read:project`; without it this is skipped), a status label
(`status/in-progress`, `Status: Review`, `state::blocked`), or Open / Closed / Not planned /
Duplicate. A status also decides the card's column.

## Branches

Remote branches come from `git ls-remote` on the space's own machine (non-interactive ssh), so
they are current and use that machine's own git access; a remote it can't reach falls back to
what its last fetch saw, with a warning in the footer.

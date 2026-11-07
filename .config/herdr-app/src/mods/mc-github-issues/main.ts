// GitHub issues as a board: the shown space's repo (This space) or every issue involving you
// (All spaces), open ones plus those closed in the last two weeks. Data from `gh` (shared/github).

import type { SpaceInfo } from "herdr";
import { BoardView } from "../../shared/board.ts";
import type { BoardItem } from "../../shared/board-model.ts";
import { loadIssues } from "../../shared/github.ts";
import type { Loaded, Scope } from "../../shared/list-view.ts";
import { targetsFor, withWork } from "../../shared/work.ts";

export default class GithubIssues extends BoardView {
  source(): string {
    return "issues";
  }

  placeholder(): string {
    return "Search GitHub issues";
  }

  async fetch(scope: Scope, space: SpaceInfo | null): Promise<Loaded<BoardItem>> {
    const loaded = await loadIssues(scope, space);
    if (!loaded.items?.length) return loaded;
    const { items, warning } = await withWork(
      loaded.items,
      targetsFor(loaded.items, "github"),
      null,
    );
    return { ...loaded, items, warning: warning ?? loaded.warning };
  }
}

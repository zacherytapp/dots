// Shows the "editor" tab of the shown space, making it if missing (tmux `select-window -t :editor`).
import { gotoTab } from "../../shared/actions.ts";

export default gotoTab("editor");

// Shows the "deploy" tab of the shown space, making it if missing (tmux `select-window -t :deploy`).
import { gotoTab } from "../../shared/actions.ts";

export default gotoTab("deploy");

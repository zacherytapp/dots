// Shows the "logs" tab of the shown space, making it if missing (tmux `select-window -t :logs`).
import { gotoTab } from "../../shared/actions.ts";

export default gotoTab("logs");

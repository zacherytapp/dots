// Opens (or focuses) the ~/Projects/bank space (tmux `run-shell tmux-sessionizer ~/Projects/bank/`).
import { home } from "herdr";
import { runScript } from "../../shared/actions.ts";

export default runScript("sessionizer-bank", "sessionizer.sh", () => [`${home()}/Projects/bank`]);

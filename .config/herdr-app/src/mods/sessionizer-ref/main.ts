// Opens (or focuses) the ~/Projects/ref space (tmux `run-shell tmux-sessionizer ~/Projects/ref/`).
import { home } from "herdr";
import { runScript } from "../../shared/actions.ts";

export default runScript("sessionizer-ref", "sessionizer.sh", () => [`${home()}/Projects/ref`]);

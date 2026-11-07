// ctrl-space f: the project sessionizer in a popup (tmux `display-popup -E`).
import { popupScript } from "../../shared/actions.ts";

export default popupScript("sessionizer", "sessionizer.sh", { width: 0.7, height: 0.6 });

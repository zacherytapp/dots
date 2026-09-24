# File length limit hook

Implemented locally in [`safety-hook.sh`](safety-hook.sh) under the
`PreToolUse` / `Edit|Write` handlers.

Source files over `MAX_FILE_LINES` lines trigger a speed bump asking the agent
to pause and confirm whether to refactor or proceed. Default `MAX_FILE_LINES` is
`10000` and can be overridden in the environment.

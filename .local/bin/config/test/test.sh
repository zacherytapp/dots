#!/usr/bin/env bash
# Run a distro's setup in a fresh container as a sudo-capable, non-root user.
#
#   .local/bin/config/test/test.sh <fedora|ubuntu|cachy> [step ...]
#
# Step names are passed through to run.sh so a single step can be re-tested.
# Output is written to .local/bin/config/test/logs/<distro>.log.
set -euo pipefail

TEST_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
SETUP_DIR=$(dirname "$TEST_DIR")

distro="${1:?usage: test.sh <fedora|ubuntu|cachy> [step ...]}"
shift
dockerfile="$TEST_DIR/Dockerfile.$distro"
image="dots-setup-test:$distro"

if [ ! -f "$dockerfile" ]; then
  echo "no Dockerfile for '$distro' at $dockerfile" >&2
  exit 1
fi

mkdir -p "$TEST_DIR/logs"
log="$TEST_DIR/logs/$distro.log"

docker build -f "$dockerfile" -t "$image" "$SETUP_DIR"

# run.sh takes optional step names; verify.sh checks the result
docker run --rm --name "dots-setup-test-$distro" "$image" \
  bash -c 'sudo -E "./$DISTRO/run.sh" "$@" && "./$DISTRO/verify.sh"' _ "$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}

if [ "$status" -eq 0 ]; then
  echo "PASS: $distro"
else
  echo "FAIL: $distro (exit $status, log: $log)"
fi
exit "$status"

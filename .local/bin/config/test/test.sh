#!/usr/bin/env bash
# Run a distro's setup in a fresh container as a sudo-capable, non-root user.
#
#   .local/bin/config/test/test.sh <fedora|ubuntu|cachy> [step ...]
#
# Step names are passed through to run.sh so a single step can be re-tested.
# Output is written to .local/bin/config/test/logs/<distro>.log.
#
#   IDEMPOTENCY=1  run run.sh twice and diff test/snapshot.sh taken after each
#                  run; anything the second run changed is a failure
#   PRESEED=1      start from an existing home (test/preseed.sh: rc files, git
#                  identity, ssh and gpg keys) and fail if run.sh changed it
#   NO_VERIFY=1    skip verify.sh, for step subsets that don't install everything
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

# distinct names so modes can run in parallel
suffix="${IDEMPOTENCY:+-idempotency}${PRESEED:+-preseed}"
mkdir -p "$TEST_DIR/logs"
log="$TEST_DIR/logs/$distro$suffix.log"

docker build -f "$dockerfile" -t "$image" "$SETUP_DIR"

# run.sh takes optional step names; verify.sh checks the result
# shellcheck disable=SC2016 # expanded inside the container
script='
[ -z "$PRESEED" ] || ./test/preseed.sh seed || exit 1
sudo -E "./$DISTRO/run.sh" "$@" || exit 1
if [ -n "$IDEMPOTENCY" ]; then
  ./test/snapshot.sh >/tmp/snap1
  echo "==== second run ===="
  sudo -E "./$DISTRO/run.sh" "$@" || exit 1
  ./test/snapshot.sh >/tmp/snap2
fi
# report every check rather than stopping at the first failure
rc=0
if [ -z "$NO_VERIFY" ]; then
  "./$DISTRO/verify.sh" || rc=1
fi
if [ -n "$PRESEED" ]; then
  ./test/preseed.sh check || rc=1
fi
if [ -n "$IDEMPOTENCY" ]; then
  if diff -u /tmp/snap1 /tmp/snap2; then
    echo "idempotency: second run changed nothing"
  else
    echo "idempotency: second run CHANGED state (diff above)"
    rc=1
  fi
fi
exit "$rc"
'
# errexit off so a failed run still reaches the FAIL line
set +e
docker run --rm --name "dots-setup-test-$distro$suffix-$$" \
  -e IDEMPOTENCY="${IDEMPOTENCY:-}" -e PRESEED="${PRESEED:-}" -e NO_VERIFY="${NO_VERIFY:-}" -e SKIP_UPGRADE \
  "$image" bash -c "$script" _ "$@" 2>&1 | tee "$log"
status=${PIPESTATUS[0]}
set -e

if [ "$status" -eq 0 ]; then
  echo "PASS: $distro"
else
  echo "FAIL: $distro (exit $status, log: $log)"
fi
exit "$status"

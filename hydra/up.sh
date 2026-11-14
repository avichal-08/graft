#!/usr/bin/env bash
# starts graph-node detached and waits for the listeners. safe to re-run.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
log="${HYDRA_LOG:-$HOME/.graft-hydra.log}"
if pgrep -f 'bin/graph-node' >/dev/null; then echo "already running"; exit 0; fi
setsid nohup bash "$here/start.sh" >"$log" 2>&1 < /dev/null &
for _ in $(seq 1 60); do
  grep -q 'listeners started' "$log" 2>/dev/null && { echo "up"; exit 0; }
  sleep 1
done
echo "did not start, see $log"; tail -5 "$log"; exit 1

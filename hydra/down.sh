#!/usr/bin/env bash
# stops graph-node and waits for it to exit
pkill -f 'bin/graph-node' || exit 0
for _ in $(seq 1 30); do pgrep -f 'bin/graph-node' >/dev/null || { echo "stopped"; exit 0; }; sleep 1; done
pkill -9 -f 'bin/graph-node'; echo "killed"

#!/usr/bin/env bash
# runs the published hydradb graph-node without docker or root.
# the image rootfs comes from fetch.py; its own loader and libs are used.
set -euo pipefail

tag="${HYDRA_TAG:-0.4.0}"
rt="${HYDRA_RT:-$HOME/hydra-rt}"
data="${HYDRA_DATA:-$HOME/.graft-hydra}"
here="$(cd "$(dirname "$0")" && pwd)"

if [ ! -x "$rt/usr/local/bin/graph-node" ]; then
  python3 "$here/fetch.py" "$tag" "$rt"
fi

# the local filesystem object store can't do the conditional updates a writer
# needs to reopen an existing store, so local runs start clean. point
# CLOUD_PROVIDER=aws at s3 or minio to keep data across restarts.
if [ "${HYDRA_KEEP:-0}" != 1 ]; then rm -rf "$data/store" "$data/cache"; fi
mkdir -p "$data/store" "$data/cache"
[ -f "$data/auth-token" ] || printf '%s\n' 'local-development-token-32-bytes' > "$data/auth-token"

export CLOUD_PROVIDER=local
export LOCAL_PATH="$data/store"
export GRAPH_NAMESPACE=default GRAPH_ID=default GRAPH_CELL_ID=cell-0 GRAPH_CELLS=cell-0 GRAPH_NODE_ID=node-0
export GRAPH_BOLT_NODE_ADDRESSES=node-0=127.0.0.1:7687
export GRAPH_ADVERTISED_BOLT_ADDR=127.0.0.1:7687
export GRAPH_DATA_CACHE_DIR="$data/cache"
export GRAPH_AUTH_TOKEN_FILE="$data/auth-token"
export GRAPH_ALLOW_PLAINTEXT=true
export RUST_MIN_STACK=33554432
export GRAPH_USAGE_REPORT_ENABLED=false
export RUST_LOG="${RUST_LOG:-info}"

libs="$rt/usr/lib/x86_64-linux-gnu:$rt/lib/x86_64-linux-gnu:$rt/usr/local/lib"
exec "$rt/usr/lib64/ld-linux-x86-64.so.2" --library-path "$libs" "$rt/usr/local/bin/graph-node" "$@"

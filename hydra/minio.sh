#!/usr/bin/env bash
# local s3 for hydradb: a minio container on :9100 (console :9101) with a
# named volume, plus the graft bucket. run from a shell that has docker.
set -euo pipefail
user="${HYDRA_S3_KEY:-graft}"
pass="${HYDRA_S3_SECRET:-graft-local-secret}"
docker network create graft >/dev/null 2>&1 || true
if ! docker ps --format '{{.Names}}' | grep -qx graft-minio; then
  docker rm -f graft-minio >/dev/null 2>&1 || true
  docker run -d --name graft-minio --network graft --restart unless-stopped --user 0:0 \
    -p 9100:9000 -p 9101:9001 -v graft-minio-data:/data \
    -e MINIO_ROOT_USER="$user" -e MINIO_ROOT_PASSWORD="$pass" \
    cgr.dev/chainguard/minio:latest server /data --console-address :9001 >/dev/null
  sleep 4
fi
docker run --rm --network graft -e MC_HOST_g="http://$user:$pass@graft-minio:9000" \
  cgr.dev/chainguard/minio-client:latest mb --ignore-existing g/graft

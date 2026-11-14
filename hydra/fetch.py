import json, os, sys, tarfile, urllib.request
repo, tag, out = "hydra-db/hydradb", sys.argv[1], os.path.expanduser(sys.argv[2])
def get(url, tok=None, accept=None):
    h = {}
    if tok: h["Authorization"] = "Bearer " + tok
    if accept: h["Accept"] = accept
    return urllib.request.urlopen(urllib.request.Request(url, headers=h))
tok = json.load(get(f"https://ghcr.io/token?scope=repository:{repo}:pull"))["token"]
acc = ",".join(["application/vnd.oci.image.index.v1+json","application/vnd.docker.distribution.manifest.list.v2+json",
                "application/vnd.oci.image.manifest.v1+json","application/vnd.docker.distribution.manifest.v2+json"])
m = json.load(get(f"https://ghcr.io/v2/{repo}/manifests/{tag}", tok, acc))
if "manifests" in m:
    d = [x for x in m["manifests"] if x.get("platform",{}).get("architecture")=="amd64" and x["platform"].get("os")=="linux"][0]["digest"]
    m = json.load(get(f"https://ghcr.io/v2/{repo}/manifests/{d}", tok, acc))
os.makedirs(out, exist_ok=True)
for i, l in enumerate(m["layers"]):
    p = f"/tmp/layer{i}.tgz"
    print(f"layer {i} {l['size']//1048576} MB", flush=True)
    with get(f"https://ghcr.io/v2/{repo}/blobs/{l['digest']}", tok) as r, open(p, "wb") as f:
        while (b := r.read(1 << 20)): f.write(b)
    with tarfile.open(p) as t:
        for mem in t.getmembers():
            if mem.isdev() or os.path.basename(mem.name).startswith(".wh."): continue
            try: t.extract(mem, out, filter="tar")
            except Exception: pass
    os.remove(p)
cfg = json.load(get(f"https://ghcr.io/v2/{repo}/blobs/{m['config']['digest']}", tok))
print("entrypoint", cfg["config"].get("Entrypoint"), "env", cfg["config"].get("Env"))

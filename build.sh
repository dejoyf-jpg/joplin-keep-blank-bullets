#!/usr/bin/env bash
# Pack src/ into publish/. A .jpl is a plain tar. The fixed order, owner and time make
# the archive byte-identical wherever it is built.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
id="com.dejoyf.keepBlankBullets"
mkdir -p "$here/publish"
node --check "$here/src/keepBlankBullets.js"
tar --sort=name --owner=0 --group=0 --numeric-owner --mtime='2026-01-01 00:00:00 UTC' \
  -C "$here/src" -cf "$here/publish/$id.jpl" manifest.json index.js richTextBridge.js keepBlankBullets.js
python3 - "$here" "$id" <<'PY'
import hashlib, json, subprocess, sys
here, pid = sys.argv[1], sys.argv[2]
manifest = json.load(open(f"{here}/src/manifest.json"))
manifest["_publish_hash"] = "sha256:" + hashlib.sha256(open(f"{here}/publish/{pid}.jpl", "rb").read()).hexdigest()
try:
    commit = subprocess.check_output(["git", "-C", here, "rev-parse", "HEAD"], stderr=subprocess.DEVNULL).decode().strip()
    manifest["_publish_commit"] = "main:" + commit
except Exception:
    pass
json.dump(manifest, open(f"{here}/publish/{pid}.json", "w"), indent="\t")
print(manifest["version"], manifest["_publish_hash"])
PY

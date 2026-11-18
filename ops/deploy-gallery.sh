#!/usr/bin/env bash
set -euo pipefail

# Usage: ops/deploy-gallery.sh
# Builds and (re)starts the Glaze Looks gallery server on loothing-vps from this committed tree: stages the files its
# image needs (server/Dockerfile's layout), copies them to /opt/glaze-gallery, builds the image there and replaces the
# container. The database is in the glaze-gallery volume and survives. /etc/glaze-gallery.env must already exist on
# the server (mode 600; docs/looks-gallery.md). The same server runs frostdev HQ (/hq, docs/hq.md), which reads the
# numbers ops/deploy-stats.sh's collection writes to /var/lib/frostdev-stats/out, mounted read-only. nginx is separate:
# the locations in ops/public-site.nginx.conf. Run after ops/deploy.sh when curated entries change, so both agree.
[[ $# -eq 0 ]] || { echo "This script takes no arguments." >&2; exit 1; }
cd "$(dirname "$0")/.."
[[ -z $(git status --porcelain --untracked-files=all) ]] || {
    echo "Deploy from a clean, committed tree, including untracked files." >&2
    exit 1
}
# Glaze's files must come from a release tag. A development copy (scripts/vendor-glaze.sh --dev, VERSION "local <sha>")
# is for testing a branch before a Glaze release has the code it needs, and never ships.
grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' vendor/glaze/VERSION || {
    echo "vendor/glaze is \"$(cat vendor/glaze/VERSION)\", not a Glaze release tag; run scripts/vendor-glaze.sh <tag>." >&2
    exit 1
}
node scripts/looks.mjs
npm run test:gallery
host=loothing-vps
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/scripts" "$stage/vendor" "$stage/src/data"
cp server/gallery.mjs server/mod-shell.mjs server/Dockerfile server/package.json server/package-lock.json "$stage/"
cp server/gallery-admin.mjs "$stage/"
cp -R server/admin "$stage/admin"
cp scripts/looks.mjs "$stage/scripts/"
cp -R vendor/glaze "$stage/vendor/"
cp -R src/data/looks "$stage/src/data/"
ssh "$host" 'mkdir -p /opt/glaze-gallery && test -f /etc/glaze-gallery.env' || {
    echo "Create /etc/glaze-gallery.env (mode 600) on $host first." >&2
    exit 1
}
rsync -a --delete "$stage/" "$host:/opt/glaze-gallery/"
ssh "$host" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/glaze-gallery
docker build -t glaze-gallery .
# HQ's numbers: the collection's output, read-only (an empty folder until ops/deploy-stats.sh has run)
install -d -o 1000 -g 1000 -m 750 /var/lib/frostdev-stats
install -d -o 1000 -g 1000 -m 755 /var/lib/frostdev-stats/out
docker rm -f glaze-gallery >/dev/null 2>&1 || true
docker run -d --name glaze-gallery --restart unless-stopped --network host -v glaze-gallery:/data \
    -v /var/lib/frostdev-stats/out:/stats:ro -e STATS_DIR=/stats \
    --env-file /etc/glaze-gallery.env glaze-gallery
for _ in 1 2 3 4 5 6 7 8 9 10; do
    curl -fsS http://127.0.0.1:8788/glaze/looks/api/looks >/dev/null && { echo "Glaze Looks gallery is up"; exit 0; }
    sleep 1
done
echo "The gallery server didn't answer; see docker logs glaze-gallery" >&2
exit 1
REMOTE

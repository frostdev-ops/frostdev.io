#!/usr/bin/env bash
set -euo pipefail

# Usage: ops/deploy.sh [deploy|stage|activate]
# First integration: stage, install the nginx include with a staged current
# symlink, validate/reload nginx, then activate to verify the public routing.
# This script only changes /opt/frostdev-public; nginx integration is separate.
mode=${1:-deploy}
case "$mode" in deploy|stage|activate) ;; *) echo "Usage: $0 [deploy|stage|activate]" >&2; exit 1 ;; esac
[[ $# -le 1 ]] || { echo "This script takes only a mode." >&2; exit 1; }
cd "$(dirname "$0")/.."
[[ -z $(git status --porcelain --untracked-files=all) ]] || {
    echo "Deploy from a clean, committed tree, including untracked files." >&2
    exit 1
}
revision=$(git rev-parse HEAD)
[[ $revision =~ ^[0-9a-f]{40}$ ]] || exit 1
host=loothing-vps
base=/opt/frostdev-public
release=$base/releases/$revision

if [[ $mode != activate ]]; then
    npm ci
    npm run check
    npm run build
    node --input-type=module <<'NODE'
import assert from 'node:assert/strict';
import { readdirSync, statSync, lstatSync } from 'node:fs';
const pages = ['', 'rimeward', 'rimewire', 'crosspane', 'glaze', 'glaze/privacy', 'glaze/terms', 'glaze/looks', 'glaze/looks/submit', 'privacy', 'guides',
  'guides/rimeward-first-workspace', 'guides/crosspane-two-computers',
  'guides/rimewire-agent-handoffs', 'guides/frostsim-first-simulation',
  'guides/loothing-raid-loot', 'guides/glaze-safari', 'guides/glaze-chrome'];
for (const page of pages) assert(statSync(`dist/${page ? page + '/' : ''}index.html`).size > 0);
for (const file of ['robots.txt', 'sitemap.xml', 'ads.txt']) assert(statSync(`dist/${file}`).size > 0);
assert(statSync('dist/_site').isDirectory());
const allowed = new Set(['index.html', '404.html', 'rimeward', 'rimewire', 'crosspane', 'glaze',
  'privacy', 'guides', '_site', 'projects', 'robots.txt', 'sitemap.xml', 'ads.txt']);
for (const name of readdirSync('dist')) assert(allowed.has(name), `Unexpected static output: ${name}`);
function inspect(path) {
  for (const name of readdirSync(path)) {
    const file = `${path}/${name}`;
    const entry = lstatSync(file);
    assert(!entry.isSymbolicLink(), `Build contains a symlink: ${file}`);
    assert(!/(^\.env($|\.)|\.(db|sqlite|sqlite3)$)/i.test(name), `Private artifact: ${file}`);
    if (entry.isDirectory()) inspect(file);
    else assert(entry.isFile(), `Unexpected file type: ${file}`);
  }
}
inspect('dist');
NODE
    [[ -z $(git status --porcelain --untracked-files=all) && $(git rev-parse HEAD) == "$revision" ]] || {
        echo "The build changed source files; commit the intended inputs first." >&2
        exit 1
    }
    manifest=$(mktemp)
    trap 'rm -f "$manifest"' EXIT
    (cd dist && find . -type f -print0 | xargs -0 shasum -a 256) > "$manifest"
    candidate=$base/releases/.stage-$revision-$$
    ssh "$host" bash -s -- "$candidate" "$release" <<'REMOTE'
set -euo pipefail
mkdir -p /opt/frostdev-public/releases
[[ ! -e "$2" ]] || { echo "Release already exists; use activate after reviewing it." >&2; exit 1; }
mkdir -m 755 "$1"
REMOTE
    rsync -a dist/ "$host:$candidate/"
    rsync -a "$manifest" "$host:$candidate/.build-sha256"
    ssh "$host" bash -s -- "$candidate" "$release" <<'REMOTE'
set -euo pipefail
cd "$1"
find . -type d -exec chmod 755 {} +
find . -type f -exec chmod 644 {} +
sha256sum --status -c .build-sha256
touch .complete
exec 9>/opt/frostdev-public/.deploy.lock
flock -n 9 || { echo "Another public-site activation is running." >&2; exit 1; }
[[ ! -e "$2" ]] || { echo "Release already exists; the staged copy was not promoted." >&2; exit 1; }
mv -T "$1" "$2"
REMOTE
    rm -f "$manifest"
    trap - EXIT
    echo "Staged $revision at $host:$release"
    [[ $mode != stage ]] || exit 0
fi

ssh "$host" bash -s -- "$revision" <<'REMOTE'
set -euo pipefail
revision=$1
base=/opt/frostdev-public
release=$base/releases/$revision
[[ -f "$release/.complete" ]] || { echo "Stage this committed revision first." >&2; exit 1; }
cd "$release"
sha256sum --status -c .build-sha256
exec 9>"$base/.deploy.lock"
flock -n 9 || { echo "Another public-site activation is running." >&2; exit 1; }
previous=
if [[ -e "$base/current" || -L "$base/current" ]]; then
    [[ -L "$base/current" ]] || { echo "current must be a release symlink." >&2; exit 1; }
    previous=$(readlink "$base/current")
    [[ $previous =~ ^/opt/frostdev-public/releases/[0-9a-f]{40}$ && -f "$previous/.complete" ]] || {
        echo "The current symlink is not a verified public-site release." >&2
        exit 1
    }
fi
temporary=$base/.current-$revision-$$
activated=0
finish() {
    status=$?
    trap - EXIT
    if [[ $status -ne 0 && $activated -eq 1 ]]; then
        if [[ -n $previous ]]; then
            ln -s "$previous" "$temporary"
            mv -Tf "$temporary" "$base/current"
            echo "Verification failed; restored $previous" >&2
        else
            unlink "$base/current"
            echo "Verification failed; removed the initial public-site symlink." >&2
        fi
    fi
    [[ ! -L "$temporary" ]] || unlink "$temporary"
    exit "$status"
}
trap finish EXIT
ln -s "$release" "$temporary"
mv -Tf "$temporary" "$base/current"
activated=1

# The origin uses the existing Cloudflare origin certificate. Public TLS is checked normally.
for origin in origin public; do
    for route in / /rimeward /rimewire /crosspane /glaze /glaze/privacy /glaze/terms /glaze/looks /glaze/looks/submit /privacy /guides \
        /guides/rimeward-first-workspace /guides/crosspane-two-computers \
        /guides/rimewire-agent-handoffs /guides/frostsim-first-simulation \
        /guides/loothing-raid-loot /guides/glaze-safari /guides/glaze-chrome \
        /robots.txt /sitemap.xml /ads.txt; do
        case "$route" in
            /) file=index.html ;;
            *.txt|*.xml) file=${route#/} ;;
            *) file=${route#/}/index.html ;;
        esac
        expected=$(sha256sum "$file")
        expected=${expected%% *}
        options=()
        [[ $origin != origin ]] || options=(--resolve frostdev.io:443:127.0.0.1 --insecure)
        actual=$(curl -fsS --connect-timeout 10 --max-time 30 "${options[@]}" "https://frostdev.io$route" | sha256sum)
        actual=${actual%% *}
        [[ $actual == "$expected" ]] || { echo "$origin content differs at $route" >&2; exit 1; }
    done
done
echo "Activated and verified public site $revision"
echo "Previous public release: ${previous:-none}"
REMOTE

# Rollback: under the same .deploy.lock, link a prior verified release to a
# temporary sibling and use mv -Tf to replace current, then repeat HTTP checks.
# Never delete release directories or restart the Rimeward service here.

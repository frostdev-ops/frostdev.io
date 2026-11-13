#!/usr/bin/env bash
set -euo pipefail

# Usage: ops/deploy-kiln-stats.sh
# Installs the Kiln download statistics on loothing-vps from this committed tree: copies stats/kiln-downloads.mjs and
# its page to /opt/kiln-stats, builds the image there, installs the systemd service and its hourly timer, and runs one
# collection, which writes /opt/frostdev-stats/kiln/index.html. The stored days are in /var/lib/kiln-stats and survive.
# /etc/kiln-stats.env must already exist on the server (mode 600; docs/kiln-download-stats.md). nginx is separate: the
# /kiln/stats/ location in ops/public-site.nginx.conf and its password file.
[[ $# -eq 0 ]] || { echo "This script takes no arguments." >&2; exit 1; }
cd "$(dirname "$0")/.."
[[ -z $(git status --porcelain --untracked-files=all) ]] || {
    echo "Deploy from a clean, committed tree, including untracked files." >&2
    exit 1
}
node --test stats/kiln-downloads.test.mjs
host=loothing-vps
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cp stats/kiln-downloads.mjs stats/page.html stats/page.css stats/page.js stats/Dockerfile ops/kiln-stats.service ops/kiln-stats.timer "$stage/"
git rev-parse HEAD > "$stage/COMMIT"
ssh "$host" 'mkdir -p /opt/kiln-stats && test -f /etc/kiln-stats.env' || {
    echo "Create /etc/kiln-stats.env (mode 600) on $host first: docs/kiln-download-stats.md." >&2
    exit 1
}
rsync -a --delete "$stage/" "$host:/opt/kiln-stats/"
ssh "$host" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/kiln-stats
[[ $(stat -c %a /etc/kiln-stats.env) == 600 ]] || { echo "/etc/kiln-stats.env must be mode 600" >&2; exit 1; }
docker build -q -t kiln-stats . >/dev/null
# the container runs as uid 1000 (node); nginx (www-data) reads the page
install -d -o 1000 -g 1000 -m 750 /var/lib/kiln-stats
install -d -m 755 /opt/frostdev-stats
install -d -o 1000 -g 1000 -m 755 /opt/frostdev-stats/kiln
install -m 644 kiln-stats.service kiln-stats.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now kiln-stats.timer >/dev/null
# one collection now: the deploy fails when Cloudflare refuses the token or the zone
systemctl start kiln-stats.service || { journalctl -u kiln-stats.service -n 20 --no-pager >&2; exit 1; }
test -s /opt/frostdev-stats/kiln/index.html
journalctl -u kiln-stats.service -n 5 --no-pager -o cat | grep 'kiln-stats:' | tail -1
echo "Kiln download statistics are collected; the timer runs next at $(systemctl show kiln-stats.timer -p NextElapseUSecRealtime --value)"
REMOTE

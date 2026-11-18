#!/usr/bin/env bash
set -euo pipefail

# Usage: ops/deploy-stats.sh
# Installs frostdev HQ's statistics collection on loothing-vps from this committed tree (docs/hq.md): copies stats/'s
# four scripts and the Dockerfile to /opt/frostdev-stats, builds the image there, installs the systemd service and its
# hourly timer, and runs one collection, which writes kiln.json, site.json, public.json and status.json to
# /var/lib/frostdev-stats/out (the gallery server reads them for /hq). The stored days in /var/lib/frostdev-stats
# survive. /etc/frostdev-stats.env must exist (mode 600); a first deploy takes it, and Kiln's stored days, from the
# kiln-stats collection this replaces, and switches that one off (its files stay where they were, as a backup).
[[ $# -eq 0 ]] || { echo "This script takes no arguments." >&2; exit 1; }
cd "$(dirname "$0")/.."
[[ -z $(git status --porcelain --untracked-files=all) ]] || {
    echo "Deploy from a clean, committed tree, including untracked files." >&2
    exit 1
}
node --test stats/*.test.mjs
host=loothing-vps
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
cp stats/kiln-downloads.mjs stats/site-pages.mjs stats/public-numbers.mjs stats/collect.mjs stats/Dockerfile \
    ops/frostdev-stats.service ops/frostdev-stats.timer "$stage/"
git rev-parse HEAD > "$stage/COMMIT"
ssh "$host" 'install -d -m 755 /opt/frostdev-stats && { test -f /etc/frostdev-stats.env || test -f /etc/kiln-stats.env; }' || {
    echo "Create /etc/frostdev-stats.env (mode 600) on $host first: docs/hq.md." >&2
    exit 1
}
# Keep the legacy page available until nginx switches its redirect. The staging root from mktemp is mode 700.
rsync -a --chown=root:root --chmod=D755 --delete --exclude=/kiln/ "$stage/" "$host:/opt/frostdev-stats/"
ssh "$host" bash -s <<'REMOTE'
set -euo pipefail
cd /opt/frostdev-stats
if [[ ! -f /etc/frostdev-stats.env ]]; then
    install -o root -g root -m 600 /etc/kiln-stats.env /etc/frostdev-stats.env
    echo "Took the Cloudflare token from /etc/kiln-stats.env"
fi
[[ $(stat -c '%u:%a' /etc/frostdev-stats.env) == 0:600 ]] || { echo "/etc/frostdev-stats.env must be root-owned and mode 600" >&2; exit 1; }
# the container runs as uid 1000 (node), as does the gallery server that reads out/
install -d -o 1000 -g 1000 -m 750 /var/lib/frostdev-stats
install -d -o 1000 -g 1000 -m 755 /var/lib/frostdev-stats/out
if [[ ! -d /var/lib/frostdev-stats/kiln && -d /var/lib/kiln-stats/days ]]; then
    migration=$(mktemp -d /var/lib/frostdev-stats/.kiln-XXXXXX)
    trap 'rm -rf -- "$migration"' EXIT
    cp -a /var/lib/kiln-stats/. "$migration/"
    chown -R 1000:1000 "$migration"
    chmod 750 "$migration"
    mv -T "$migration" /var/lib/frostdev-stats/kiln
    trap - EXIT
    echo "Copied Kiln's stored days from /var/lib/kiln-stats ($(ls /var/lib/frostdev-stats/kiln/days | wc -l) days)"
fi
docker build -q -t frostdev-stats . >/dev/null
install -m 644 frostdev-stats.service frostdev-stats.timer /etc/systemd/system/
systemctl daemon-reload
# One collection now, before the timer is switched on: when Cloudflare refuses the token or the zone, the deploy fails
# and a first install leaves no timer running behind it.
systemctl start frostdev-stats.service || { journalctl -u frostdev-stats.service -n 20 --no-pager >&2; exit 1; }
for part in kiln site public status; do test -s "/var/lib/frostdev-stats/out/$part.json"; done
systemctl enable --now frostdev-stats.timer >/dev/null
if [[ -f /etc/systemd/system/kiln-stats.timer ]]; then
    systemctl disable --now kiln-stats.timer >/dev/null
    systemctl stop kiln-stats.service
    rm -f /etc/systemd/system/kiln-stats.timer /etc/systemd/system/kiln-stats.service
    systemctl daemon-reload
    echo "Switched off the old kiln-stats collection"
fi
journalctl -u frostdev-stats.service -n 5 --no-pager -o cat | grep 'frostdev-stats:' | tail -1
echo "frostdev HQ's numbers are collected; the timer runs next at $(systemctl show frostdev-stats.timer -p NextElapseUSecRealtime --value)"
REMOTE

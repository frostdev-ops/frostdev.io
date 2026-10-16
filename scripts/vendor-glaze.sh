#!/bin/sh
# Copies the Glaze files the Looks gallery needs to read and check theme codes (scripts/looks.mjs) from a
# pinned Glaze release tag in the public repository. Pinned and committed, not fetched at build time: the
# site builds offline and the same way every time, the copy is reviewed like any other change, and codes are
# checked by the Glaze students actually run. Raise the tag after a Glaze release that changes settings.
#   scripts/vendor-glaze.sh v2.2.0
set -eu
tag=${1:?usage: scripts/vendor-glaze.sh <glaze release tag, like v2.2.0>}
case $tag in v[0-9]*.[0-9]*.[0-9]*) ;; *) echo "Not a release tag: $tag" >&2; exit 1 ;; esac
dest=$(dirname "$0")/../vendor/glaze
base=https://raw.githubusercontent.com/frostdev-ops/glaze/$tag
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/lib"
for f in defaults.js lib/color.js lib/fonts.js lib/share.js LICENSE; do
    curl -fsSL "$base/$f" -o "$tmp/$f"
done
echo "$tag" > "$tmp/VERSION"
# Glaze's files are classic scripts with a CommonJS export; this site's package.json says ES modules.
echo '{ "type": "commonjs" }' > "$tmp/package.json"
chmod 755 "$tmp"
rm -rf "$dest"
mkdir -p "$(dirname "$dest")"
mv "$tmp" "$dest"
trap - EXIT
echo "Vendored Glaze $tag into vendor/glaze"

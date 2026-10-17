#!/bin/sh
# Copies the Glaze files the Looks gallery needs to read and check theme codes (scripts/looks.mjs) and to draw their
# backgrounds (src/components/livebg.ts) from a pinned Glaze release tag in the public repository. Pinned and
# committed, not fetched at build time: the site builds offline and the same way every time, the copy is reviewed
# like any other change, and codes are checked by the Glaze students actually run. Raise the tag after a Glaze
# release that changes settings or Look parts.
#   scripts/vendor-glaze.sh v3.1.0
#
# DEVELOPMENT ONLY: before a Glaze release has the code a branch here needs, copy it from a local Glaze checkout
# instead. VERSION then says `local <sha>` (the checkout's HEAD), and ops/deploy.sh and ops/deploy-gallery.sh refuse
# to deploy such a copy. A release is only ever vendored from its tag, above.
#   scripts/vendor-glaze.sh --dev /path/to/glaze
#
# vendor/glaze holds what decoding a code needs (the server and the browser both read it); vendor/glaze-scene holds
# the animated-background engine and its three.js build, which only the gallery pages load, so it stays out of the
# server's image (server/Dockerfile copies vendor/glaze alone).
set -eu
usage() { echo "usage: scripts/vendor-glaze.sh <glaze release tag, like v3.1.0>
       scripts/vendor-glaze.sh --dev <path to a local Glaze checkout>  (development only: VERSION becomes 'local <sha>')" >&2; exit 1; }
[ $# -ge 1 ] || usage
root=$(cd "$(dirname "$0")/.." && pwd)
# defaults.js and lib/*: share.js and lookparts.js read the rest (cards, color, fonts, surfaces; glsl, motionx,
# navlayout, nav, nav-items, parts) for the parts a glaze2 code can carry.
DECODE="defaults.js lib/cards.js lib/color.js lib/fonts.js lib/share.js lib/surfaces.js lib/lookparts.js lib/glsl.js lib/motionx.js lib/navlayout.js lib/nav.js lib/nav-items.js lib/parts.js LICENSE"
SCENE="lib/scene.js lib/three.min.js lib/three.LICENSE"
if [ "$1" = --dev ]; then
    [ $# -eq 2 ] || usage
    src=$(cd "$2" && pwd) || usage
    git -C "$src" rev-parse --git-dir >/dev/null 2>&1 || { echo "Not a git checkout: $src" >&2; exit 1; }
    # The sha is the proof of what was copied, so uncommitted changes in these files would make it a lie.
    [ -z "$(cd "$src" && git status --porcelain -- $DECODE $SCENE)" ] || { echo "Commit or stash the changes to the Glaze files first; VERSION would not describe the copy." >&2; exit 1; }
    version="local $(git -C "$src" rev-parse --short=12 HEAD)"
    fetch() { cp "$src/$1" "$2"; }
else
    tag=$1
    case $tag in v[0-9]*.[0-9]*.[0-9]*) ;; *) echo "Not a release tag: $tag (use --dev for a local checkout)" >&2; usage ;; esac
    base=https://raw.githubusercontent.com/frostdev-ops/glaze/$tag
    version=$tag
    fetch() { curl -fsSL "$base/$1" -o "$2"; }
fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
mkdir -p "$tmp/glaze/lib" "$tmp/glaze-scene/lib"
for f in $DECODE; do fetch "$f" "$tmp/glaze/$f"; done
for f in $SCENE; do fetch "$f" "$tmp/glaze-scene/$f"; done
for d in glaze glaze-scene; do
    echo "$version" > "$tmp/$d/VERSION"
    chmod 755 "$tmp/$d" "$tmp/$d/lib"
done
# Glaze's decoding files are classic scripts with a CommonJS export; this site's package.json says ES modules.
# The scene engine and its three.js build are real ES modules.
echo '{ "type": "commonjs" }' > "$tmp/glaze/package.json"
echo '{ "type": "module" }' > "$tmp/glaze-scene/package.json"
rm -rf "$root/vendor/glaze" "$root/vendor/glaze-scene"
mkdir -p "$root/vendor"
mv "$tmp/glaze" "$tmp/glaze-scene" "$root/vendor/"
trap - EXIT
rm -rf "$tmp"
echo "Vendored Glaze $version into vendor/glaze and vendor/glaze-scene"

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
# What is copied, as `source:destination` pairs, by the Glaze checkout's layout. share.js and lookparts.js read the rest
# (cards, color, fonts, surfaces; glsl, motionx, navlayout, nav, nav-items, parts) for the parts a glaze2 code can carry.
# modbundle.js reads and verifies a mod bundle for the Mods section, with zip.js, widgets.js (its tile names and sizes),
# modapi.js, modwidget.js with gradecalc.js (widget blocks) and media.js (sticker and pet packs).
#   extension  v4.0.1 and later (Glaze d26c1097 moved the extension into extension/<area>/). The files require each other
#              by those folders, so each keeps its folder under vendor/glaze and vendor/glaze-scene, minus extension/.
#   three      v3.4.6 to v4.0.0: defaults.js and lib/*, with three.js under that name.
#   three.min  before v3.4.6: the same, with lib/three.min.js.
layout_of_tag() {
    newest=$(printf '%s\n%s\n' "$1" "$2" | sed 's/^v//' | sort -t. -k1,1n -k2,2n -k3,3n | tail -n 1)
    [ "v$newest" = "$1" ]
}
pairs() {
    case $layout in
        extension)
            [ "$1" = decode ] && for f in content/defaults.js courses/cards.js core/color.js looks/fonts.js sharing/share.js \
                looks/surfaces.js looks/lookparts.js looks/glsl.js looks/motionx.js navigation/navlayout.js navigation/nav.js \
                navigation/nav-items.js looks/parts.js mods/modbundle.js core/zip.js core/widgets.js mods/modapi.js \
                mods/modwidget.js planner/gradecalc.js looks/media.js; do echo "extension/$f:$f"; done
            [ "$1" = decode ] && echo LICENSE:LICENSE
            [ "$1" = scene ] && for f in looks/scene.js vendor/three.js vendor/three.LICENSE; do echo "extension/$f:$f"; done ;;
        three|three.min)
            [ "$1" = decode ] && for f in defaults.js lib/cards.js lib/color.js lib/fonts.js lib/share.js lib/surfaces.js \
                lib/lookparts.js lib/glsl.js lib/motionx.js lib/navlayout.js lib/nav.js lib/nav-items.js lib/parts.js \
                lib/modbundle.js lib/zip.js lib/widgets.js lib/modapi.js lib/modwidget.js lib/gradecalc.js lib/media.js LICENSE; do echo "$f:$f"; done
            [ "$1" = scene ] && for f in lib/scene.js "lib/$layout.js" lib/three.LICENSE; do echo "$f:$f"; done ;;
    esac
    return 0
}
if [ "$1" = --dev ]; then
    [ $# -eq 2 ] || usage
    src=$(cd "$2" && pwd) || usage
    git -C "$src" rev-parse --git-dir >/dev/null 2>&1 || { echo "Not a git checkout: $src" >&2; exit 1; }
    if [ -f "$src/extension/content/defaults.js" ]; then layout=extension
    elif [ -f "$src/lib/three.js" ]; then layout=three
    else layout=three.min; fi
    # The sha is the proof of what was copied, so uncommitted changes in these files would make it a lie.
    [ -z "$(cd "$src" && git status --porcelain -- $( { pairs decode; pairs scene; } | cut -d: -f1))" ] || { echo "Commit or stash the changes to the Glaze files first; VERSION would not describe the copy." >&2; exit 1; }
    version="local $(git -C "$src" rev-parse --short=12 HEAD)"
    fetch() { cp "$src/$1" "$2"; }
else
    tag=$1
    case $tag in v[0-9]*.[0-9]*.[0-9]*) ;; *) echo "Not a release tag: $tag (use --dev for a local checkout)" >&2; usage ;; esac
    if layout_of_tag "$tag" v4.0.1; then layout=extension
    elif layout_of_tag "$tag" v3.4.6; then layout=three
    else layout=three.min; fi
    base=https://raw.githubusercontent.com/frostdev-ops/glaze/$tag
    version=$tag
    fetch() { curl -fsSL "$base/$1" -o "$2" || { echo "Couldn't fetch $1 from Glaze $tag" >&2; return 1; }; }
fi
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
copy() { # copy <decode|scene> <into>
    for p in $(pairs "$1"); do
        mkdir -p "$(dirname "$2/${p#*:}")"
        fetch "${p%%:*}" "$2/${p#*:}"
    done
}
copy decode "$tmp/glaze"
copy scene "$tmp/glaze-scene"
for d in glaze glaze-scene; do
    echo "$version" > "$tmp/$d/VERSION"
    find "$tmp/$d" -type d -exec chmod 755 {} +
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

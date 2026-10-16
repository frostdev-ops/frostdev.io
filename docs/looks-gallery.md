# Glaze Looks gallery

`/glaze/looks` is a free, open gallery of Glaze themes. It is one static page built from this
repository: no accounts, likes, comments, counters, server or analytics. Glaze makes no request to it;
a student visits it like any other page.

## How an entry is stored

- `src/data/looks/<id>.json`: `name` (up to 40 characters), `author` (a GitHub username), `created`
  (`YYYY-MM-DD`), `tags`, `previews` (`["dark"]`, `["light"]` or both) and `code` (a `glaze1:` theme code).
- `public/projects/glaze/looks/<id>-<light|dark>.webp`: the previews, real screenshots of the Look on
  Blackboard Ultra or Canvas, WebP, at most 200 KB each.

Whether an entry is a Look or a palette, light or dark, and animated, is read from its code. A palette
code carries only colors, so applying it keeps the student's fonts and background.

Submitters choose from `minimal`, `colorful`, `gradient`, `serif`, `monospace`, `seasonal` and the
accessibility tags `high-contrast`, `low-vision`, `dyslexia-friendly` and `color-blind-safe`.
The first three accessibility tags are checked against the code (see below); `color-blind-safe` is
a maintainer's call.

## License

Submitted theme codes and screenshots are licensed by their contributors under
[Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
When sharing or adapting a submission, give appropriate credit to its author, link to the license
and indicate any changes. Keep the gallery entry link with the author credit so others can find
its source. The entry's `author` field and public author link supply the contributor's credit.

This applies only to submitted Looks and their screenshots. Glaze's built-in Looks and palettes,
website source, vendored code and other assets retain their existing licenses; see the root
[LICENSE](../LICENSE), `vendor/glaze/LICENSE` and [asset provenance](assets.md).
A background image hosted elsewhere keeps its own license; linking it does not relicense it.

## Checks

`node scripts/looks.mjs` checks every entry, and CI runs it on every push and pull request. The page
build runs the same checks and fails on any problem, so a bad entry can't be deployed either.

- The code is read by Glaze's own `lib/share.js` and `defaults.js`, which refuse a code whole when any
  value doesn't come through `GZ_SANITIZE` unchanged. Before that, the checker inflates the code itself
  and refuses a look or background group that isn't an object: Glaze up to 2.2.0 would read it as empty
  and drop its settings instead of refusing them (later Glaze refuses it too). The code must also fit
  1,200 characters and be unique.
- A background image address must be `https:` and only present when the background is that image.
- `high-contrast`: text on the surface 7:1, muted text and text on the accent 4.5:1.
  `low-vision`: text size 110% or more. `dyslexia-friendly`: a font from Glaze's Readable group or
  Atkinson Hyperlegible. `gradient`: a gradient background.
- Names are 1 to 40 characters without control, format or private-use characters and unique; the
  author is a valid GitHub username; the date is real and not in the future; every listed preview is a
  whole WebP file under the size cap that decodes (with sharp, which Astro already installs) to 640 to
  2560 pixels wide and 240 to 1600 tall, the palette's own mode has one, and no preview file is left unused.

Glaze's files are pinned in `vendor/glaze/` by `scripts/vendor-glaze.sh <tag>`, which copies them
from that public Glaze release tag. A pinned, committed copy keeps the build offline and repeatable,
puts any change to the checker in review, and checks codes against the Glaze students run, not
unreleased code. It stays at v2.2.0 until a Glaze release includes the group-shape fix; the checker
covers that case itself meanwhile. Raise the tag after a Glaze release that changes its settings, then
run the checks.

## Taking a submission

1. A student opens the **Share a Glaze Look** issue form, or a pull request with the two files.
   The contributor must confirm they have the right to license the theme code and screenshot under
   CC BY 4.0; get that same confirmation explicitly on a pull request before accepting it.
2. For an issue, a maintainer converts the screenshot to WebP (for example
   `cwebp -q 82 -resize 960 0 shot.png -o public/projects/glaze/looks/<id>-dark.webp`), writes the JSON
   and opens the pull request, crediting the issue's author.
3. Before merging, check the preview by eye: it must match the code and show nothing personal (names,
   grades, classmates). Check `color-blind-safe` claims and that the name is fit for a school audience.
4. Merge, then publish the site as usual (`ops/deploy.sh`).

## Content safety

- Names, authors and tags are rendered as text by Astro, never as HTML; tags come from a fixed list.
- Previews are files in this repository. The page loads nothing from other sites. An image address
  inside a code is shown as its host name, and the image loads only after the visitor clicks
  **Show the image**, without a referrer.
- "Use this Look in Glaze" never applies anything: Glaze shows the Look in its own editor preview and
  waits for the student to choose **Use this theme**.

## Takedown

Anyone can ask for a Look to be removed by emailing admin@frostdev.io or opening an issue that names
it. Remove first and look into it after: delete the JSON and its previews in one commit that says why
(without repeating anything harmful), and publish. For a takedown that involves personal data in a
screenshot, also ask GitHub to purge the image from the issue if it was uploaded there.

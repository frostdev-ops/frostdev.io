# Glaze guides and marketing review — October 16, 2026

Reviewed the release notes through 3.0.2, the 3.0.1 surface/pet implementation
notes, the published 3.0.2 package, and the 3.0.3 candidate at Glaze `78fbd4d`.
This is a website content review, not an independent release acceptance report.

| Release | Public content |
| --- | --- |
| 3.0.0 | Retain the Ultra Dashboard, movable course-card widgets, live tabs, local folder hiding, navigation editor, notes, planning, imports, Moodle support and optional encrypted sharing. Keep each LMS's feature scope and backup/privacy distinctions. |
| 3.0.1 | Add practical Surfaces instructions and current captures. Explain automatic versus custom opacity, blur, tint, frost, borders, shadows, radius and resets. Cover the seven animated companions, local imports, habitat character selection, motion settings and existing XP. |
| 3.0.2 | Explain faster Ultra interaction without turning synthetic benchmark results into universal speed claims. Four live pages apply on all machines; the two-page hardware limit and idle closure from 3.0.1 are superseded. Add Firefox 140+ desktop temporary-install instructions and its GitHub package. |
| 3.0.3 candidate | Explain the shared character across habitat, Study buddy, navigation and course cards; separate visibility controls; timer/task reactions without extra XP; Cat/Bunny choices; preserved account progress and deleted-import fallback. Cover the bounded Blackboard viewer-ticket/conversion repair. |

The Firefox Android emulator launcher is development tooling. It does not establish
physical-device or Android runtime support for the public install guide. Google
Calendar sync remains excluded from Firefox; the calendar-file export is available.
The release's native/runtime validation belongs to its release workflow.

At the initial content check, GitHub's latest public release was 3.0.2. Candidate
3.0.3 behavior is explicitly marked upcoming, and downloads remain on existing
3.0.2 assets until the newer release is publicly available. Store versions are
kept separate from GitHub availability; no store approval or timing is claimed.

Firefox installation steps were checked against Mozilla's
[temporary-installation guide](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/).
A temporary install is removed when Firefox restarts and differs from an ordinary
Mozilla-signed add-on installation.

The two new images show the actual published 3.0.2 editor with fictional courses.
See [asset provenance](assets.md). Earlier 3.0.0 editor captures remain labelled
by their filenames. No authenticated school content appears in the images.

## Validation

- `npm run check`, `npm run build` and `node scripts/looks.mjs` passed.
- The marketing page, both guides and guide index were checked at 1440, 390 and
  320 pixels: HTTP 200, no horizontal page overflow, valid chapter anchors and
  no page errors or failed same-site resources.
- Browser-specific Safari/Chrome install actions and the Firefox fallback passed;
  all three browser choices remain reachable without JavaScript.
- Reviewed the new editor images and desktop/phone marketing and guide captures.

Receipts and the disposable validation scripts are in the current chat's
`glaze-site-review` visualization folder. No new test files or dependencies were
added to either repository; concurrent Glaze release work was left to its owner.

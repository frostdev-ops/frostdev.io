# Glaze guides and marketing review — October 16, 2026

Reviewed the release notes through 3.0.3, the 3.0.1 surface/pet implementation
notes, the published 3.0.2 package, and the 3.0.3 release at Glaze `f3aae87` and Firefox integration `fe77e88`.
This is a website content review, not an independent release acceptance report.

| Release | Public content |
| --- | --- |
| 3.0.0 | Retain the Ultra Dashboard, movable course-card widgets, live tabs, local folder hiding, navigation editor, notes, planning, imports, Moodle support and optional encrypted sharing. Keep each LMS's feature scope and backup/privacy distinctions. |
| 3.0.1 | Add practical Surfaces instructions and current captures. Explain automatic versus custom opacity, blur, tint, frost, borders, shadows, radius and resets. Cover the seven animated companions, local imports, habitat character selection, motion settings and existing XP. |
| 3.0.2 | Explain faster Ultra interaction without turning synthetic benchmark results into universal speed claims. Four live pages apply on all machines; the two-page hardware limit and idle closure from 3.0.1 are superseded. Add Firefox 140+ desktop temporary-install instructions and its GitHub package. |
| 3.0.3 | Explain the shared character across habitat, Study buddy, navigation and course cards; separate visibility controls; timer/task reactions without extra XP; Cat/Bunny choices; preserved account progress and deleted-import fallback. Cover the bounded Blackboard viewer-ticket/conversion repair. |

The Firefox Android emulator launcher is development tooling. It does not establish
physical-device or Android runtime support for the public install guide. Google
Calendar sync remains excluded from Firefox; the calendar-file export is available.
The release's native/runtime validation belongs to its release workflow.

The 3.0.3 release update promotes shared pets and the Blackboard preview repair,
and points all direct downloads and release notes at 3.0.3. Deploy only after the
GitHub release and notarized downloads are public. Store versions remain separate;
no store approval or timing is claimed. The Firefox asset comes from the maintained
`dev/firefox` branch at the same main release version.

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

## 3.0.3 publication update

Direct download links and headings now target 3.0.3. Shared companions and Blackboard preview repair are described as available; Chrome/store availability remains separate. The signed 3.0.3 Safari appcast is included and deploys after GitHub downloads are public. Historical 3.0.2 editor captures keep their original captions and filenames. The site is checked at 1440, 390 and 320 pixels with all images decoded; no horizontal page overflow, missing images, old download links or page errors. The local browser receipts are in Glaze's release/3.0.3/validation/site-local folder.

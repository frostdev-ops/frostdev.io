# Glaze privacy and terms publication

Effective October 15, 2026. Routes: `/glaze/privacy` and `/glaze/terms`.

The owner committed official Glaze to remain free, with no Pro/Premium subscription,
paid unlocks or paid feature gates. The policies promise no data sales, advertising
profiles, product analytics, session replay or content used for AI training.

A literal claim that no data is ever processed or transmitted would contradict
Glaze's local school-data reads, optional encrypted sharing, browser sync, chosen
font/media providers, updates and ordinary website/network metadata. These are
prominently disclosed. Hosted relay ciphertext and necessary metadata are not
misrepresented as zero server data; recipient copies/backups and sensitive invitation
keys are explained. No new data processing or extension code is introduced.

Terms preserve the existing MIT rights, including third-party commercial
redistribution, retain user ownership, distinguish official Glaze's free promise
from independently operated services, and preserve mandatory legal rights. No
jurisdiction, corporate entity, arbitration agreement or compliance certification
was invented. The existing site-wide policy remains scoped to the website and
other Frostdev services, with a link to Glaze's policies.

General privacy-promise guidance was checked at
https://www.ftc.gov/business-guidance/privacy-security and the software licence at
https://opensource.org/license/mit and Glaze's own LICENSE.

Presentation uses existing site typography, a custom shield/orbit, a $0 card,
subtle gradients and finite CSS motion (at most five seconds). Reduced motion has
no policy animations; high-contrast text remains visible. The two policy pages
omit the optional ambient WebGL scene; other pages retain it. All content and
navigation work without JavaScript. Comparison overflow is contained in a named,
keyboard-focusable region.

Validation: TypeScript check, 16-page Astro build, exact deployment artifact
assertions, shell syntax and routing allow/deny assertions. Headless Chromium:
48 page/width cases (all 16 pages at 1440, 390 and 320px), zero page overflow,
broken images, page errors or unexpected external requests; anchors/canonicals,
finite/reduced motion, keyboard table and forced-colors checks passed. Screenshots
and the compact receipt are in `docs/screenshots/glaze-policies/`. No account data,
new dependencies or repository test code was added.

Publication uses the Website workflow and `ops/deploy.sh`. The nginx include adds
only these two exact nested Glaze routes, retaining the gallery and all application
routes. Deployment must back up that include, validate/reload nginx, activate the
staged immutable site and verify origin/public bytes. No Rimeward runtime changes.

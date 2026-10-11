# Milestone 5 — Release preparation and blocker resolution

Audit date: October 10, 2026. Preparation was performed without committing, pushing, changing publication settings, or deploying.

Release authorization: October 11, 2026. The human developer accepted Version 1 after manual functionality and Firefox production-preview checks, including offline saving/reopening and returning online without data loss. They explicitly authorized the release commit, push to `main`, GitHub Pages publication, and live verification. The final local rerun passed 55 unit tests, 57 development browser tests (four expected skips), 60 production browser tests (one expected skip), and the production build. Deployment results must be verified separately at the actual HTTPS URL; the release tag requires final human confirmation.

Initial publication check: GitHub confirmed the repository is private, `main` is its default branch, and Pages is disabled. Enabling the approved Actions source returned HTTP 422: “Your current plan does not support GitHub Pages for this repository.” Repository visibility and billing were left unchanged. A supported plan or explicit approval to expose the repository and its Git history is required before deployment can proceed.

## Assessment

Release preparation and the two approved blocker fixes have human acceptance and deployment authorization. Offline reopening and stale/simultaneous journal writes have automated production-browser coverage. Verification at the actual HTTPS URL is still required before calling the public release complete.

The original audit inspected `AGENTS.md`, the feature-development skill, product/design/technical specifications, all four mockups, implementation, tests, and Git history. Its clean baseline was the Milestone 4 Settings checkpoint. Original checks passed 48 unit and 40 browser tests; release preparation extended browser coverage to 47. The original audit reproduced failed offline reopening and a stale second tab replacing the first tab's entry. Those historical findings prompted the explicitly approved work recorded below.

Repository: `https://github.com/Gabriel-Artisan/mini-journal.git`. Read-only `git ls-remote --symref origin HEAD` confirmed default branch `main` during preparation.

## Implementation

- `scripts/offline-plugin.js` generates `dist/sw.js` from `src/service-worker.js` and Vite's final bundle. Content-based versions include assets, paths, base and worker code. Installation caches the full built HTML/JS/CSS shell; failed installation removes the incomplete new cache and keeps previous versions intact.
- `src/offline.js` registers the worker only in production under `/mini-journal/`, with a small accessible preparation/readiness/failure status in `index.html` and `src/styles.css`. Development retains root URLs and no worker registration.
- Worker fetch handling serves only same-origin application resources and the canonical shell for project-root/index navigation, including query/hash views. Journal content is never cached as network resources. Updates wait for existing controlled tabs to close, do not force reload, and remove only obsolete caches belonging to this app/base.
- `src/storage.js` keeps each tab's exact last loaded/saved collection snapshot. All journal writes compare that snapshot and write while holding an exclusive Web Lock named for the existing journal key. Capturing the expected snapshot before waiting also protects overlapping same-tab requests. A failed or stale write never advances the snapshot. The entry schema and storage keys are unchanged.
- `src/app.js` awaits journal persistence before committing in-memory state. Conflicts explain how to copy unsaved writing, reload, and review the latest entries. Missing Web Locks refuses writes with an explanation; reading and Settings remain available. There is no unsafe race-prone fallback, automatic merge, synchronization layer, or new persistence store.
- `src/ui.js` awaits mutation results, prevents duplicate in-flight save controls, and keeps creation/edit writing typed while saves wait. Edit drafts survive navigation while pending; save/cancel editing controls remain disabled until completion. Destructive confirmations cannot be cancelled after the confirmed operation is in flight. Error and success feedback retain their existing policies. Initial edit focus now happens synchronously after rendering, avoiding a delayed cursor move that could interfere with typing.

## Files and release configuration

Release preparation added `vite.config.js`, `.github/workflows/deploy.yml`, `playwright.production.config.js`, `tests/e2e/release.spec.js`, `README.md`, and this audit. It updated package scripts, technical documentation and base-relative navigation in the six existing browser specs.

Blocker resolution additionally changes `src/storage.js`, `src/app.js`, `src/ui.js`, and `src/styles.css`, `index.html`, and Vite's plugin configuration; adds `src/offline.js`, `src/service-worker.js`, `scripts/offline-plugin.js`, `tests/e2e/{concurrency,offline}.spec.js`, and `tests/unit/{offline.test,locks}.js`; and adapts storage/preference unit tests and browser waits for asynchronous saves. Development/production test artifacts use separate subdirectories. README, product/technical specifications and this record now describe the approved offline and conflict behavior.

No dependency versions, lockfile entries, journal schema, preference semantics, or deployment permissions were changed by blocker resolution. No backend, account, installation prompt, manifest, push notification, or unrelated feature was added.

Target: `https://gabriel-artisan.github.io/mini-journal/`; default branch: `main`; artifact: `dist/` (including generated `sw.js`); Node: 24; runner: `ubuntu-latest`.

Workflow gates remain `npm ci` → Chromium/OS dependency installation → `npm test` → `npm run build` → `npm run test:production` → artifact upload. Pull requests run checks only. Main pushes and manual runs on main can deploy after checks. Workflow-wide permissions are `contents: read`; only deployment receives `pages: write` and `id-token: write` through the `github-pages` environment. Official checkout/setup-node/configure-pages/upload-pages-artifact/deploy-pages actions are pinned to verified release commits. No personal credential or third-party deployment dependency is needed. See the [Vite Pages guide](https://vite.dev/guide/static-deploy.html#github-pages) and [GitHub workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Final verification

Local runtime: Node.js 24.19.0 with existing installed dependencies. npm is unavailable on this host's PATH, so the equivalent installed entry points below were used. Fresh `npm ci`, npm orchestration, runner browser installation, GitHub workflow execution and live HTTPS hosting remain unverified; they are workflow gates or post-deployment checks.

| Executed command / check | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run tests/unit` | 55 tests passed across five files |
| `node node_modules/@playwright/test/cli.js test` | 57 passed; four production-only offline tests intentionally skipped |
| `node node_modules/vite/bin/vite.js build` | Passed; HTML/assets/worker use `/mini-journal/` |
| `node node_modules/@playwright/test/cli.js test --config playwright.production.config.js` | 60 passed; one development-only test intentionally skipped |
| `git diff --check` | Passed |

Focused evidence:

- Production page reopening with connectivity disabled loads the cached shell, CSS and JavaScript; direct Settings query/hash navigation and reload work offline.
- Create, edit (preserving ID and timestamp), individual deletion, bulk deletion and Settings persistence pass offline. Cache inspection contains exactly built HTML/JS/CSS, without journal text.
- A real persistent Chromium profile saves offline, closes its browser, relaunches with networking disabled, restores the same saved entries and Dark preference, creates another entry, and reloads offline successfully. The disposable profile is removed after verification.
- Stale create/edit/delete/delete-all tests retain newer stored entries and composer/edit drafts; a stale tab cannot resurrect an entry deleted elsewhere. Reloading and reviewing the latest journal permits subsequent safe writes.
- Simultaneous writes are queued behind a held real origin-wide Web Lock, then released: exactly one snapshot commits; the other is rejected with its draft intact. This exercises comparison inside the exclusive lock, not merely sequential tab clicks.
- Writing typed during a queued create/save or an edit that navigates between views remains present after the earlier snapshot is saved. Unsupported Web Locks leaves saved entries readable and rejects changes without modifying storage.
- Worker tests cover deterministic build versions, complete resource manifests, failed-cache cleanup, unrelated-cache preservation and restricted fetch handling. A real HTTP-served update waits for open tabs, keeps their draft/current cache, activates after closure, removes only its obsolete caches, and supports offline writing afterward.
- Existing journal, Settings, validation, malformed/unavailable/quota storage, privacy, safe-text, keyboard, confirmation, hash navigation and responsive regressions pass. Responsive coverage includes 320, 390 and 1440 pixels, long unbroken text and both appearances.
- Production mobile screenshots of offline readiness and Dark conflict feedback were inspected at 390×844. Draft text and the full explanation remain readable, with no horizontal overflow or page errors. Ignored screenshots are under `playwright-report/blocker-visual/`.

Intermediate runs exposed asynchronous test waits, a delayed edit-focus race, a filename-order assumption in cache assertions, and two test-environment limitations. Clock tests now wait for mutation completion before advancing announcement frames. Edit focus was corrected in the application. Asset checks no longer depend on hash-sorted JS/CSS ordering. Chromium CacheStorage failed with a deeply nested Windows test-profile path; a short temporary profile fixes that test. Playwright cannot intercept updated worker scripts, so the update test uses a disposable local HTTP server serving the real built files. A development run was interrupted by source changes/HMR; final verification ran with implementation editing finished. No failures were hidden by retries or removal of coverage.

## Remaining limits and human checks

- Offline use requires successful initial preparation and retained browser caches. An initial visit while offline, cleared/evicted site data, or unavailable Service Workers/CacheStorage cannot provide offline reopening. Browser storage still has no backup, export, encryption layer or cross-device access.
- Web Locks and offline APIs require supported secure contexts. HTTPS Pages and supported localhost qualify. Journal writes fail closed without Web Locks. See [Web Locks compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API#browser_compatibility). Chromium is automated; physical devices, Firefox/WebKit, screen readers and a comprehensive WCAG audit remain human checks.
- Web Locks coordinates cooperating updated app tabs. Old code or unrelated same-origin scripts that ignore the lock are outside its protection; close obsolete tabs when upgrading. Project paths do not isolate browser storage from other apps on the same `gabriel-artisan.github.io` origin.
- Unsaved drafts remain in the current session and do not survive manual reload/closure. Conflict feedback explicitly asks users to copy drafts before reloading. Tabs do not automatically merge or refresh their journal lists. Installed updates activate after existing app tabs close; uninstalled updates require a later online visit.
- The deployment workflow was inspected locally but has not run on GitHub. Pages availability, source/environment settings and actual live URLs remain unverified.

## Checklist recorded at the end of preparation

1. Human review and acceptance of the release diff and browser compatibility boundaries.
2. Explicit authorization to commit, push and publish. Pushing this workflow to main can initiate deployment; none of those actions has been performed.
3. Set Pages source to GitHub Actions; review the github-pages environment's main-branch restrictions and any desired required reviewer protection.
4. Run the approved workflow and confirm every installation/test/build/deployment gate succeeds.
5. Verify the reported HTTPS URL with disposable entries: asset/worker paths, direct views/reload/history, journal/Settings persistence, confirmations, mobile/keyboard use, offline reopening/restart and stale-tab rejection. Record live verification only after it actually occurs.

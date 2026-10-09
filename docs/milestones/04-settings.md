# Milestone 4 — Settings

Status: reviewed and explicitly approved by the human developer on October 9, 2026. The final UI, hash navigation, and redesigned delete-all button were manually verified. The approved Git checkpoint is `feat: complete milestone 4 settings`; deployment remains outside this milestone.

## Scope and decisions

- Four responsive Settings cards follow the approved mockup composition using the existing shell, botanical artwork, and mobile hamburger navigation.
- Native radio segments expose Light/Dark/System and Small/Medium/Large. Selection has a border and weight distinction as well as color.
- Defaults are System and Medium, since the approved specifications did not define defaults. Preferences are independent, browser-local, and separate from journal records.
- Theme restoration runs first during application startup. System changes update only a System selection. All application surfaces use the shared Light/Dark tokens.
- Medium retains responsive serif reading text; writing sizes are 16/18/21.6 CSS pixels and reading sizes are 16/responsive 18–20.8/24 at the default root size. Interface labels, controls, and metadata are unaffected.
- Preference write failure keeps the current presentation, shows an explicit persistence warning, and offers Retry saving preferences. It never writes journal data.
- Privacy copy explains local-only storage, no server/account/cloud transmission, lack of cross-browser/device availability, and possible loss when browser/site data is cleared.
- Delete-all reuses the native confirmation dialog and guarded journal write path. Cancel receives initial focus. Success clears all pages and stale edits; cancellation or failure preserves the collection. Preferences, unrelated storage, and unsaved composer writing remain intact.
- Empty and unreadable journals disable delete-all with explanatory text. Malformed journal data is never treated as permission to overwrite it.
- No dependencies or product features outside the milestone were added. Slightly stronger light-theme control boundaries and save-button colors support contrast.

## Initial implementation verification

- `node node_modules/vitest/vitest.mjs run tests/unit`: 48 tests passed in 4 files.
- `node node_modules/@playwright/test/cli.js test`: 25 Chromium tests passed, including all existing regression tests.
- `node node_modules/vite/bin/vite.js build`: passed.
- `git diff --check`: passed.
- `npm run test:unit` and `npm run build` could not start because npm is not on this environment's PATH; the installed script entry points above were used instead. The first sandboxed Vitest attempt could not spawn workers (EPERM); the permitted rerun passed. The first browser run found two ambiguous selectors in new tests (23 passed, 2 failed); selectors were corrected and the complete suite passed.
- A later run on the long-running development server had one unexpected page reload clear composer input (24 passed, 1 failed). A fresh-server run with editing paused passed all 25 tests without changing or weakening the existing test.
- Rendered Chromium screenshots inspected at 1440×1100 and 390×844: Settings Light/Dark, dark Home/All Entries, Large writing/reading/editing, and desktop/mobile confirmation. Automated narrow-width checks also cover 320 pixels.
- Final production-build inspection also covered dark validation, empty history, preference-write failure with retry, and unreadable-journal protection, with no page errors. Screenshots were generated as local ignored QA artifacts under `test-results/visual/`.
- Keyboard checks cover native radio arrows, heading focus, dialog initial focus, forward/backward Tab containment, Cancel/Escape, and restored focus. Representative palette text pairs exceed 4.5:1; input boundaries were strengthened to exceed 3:1 against light surfaces.
- No application page errors or Settings horizontal overflow were observed during visual inspection. Physical-device and screen-reader testing remain human review activities; no claim of a full WCAG audit is made.

## Acceptance criteria

These implementation/verification results supported the human milestone approval recorded above.

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-01 Settings integration | Pass | Desktop/mobile navigation and heading focus |
| AC-02 Visual consistency | Pass | Desktop/mobile screenshot comparison with mockups |
| AC-03 Appearance control | Pass | Labeled native single-choice group |
| AC-04 Immediate appearance updates | Pass | Browser appearance flow |
| AC-05 Dark-mode completeness | Pass | Shared tokens and rendered view/dialog/state inspection |
| AC-06 System behavior | Pass | Live emulated OS changes and explicit overrides |
| AC-07 Appearance persistence | Pass | Storage combinations and reload flow |
| AC-08 Text-size control | Pass | Labeled native single-choice group |
| AC-09 Text-size application | Pass | Computed writing/reading sizes; unchanged UI sizes |
| AC-10 Text-size persistence | Pass | Storage combinations and reload flow |
| AC-11 Privacy information | Pass | Complete local-only storage explanation |
| AC-12 Delete-all confirmation | Pass | Explicit permanent-deletion dialog |
| AC-13 Safe cancellation | Pass | Cancel/Escape preserve storage and entries |
| AC-14 Complete deletion | Pass | Eleven-entry multi-page deletion and reload |
| AC-15 UI synchronization | Pass | Empty Home/history, page reset, stale edit removal |
| AC-16 Preference preservation | Pass | Preferences and unrelated storage unchanged |
| AC-17 Storage robustness | Pass | Invalid/malformed/unavailable/failed storage tests |
| AC-18 Accessibility | Pass | Native semantics, keyboard flows, focus and contrast checks |
| AC-19 Responsive behavior | Pass | Desktop/mobile inspection and 320px bounds checks |
| AC-20 Regression protection | Pass | Existing journal/persistence/pagination/navigation suite |
| AC-21 Automated verification | Pass | Unit tests, browser suite, production build |
| AC-22 Quality threshold | Pass | No known high-severity defect after verification |

## Final correction pass

- Routine save, edit, and delete success announcements now clear after 3.5 seconds or immediately on a view change. Replacing an announcement cancels its pending frame and dismissal timer, preventing stale announcements or premature dismissal of newer feedback. The existing polite status region is retained; validation and storage errors are not automatically dismissed.
- Appearance now permanently describes System with the approved sentence: "Choose Light or Dark, or let System follow your device's appearance." Preference behavior and layout are unchanged.
- Five focused browser tests use Playwright's controlled clock to cover dismissal, consecutive successes, queued-announcement cancellation, persistent errors, and the exact description wrapping at 320 pixels.
- Correction verification: 48 Vitest tests passed; all 30 Playwright tests passed (including the five new tests); production build and `git diff --check` passed. Work was left uncommitted for human review at this stage.

## Final navigation and visual refinements

- Approved hashes are Home `#home`, All Entries `#entries`, and Settings `#settings`. Startup and hash/history changes use the existing view-management function. Clicks use native history without duplicate entries for the active destination; missing/invalid hashes are replaced with canonical Home. The fragment-only URLs preserve the current project path and query for static hosting.
- Browser transitions preserve drafts, close mobile navigation, dismiss success feedback, and reset All Entries to page one when opened. Direct URLs and reload retain the requested view. Two existing reload tests now explicitly navigate to Home before checking its contents, while also checking the preserved All Entries view.
- Delete-all now uses a soft blush fill, thin red border, centered decorative trash SVG and label, generous padding, and restrained hover/pressed/disabled states. Dark-mode colors preserve the soft destructive treatment. Confirmation, deletion, storage, and preference logic were not changed.
- Ten focused navigation tests cover clicks, direct URLs, reload, Back/Forward, fallback, duplicate selection, mobile navigation, project paths, notifications, and draft/pagination behavior. The existing cancellation test additionally checks the icon, accessible name, and keyboard activation.
- Production-preview browser inspection compared desktop (1440×1100) and mobile (390×844) Light/Dark Settings and Data cards with both approved mockups. Hover and keyboard focus were inspected. Default/hover/pressed button text contrast measured 4.56:1–6.14:1; no horizontal overflow or page errors were observed. Automated narrow-width coverage remains at 320 pixels.
- Initial browser runs each passed 39 of 40 tests; the new fallback test's total-history-length assertions were incorrect for same-document navigation and truncated forward history. Replacing them with direct Back-navigation checks corrected the test without changing application behavior or removing any existing coverage.
- Final verification: `node node_modules/vitest/vitest.mjs run tests/unit` passed all 48 tests; `node node_modules/@playwright/test/cli.js test` passed all 40 tests, including a final run against the production preview; `node node_modules/vite/bin/vite.js build` and `git diff --check` passed. Work was left uncommitted until explicit human acceptance and checkpoint authorization.
- The temporary, untracked `visual-qa.mjs` script was intentionally removed after screenshot inspection. No application, test, or package script depends on it; it is not part of the Git checkpoint. Generated build/test artifacts remain ignored.

### Refinement acceptance criteria

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-F01 | Pass | Three approved hashes |
| AC-F02 | Pass | Synchronized URL, view, and current navigation |
| AC-F03 | Pass | Direct URL and reload browser tests |
| AC-F04 | Pass | Back/Forward browser tests and production inspection |
| AC-F05 | Pass | Missing/invalid fallback and canonical history checks |
| AC-F06 | Pass | Fragment-only path/query preservation; no routing dependency |
| AC-F07 | Pass | Desktop/mobile mockup comparison, filled button and SVG |
| AC-F08 | Pass | Keyboard, name, narrow layout, Light/Dark contrast and focus |
| AC-F09 | Pass | Existing bulk-delete and storage-safeguard regressions |
| AC-F10 | Pass | Existing journal/Settings/feedback/pagination regressions |
| AC-F11 | Pass | Unit/browser suites and production build |
| AC-F12 | Pass | No known high-severity regression after verification |

## Human acceptance checklist

Milestone acceptance was explicitly confirmed by the human developer after manual review, including the final navigation and button refinements.

- Compare Settings spacing, typography, and selected/focus states in both themes on desktop and mobile.
- Change OS appearance while System is selected, then select an explicit theme and reload.
- Try each text size while composing, reading, and editing, especially Large on a phone.
- Cancel bulk deletion, then confirm it with several entries; check both journal views and reload to confirm preferences remain.
- Review dialog keyboard behavior and the privacy/storage language.

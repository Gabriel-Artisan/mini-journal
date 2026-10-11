# Mini Journal

A private, lightweight place to write short reflections and revisit them in the same browser. A static application built with vanilla JavaScript, CSS, and Vite; no account or backend is required.

## Version 1 capabilities

- Create plain-text entries up to 1,000 characters; edit without changing their creation time.
- Home shows the composer and three recent entries. All Entries shows the full history, newest first, in pages of ten.
- Confirm before deleting one entry or permanently deleting all entries.
- Choose Light, Dark, or System appearance and Small, Medium, or Large writing/reading text.
- Persist saved entries and preferences locally, with clear validation and storage-failure feedback.
- Desktop/mobile navigation and keyboard controls.
- Reopen and journal offline after the production page reports that offline preparation is ready.
- Reject stale tab writes, keeping unsaved drafts and newer saved entries intact.

**Release status:** the human developer accepted Version 1 and authorized publication on October 11, 2026; see the [release audit](docs/milestones/05-release-preparation.md). Confirm the deployment workflow and actual HTTPS application before marking the public release complete.

## Local development

Use Node.js 24 and npm. From the repository root:

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open the URL printed by Vite. Development uses `/`; production uses `/mini-journal/`.

## Checks and production preview

```sh
npm run test:unit
npm run test:e2e
# Or run both:
npm test

npm run build
npm run test:production
npm run preview
```

The build writes `dist/`. Open `http://localhost:4173/mini-journal/` for the default preview. Production tests start their own preview on port 4174 and run the complete Chromium suite at the project path; build first. Keep port 4174 free. On Linux CI, install the browser and OS dependencies with `npx playwright install --with-deps chromium`.

## GitHub Pages

Repository: `Gabriel-Artisan/mini-journal`; default branch: `main`. The intended project URL is [Mini Journal on GitHub Pages](https://gabriel-artisan.github.io/mini-journal/). This URL is a deployment target, not a claim that the site is published or verified.

The [workflow](.github/workflows/deploy.yml) runs locked dependency installation, unit/browser tests, the production build, and production browser tests. Pull requests to `main` run checks only. Pushes to `main` and manual runs on `main` deploy only after all checks pass. Official GitHub actions are pinned to release commits; deployment uses GitHub's automatic token and OIDC, with no personal credentials or third-party deployment action.

After human approval of the release:

GitHub Pages must be available for the repository's visibility and account plan. The initial release attempt found this private repository's current plan does not support Pages; publication requires a supported plan or separate human approval to make the repository public.

1. Authorize the Git commit, push, and first publication. Pushing this workflow to `main` can trigger deployment.
2. In repository **Settings → Pages**, select **GitHub Actions** as the source. Configure the `github-pages` environment to allow `main`; use required reviewers if individual deployment approval is wanted and supported by the repository plan.
3. Push the approved changes to `main`, or run the workflow manually on `main`. Confirm both build and deploy jobs succeed and use the deployment job's reported URL.
4. At the actual HTTPS URL, verify JS/CSS requests succeed; test Home, `#entries`, and `#settings` directly, reload, and Back/Forward. Create, edit, reload, cancel/confirm deletion, and change/reload Settings using disposable entries.
5. Check a mobile viewport and keyboard navigation. Wait for “Ready for offline use in this browser,” then disconnect, reopen, create/edit/delete, and restart the browser offline. Verify that stale writes from a second tab are rejected with their drafts retained.

If the repository name or hosting domain changes, review `vite.config.js`, the production test URL, and these instructions. Hash navigation needs no server rewrite or custom 404 route. See the official [Vite Pages guide](https://vite.dev/guide/static-deploy.html#github-pages) and [GitHub workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Privacy and browser storage

Journal content is rendered as plain text and is not sent by the application over the network. Hosting still serves the application files. Saved entries use `mini-journal.entries.v1`; preferences use `mini-journal.preferences.v1` in `localStorage`. Bulk deletion preserves preferences and unrelated storage.

Storage belongs to the browser profile and web origin. Another device, browser, private session, port, or domain will have different data; local development entries will not appear on GitHub Pages. Clearing site data, browser eviction, or private-session closure can remove entries. Storage can be blocked or fill up. Failed writes preserve unsaved text for retry; unreadable journal data blocks writes to avoid overwriting it.

There is no backup, export, synchronization, or encryption layer. Unsaved drafts do not survive reload or browser closure. Tabs do not automatically synchronize or merge changes: a stale tab's write is rejected. Copy unsaved writing before reloading to review the latest journal. An exclusive Web Lock protects each journal comparison/write from simultaneous saves in cooperating app tabs. Projects on the same GitHub Pages origin share browser storage, so paths do not provide isolation from other applications on that origin.

## Offline use and browser compatibility

The production worker caches built application files only. Wait for the readiness message after the first online visit before reopening offline. Preparation failures leave the journal usable online and explain how to retry. Clearing or evicting site data can remove offline resources and entries; an initial offline visit cannot load the app.

Updates install a complete new cache and wait until existing Mini Journal tabs close. Close all app tabs after saving your work, then reopen to use an installed update. No forced reload or draft deletion occurs. Only obsolete Mini Journal caches for this project path are removed; unrelated caches are retained.

Use a browser with Service Workers, CacheStorage and Web Locks over HTTPS (or supported localhost development). If offline APIs are unavailable, offline preparation reports failure. If Web Locks is unavailable, saved entries remain readable and Settings remain usable, but journal writes are refused to protect data. See [Web Locks compatibility](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API#browser_compatibility). Automated browser verification covers Chromium; other browser/device checks remain part of human release review. Old app versions or unrelated same-origin scripts that ignore the lock are outside its protection; close obsolete tabs when upgrading.

## Project references

- [Product specification](docs/product.md)
- [Design specification and mockups](docs/design.md)
- [Technical specification](docs/technical.md)
- [Milestone 5 audit and verification](docs/milestones/05-release-preparation.md)

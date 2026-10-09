# Mini Journal — Version 1 Technical Specification

`docs/product.md` defines product behavior and scope. `docs/design.md` and the approved mockups in `docs/mockups/` define visual and interaction intent. This document defines the Version 1 implementation approach.

## Frontend and tooling

- Build the application with vanilla HTML, modern CSS, and modern JavaScript using ES modules.
- Do not use a frontend framework in Version 1.
- Prefer semantic HTML and accessible native controls over custom equivalents.
- Use Vite for local development and production builds.
- Use npm for dependency management and project scripts.

## Architecture

Keep the application small and modular, with clear boundaries between:

- Application startup and orchestration
- Journal data and domain rules
- Browser persistence
- UI rendering and interaction behavior
- Styling and responsive presentation

A reasonable initial structure is:

```text
index.html
src/
  app.js
  journal.js
  storage.js
  ui.js
  styles.css
tests/
  unit/
  e2e/
```

This is a starting point, not a requirement to create files or abstractions before they have a clear responsibility. Keep domain and persistence behavior independently testable where practical, and keep `app.js` focused on startup and coordination.

## Persistence and data model

- Use browser `localStorage` as the only persistent store.
- Encapsulate all direct `localStorage` access in a dedicated storage module. Journal domain and UI code must not read or write storage directly.
- Store the complete journal entry collection as structured JSON under a dedicated journal storage key.
- Treat a missing journal key as an empty collection. Parse and validate restored data before it enters application state, including the collection shape and every entry's `id`, `content`, and `createdAt` values.
- Distinguish missing data from malformed, invalid, or unreadable data. Do not silently replace unreadable data with an empty collection, and block ordinary journal writes from overwriting it until the problem is deliberately resolved.
- Handle unavailable storage, access exceptions, quota errors, serialization failures, and failed writes without crashing. Return actionable failure results to application coordination rather than falsely reporting success.
- Coordinate storage and in-memory state so a failed create, edit, or delete does not appear committed. Preserve the user's unsaved creation or edit text for retry, and leave entries intact when deletion persistence fails.
- Milestone 3 persists journal entries only. Appearance and writing text-size persistence remain approved Version 1 behavior but are deferred to the later Settings milestone and must use storage separate from the journal collection.
- Version 1 has no backend, database, account system, or network persistence.

Each journal entry contains only:

- A locally unique `id`
- Plain-text `content`
- A `createdAt` timestamp

Editing changes only the content and preserves the original creation timestamp. Do not add persisted fields unless an approved product requirement needs them.

## Views and responsive behavior

- Home contains the entry composer and a limited set of recent entries.
- All Entries provides the complete history in reverse chronological order through client-side pages of 10 entries.
- Pagination operates on the restored in-memory collection and never changes how the complete collection is stored. Do not introduce server-side pagination or network requests.
- Opening All Entries resets it to page 1. Expose First, Previous, Next, and Last controls plus current-page and visible-range indicators derived from the current collection.
- Disable boundary controls appropriately. Recalculate and clamp the current page after collection changes so empty collections, partially filled final pages, and deletions cannot leave an invalid page state.
- Settings contains appearance, writing text-size, privacy and storage information, and delete-all controls.
- Desktop navigation exposes Home, All Entries, and Settings directly. Mobile navigation provides the same destinations through a hamburger menu.
- Preserve the responsive layouts and interaction hierarchy defined in `docs/design.md`, including the two-column desktop Home and single-column mobile flow.
- Use lightweight hash navigation: Home is `#home`, All Entries is `#entries`, and Settings is `#settings`. Read the hash on startup, direct navigation, reload, and browser Back/Forward; route every transition through the existing view-management logic.
- Navigation clicks add a history entry only for a different destination. Replace missing or unsupported hashes with canonical `#home` without adding an extra history entry. History navigation applies the same focus, mobile-menu closing, success-feedback dismissal, and All Entries page-one behavior as navigation clicks.
- Change only the URL fragment, preserving the current path and query. This supports static GitHub Pages project paths without server routes or a routing dependency. Asset base-path configuration remains deferred to deployment.

## Settings and destructive actions

- Persist Appearance as one of Light, Dark, or System.
- Persist Writing text size as one of Small, Medium, or Large.
- System appearance follows the browser or operating-system preference and responds appropriately when that preference changes.
- Delete all journal entries removes only journal data. It must not reset appearance, writing text size, or other unrelated preferences.
- Individual deletion and delete-all require the confirmations defined by the product specification; delete-all must clearly communicate that it is irreversible.

Milestone 4 implementation:

- `storage.js` stores `{ appearance, textSize }` under `mini-journal.preferences.v1`, separately from the unchanged `mini-journal.entries.v1` collection. Preference fields are validated independently; missing or malformed values fall back without an automatic write. Read/write failures return explicit results.
- `preferences.js` restores preferences at application startup, before loading/rendering journal data. It applies the resolved `data-theme` and selected `data-text-size` to the document, synchronizes native radio controls, and responds to system appearance changes. The stored System choice remains distinct from the resolved theme.
- Shared CSS tokens cover Light/Dark surfaces and writing/reading sizes. Text-size tokens affect journal textareas and entry content only.
- Bulk deletion uses the existing guarded `saveEntries([])` operation, followed by a state/render update only on success. It never clears storage indiscriminately or bypasses the Milestone 3 read-failure lock. The shared native modal starts on Cancel, traps Tab navigation, supports Escape/backdrop cancellation, and restores appropriate focus.

## Testing

- Use Vitest for focused unit and integration tests covering journal logic, stored-data validation and restoration, missing and malformed data, read and write failures, pagination calculations and boundary changes, settings, and related application behavior.
- Use Playwright for a small set of critical browser flows.
- Milestone 3 end-to-end coverage must include create → reload, multiple-entry restoration, edit → reload, persistent deletion, storage-failure feedback with preserved writing, safe malformed-data handling, pagination navigation and indicators, and regression coverage for existing journal interactions.
- Later Version 1 end-to-end coverage should add settings persistence and confirmed bulk deletion when those features are implemented.
- Keep tests deterministic and proportional to the application. Avoid duplicating implementation details or building unnecessary test infrastructure.

## Security and data handling

- Render journal content as text, never as executable HTML. Do not inject user content with HTML-rendering APIs.
- Do not transmit journal content over the network.
- Do not place secrets, credentials, or sensitive configuration in the client application or repository.
- Validate user input and stored data at application boundaries.
- Treat destructive operations carefully and require the approved confirmations.

## Accessibility

- Preserve keyboard access, logical focus order, visible focus states, semantic controls, appropriate labels, sufficient contrast, and reasonable touch targets.
- Ensure dialogs and mobile navigation manage focus and expose state to assistive technology.
- Respect reduced-motion preferences for nonessential transitions.
- Verify all core functionality at representative desktop and mobile sizes.

## Deployment

- Build Version 1 as a static Vite application for GitHub Pages.
- When deployment is introduced, use GitHub Actions to install dependencies, run checks, build the production output, and deploy it.
- Account for GitHub Pages project-path asset URLs in Vite configuration.
- Do not add deployment configuration or workflows until explicitly requested.

## Implementation boundaries and risks

Version 1 should remain a client-only application with a small dependency set and no framework, service layer, backend, or speculative abstraction. Modules should communicate through narrow functions and plain data. The product and design specifications take precedence over incidental details in the mockups.

Key considerations are the limited durability and capacity of `localStorage`, distinguishing missing data from unreadable data, preventing accidental overwrite after restoration failure, keeping in-memory state consistent with successful writes, preserving unsaved text when writes fail, maintaining valid pagination after collection changes, safe handling of user content, consistent theme and preference behavior, irreversible deletion, responsive navigation and focus management, and GitHub Pages base-path handling. Address these directly without expanding Version 1 into backup, sync, account, or infrastructure work.

Favor the simplest maintainable architecture that fully satisfies the approved specifications. Add abstractions, dependencies, services, or infrastructure only when a clear Version 1 requirement justifies them.

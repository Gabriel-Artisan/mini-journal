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
- Encapsulate all direct `localStorage` access in a dedicated storage module. UI code should use that module rather than reading or writing storage directly.
- Store the journal entry collection as structured JSON.
- Persist appearance and writing text-size preferences separately from journal entries so entry deletion does not unexpectedly reset preferences.
- Version 1 has no backend, database, account system, or network persistence.
- Validate parsed data before use. Recover safely from missing or malformed data, unavailable storage, quota errors, and failed writes without discarding unsaved user input.

Each journal entry contains only:

- A locally unique `id`
- Plain-text `content`
- A `createdAt` timestamp

Editing changes only the content and preserves the original creation timestamp. Do not add persisted fields unless an approved product requirement needs them.

## Views and responsive behavior

- Home contains the entry composer and a limited set of recent entries.
- All Entries contains the complete history in reverse chronological order.
- Settings contains appearance, writing text-size, privacy and storage information, and delete-all controls.
- Desktop navigation exposes Home, All Entries, and Settings directly. Mobile navigation provides the same destinations through a hamburger menu.
- Preserve the responsive layouts and interaction hierarchy defined in `docs/design.md`, including the two-column desktop Home and single-column mobile flow.
- Implement view navigation without adding a routing dependency unless a demonstrated need emerges.

## Settings and destructive actions

- Persist Appearance as one of Light, Dark, or System.
- Persist Writing text size as one of Small, Medium, or Large.
- System appearance follows the browser or operating-system preference and responds appropriately when that preference changes.
- Delete all journal entries removes only journal data. It must not reset appearance, writing text size, or other unrelated preferences.
- Individual deletion and delete-all require the confirmations defined by the product specification; delete-all must clearly communicate that it is irreversible.

## Testing

- Use Vitest for focused unit and integration tests covering journal logic, validation, storage parsing and failures, settings, and related application behavior.
- Use Playwright for a small set of critical browser flows.
- End-to-end coverage must include the essential create → edit → reload/persist → delete workflow. Add focused coverage for critical Version 1 acceptance behavior such as navigation, settings persistence, and confirmed bulk deletion where it provides meaningful confidence.
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

Key considerations are the limited durability and capacity of `localStorage`, malformed or unavailable stored data, preserving unsaved text when writes fail, safe handling of user content, consistent theme and preference behavior, irreversible deletion, responsive navigation and focus management, and GitHub Pages base-path handling. Address these directly without expanding Version 1 into backup, sync, account, or infrastructure work.

Favor the simplest maintainable architecture that fully satisfies the approved specifications. Add abstractions, dependencies, services, or infrastructure only when a clear Version 1 requirement justifies them.

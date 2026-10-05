# Milestone 1 — Project Foundation & Home Shell

## Goal

Establish the Vite/npm foundation and implement the approved responsive Home interface. The result should look and feel like Mini Journal on desktop and mobile while all journal data behavior remains intentionally unimplemented.

## Scope

- Vanilla HTML, modern CSS, and JavaScript ES modules organized into small startup, UI, and styling files
- Vite development and production build setup managed with npm
- Semantic, accessible Home markup with Mini Journal branding, tagline, active Home navigation, and visible non-navigating placeholders for All Entries and Settings
- Accessible mobile hamburger navigation treatment
- Responsive two-column desktop layout and single-column mobile flow
- Paper-like composer with current date, prompt, labeled textarea, live `0 / 1,000`-style count, and shell-only Save entry button
- Recent Entries section with representative static text-only cards, date/time metadata, and shell-only Edit and Delete controls
- Approved warm-neutral, soft-blue, editorial, and restrained botanical visual language
- Visible keyboard focus states, appropriate labels, heading hierarchy, readable spacing, and comfortable touch targets

## Acceptance criteria

- The app starts through Vite and produces a successful production build.
- Home is the initial and visibly active view.
- All Entries and Settings remain visible placeholders; activating either does not change the URL or active Home state.
- Desktop presents the composer on the left and recent entries on the right with direct primary navigation.
- Mobile presents a comfortable single-column flow and hamburger navigation without horizontal overflow.
- The composer and static entry cards contain all approved shell content and controls.
- Keyboard focus is visible and native controls have accessible names.
- The browser console has no blocking application errors.
- No journal CRUD, persistence, permanent data model, or real-entry loading is present.
- Recent Entries has no separate View all entries link.

## Non-goals

- Real create, edit, delete, persistence, `localStorage`, permanent journal models, or dynamic entries
- Completed All Entries or Settings views and all settings, privacy/storage, or delete-all behavior
- Backend services, deployment configuration, or GitHub Pages workflows
- A frontend framework, speculative abstractions, unrelated refactors, or unnecessary test infrastructure

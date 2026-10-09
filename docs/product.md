# Mini Journal — Version 1 Product Specification

## Product purpose

Mini Journal is a private, lightweight place to record short thoughts and revisit them later. Version 1 should provide a dependable journaling experience without requiring setup, an account, or an internet connection.

## Target user

A person who wants a fast, low-friction way to keep brief journal entries on a single device and values simplicity over advanced organization or social features.

## Core user flow

1. The user opens Home and sees a clear entry composer and a limited set of recent entries.
2. The user writes a short entry and saves it.
3. The saved entry appears in the journal, with the newest entry first.
4. The user can edit an existing entry and save the updated content.
5. The user can open All Entries to browse their complete journal history in pages of 10 entries.
6. The user can open Settings to adjust appearance and writing text size, review privacy and storage information, or delete all entries.
7. The user can return in a later browser session and find the entry still available.
8. The user can delete an entry they no longer want, with protection against accidental deletion.

## Version 1 scope

- Create and save a non-empty, plain-text journal entry.
- Edit an existing entry without changing its creation timestamp.
- Provide three primary views: Home, All Entries, and Settings.
- Provide direct access to the primary views through desktop navigation; mobile navigation may use a hamburger menu.
- Show the entry composer and a limited set of recent entries on Home.
- Show the complete journal history in reverse chronological order in All Entries, using client-side pagination with 10 entries per page.
- Show when each entry was created.
- Delete an individual entry after a clear confirmation step.
- In Settings, provide Light, Dark, and System default appearance options; Small, Medium, and Large writing text sizes; and clear privacy and storage information explaining that journal data remains only in the current browser and device and is not sent to an account, server, or cloud service.
- Provide a Delete all journal entries action in Settings with strong confirmation that the deletion is irreversible.
- Store entries locally in the user's browser so they persist across sessions on that browser and device.
- Provide useful empty, validation, and storage-error states.
- Support comfortable use on common desktop and mobile screen sizes.
- Support keyboard use and basic assistive-technology expectations.

## Version 1 non-goals

- Accounts, authentication, or multiple user profiles
- Cloud storage, synchronization, backup, or cross-device access
- Collaboration, sharing, comments, or public journals
- AI-generated content or analysis
- Categories, tags, search, filtering, or sorting controls
- Extensive themes, custom fonts, or custom colors
- Export, import, or backup
- Rich text, images, attachments, or multimedia
- Reminders, prompts, streaks, or notifications
- Backend services, databases, or APIs

## Basic UX principles

- Keep the primary action—writing and saving an entry—immediately visible and easy to understand.
- Minimize steps and visual clutter; the app should feel calm and focused.
- Give immediate, clear feedback for save, validation, deletion, and storage failures.
- Prevent empty entries and reduce accidental deletion without making routine actions cumbersome.
- Use readable typography, sufficient contrast, visible focus states, descriptive controls, and sensible touch targets.
- Preserve entered text if a save attempt fails.
- Make the layout responsive without hiding core functionality on smaller screens.
- Be transparent that entries are stored only in the current browser and may be lost if browser data is cleared.

## Data that must be stored

Each entry must contain:

- A locally unique identifier
- The plain-text entry content
- A creation timestamp

The collection and the user's appearance and writing text-size preferences must be stored in browser-local persistent storage. No journal content should be sent over a network in Version 1.

## Milestone 3 — Persistence

Milestone 3 persists journal entries only. Appearance and writing text-size persistence remain Version 1 requirements but belong to the later Settings milestone.

Approved behavior:

- Use browser `localStorage` as the sole persistent store and keep all storage access behind a dedicated storage module.
- Serialize the complete journal collection as structured JSON under a dedicated storage key and restore it on startup.
- Persist successful create, edit, and individual-delete operations while retaining only `id`, `content`, and `createdAt` for each entry.
- Treat missing journal data as an empty collection. Validate stored data before use, and handle malformed or invalid data, unavailable storage, quota errors, and failed writes without crashing.
- Do not silently replace unreadable or invalid stored data with an empty collection. Prevent ordinary writes from overwriting it until the condition is deliberately resolved.
- Never report a failed save or deletion as successful. Preserve unsaved writing, explain the failure clearly, and allow the user to retry.
- Keep Home and All Entries synchronized with the same journal state. Editing preserves the entry ID and original creation timestamp.
- In All Entries, present 10 entries per page, newest first. Provide First, Previous, Next, and Last controls; current-page and visible-range indicators; correct disabled states; and valid behavior for empty, partial, and changing collections. Opening All Entries starts on page 1.
- Pagination affects presentation only. The complete collection remains in browser-local storage; no server-side pagination or network transmission is introduced.

### Milestone 3 acceptance criteria

1. **AC-01:** New valid entries persist after reload.
2. **AC-02:** Multiple entries persist with their IDs, content, and timestamps intact.
3. **AC-03:** Edited content persists without changing the entry ID or creation timestamp.
4. **AC-04:** Individual deletions persist without affecting other entries.
5. **AC-05:** Stored entries are restored on startup; Home displays limited recent entries, and All Entries displays the complete history newest first, paginated at 10 entries per page.
6. **AC-06:** Missing stored data initializes an empty journal without errors.
7. **AC-07:** Malformed or invalid stored data is handled safely without crashes or silent overwriting.
8. **AC-08:** Storage failures produce clear feedback without losing unsaved writing or falsely confirming success.
9. **AC-09:** Journal content remains browser-local, is rendered safely as plain text, and is never sent to a server.
10. **AC-10:** Relevant Vitest and Playwright tests pass, including persistence, failure handling, pagination, and regression coverage.
11. **AC-11:** Pagination provides First, Previous, Next, and Last navigation, current-page and entry-range indicators, appropriate disabled states, and correct handling of empty or changing collections.

## Milestone 4 — Settings

The Settings implementation adds persistent appearance and writing text-size preferences, local-storage information, and confirmed bulk deletion. Missing or invalid preference values fall back independently to System appearance and Medium text size. Failed preference writes apply the choices for the current session, explain that they were not saved, and allow retry.

Delete-all preserves preferences and unsaved composer text, invalidates edits to deleted entries, and commits the empty collection only after storage succeeds. It is unavailable for an empty journal or when the existing unreadable-data safeguard blocks journal changes; it does not introduce a recovery mechanism.

See [the Milestone 4 review record](milestones/04-settings.md) for implementation decisions, acceptance criteria, and verification.

## Definition of done for Version 1

Version 1 is done when:

- A user can create a valid entry and see it appear immediately.
- A user can edit an existing entry, and the updated content persists across sessions without changing the entry's creation timestamp.
- Entries remain available after closing and reopening the app in the same browser.
- Home shows the composer and a limited set of recent entries, while All Entries shows the complete journal history in reverse chronological order with creation times.
- Home, All Entries, and Settings are reachable through clear desktop and mobile navigation.
- Appearance and writing text-size settings apply correctly and persist across sessions, and the privacy and storage information is accurate and visible.
- A user can delete one entry without affecting others, and accidental deletion is reasonably guarded against.
- A user can delete all entries only after a strong confirmation that clearly communicates the action is irreversible.
- Empty input and storage failures are handled clearly without losing unsaved text.
- The complete flow is usable with a keyboard and on representative desktop and mobile viewport sizes.
- User-provided content is rendered as text rather than executable markup.
- Automated tests cover the core create, edit, load, display, navigation, settings, validation, persistence, and individual and bulk delete behaviors.
- Relevant project checks pass, and no known high-severity usability, accessibility, security, or data-loss defects remain.

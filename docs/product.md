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
5. The user can open All Entries to browse their complete journal history.
6. The user can open Settings to adjust appearance and writing text size, review privacy and storage information, or delete all entries.
7. The user can return in a later browser session and find the entry still available.
8. The user can delete an entry they no longer want, with protection against accidental deletion.

## Version 1 scope

- Create and save a non-empty, plain-text journal entry.
- Edit an existing entry without changing its creation timestamp.
- Provide three primary views: Home, All Entries, and Settings.
- Provide direct access to the primary views through desktop navigation; mobile navigation may use a hamburger menu.
- Show the entry composer and a limited set of recent entries on Home.
- Show the complete journal history in reverse chronological order in All Entries.
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

# Mini Journal — Version 1 Design Specification

The approved mockups in `docs/mockups/` are the visual reference for Version 1. `docs/product.md` remains the source of truth for product behavior and scope.

## Overall character

Mini Journal should feel calm, personal, reflective, modern, elegant, and warm. Combine a modern notebook experience with subtle botanical-journal and editorial influences. The result should feel like a private journal, not a dashboard or generic SaaS application.

## Color and visual language

- Build the light appearance from cream and warm-neutral surfaces with muted soft-blue accents inspired by the approved botanical artwork.
- Avoid strong green contrast. Reserve a restrained red treatment for destructive actions.
- Use soft shadows, subtle borders, rounded surfaces, generous whitespace, and paper-inspired cards to create depth without visual heaviness.
- Use botanical decoration sparingly, primarily around page edges or brand moments. It must not compete with controls or journal content.
- Keep the visual system cohesive across Home, All Entries, Settings, and confirmation states.

## Typography

- Use an elegant, readable serif style for the brand, important headings, and journal content where appropriate.
- Use a clean, highly readable sans-serif for navigation, controls, supporting copy, metadata, and status messages.
- Maintain a clear hierarchy through type scale, weight, spacing, and color. Do not sacrifice legibility for decorative character.

## Interaction style

- Interactions should feel gentle and fluid, with restrained transitions and prompt, calm feedback.
- Avoid aggressive motion, decorative animation, or effects that distract from writing and reading.
- Provide visible hover, active, selected, disabled, error, and keyboard-focus states. Do not rely on color alone to communicate state.
- Keep destructive actions visually distinct but proportionate; require clear confirmation for irreversible deletion.

## Responsive layout and navigation

- Desktop Home uses the approved two-column composition: a prominent composer on the left and recent entries on the right.
- Mobile Home becomes a single-column journal flow, with the composer before recent entries.
- Desktop navigation exposes Home, All Entries, and Settings directly and clearly indicates the current view.
- Mobile navigation uses a hamburger menu that provides access to the same three views.
- Preserve the content hierarchy and all core actions when layouts reflow; responsive behavior must not hide functionality.

## Journal entries

- Entries are text-only. Do not include image thumbnails, uploads, attachments, or decorative images inside entry cards.
- Present journal text as the primary content. Date and time metadata should be visibly secondary.
- Keep Edit and Delete clearly discoverable and accessible while visually quieter than the entry text.
- Edit entries inline within their existing card. Replace the journal text with a labeled textarea and show Save and Cancel controls; move focus into the textarea when editing begins, preserve the original content on Cancel, and keep validation feedback associated with the field.
- Use the same paper-like card treatment and spacing rhythm across recent entries and the complete history.

## Home

- Make the writing composer a prominent paper-like card.
- Include the entry prompt, textarea, character count, and Save entry action with clear input and feedback states.
- Show only a limited set of recent entries. The complete history belongs in All Entries.
- Keep writing as the strongest action and avoid adding secondary tools that dilute focus.

## All Entries

- Extend Home's typography, entry-card system, spacing, and visual language.
- Show the complete journal history in reverse chronological order.
- Do not add search, filtering, categories, tags, or sorting controls in Version 1.

## Settings

- Follow the structure and hierarchy of the approved desktop and mobile Settings mockups.
- Provide segmented choices for Appearance: Light, Dark, and System.
- Provide segmented choices for Writing text size: Small, Medium, and Large.
- Present Privacy & Storage information clearly, including the device-local nature and limitations of browser storage.
- Present Delete all journal entries as an unmistakably destructive action with strong confirmation before deletion.
- Dark mode should preserve the calm palette, layered surfaces, hierarchy, and accessible contrast rather than simply invert light-mode colors.

## Accessibility and responsive expectations

- Maintain sufficient text and control contrast in every appearance and interaction state.
- Use readable type sizes and line lengths, visible keyboard focus, semantic controls, descriptive labels, and logical focus order.
- Provide sensible touch targets and spacing on mobile without making desktop controls feel oversized.
- Support keyboard operation for navigation, composing, editing, deletion, confirmations, and settings.
- Verify that all core functionality remains understandable and usable at representative desktop and mobile sizes.

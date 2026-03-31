# Frontend Debug Mode

**Date:** 2026-03-31
**Sub-project:** `thelibrary/` (Frontend SPA)
**Status:** Draft

---

## Overview

Add a development-only debug mode to the frontend application that allows developers to browse every game screen (across all phases) without needing a real game session or backend connectivity. The debug mode is gated to `localhost` and provides a sequential navigator to cycle through all phase screens, each populated with realistic mock data. This enables rapid inspection of UI layout, component rendering, translations, and visual styling without playing through the full game flow.

## Goals

1. **Accelerate UI development** -- Developers can jump to any screen instantly instead of playing through the game to reach it.
2. **Validate translations** -- Every screen is viewable in any locale, making it easy to spot missing or broken i18n keys.
3. **Prevent production exposure** -- Debug mode is completely invisible outside of `localhost`.
4. **Zero backend dependency** -- All screens render from mock data; no API calls are made while in debug mode.

## User Stories

### US-1: Access debug mode from the start screen

**As a** developer working on localhost,
**I want to** see a "Debug Mode" button on the start screen,
**so that** I can enter the screen browser without starting a real game.

**Acceptance Criteria:**
- A clearly labeled debug-mode button (e.g., "Debug Mode" with a wrench/gear icon) appears on the start screen when the app is served from `localhost`, `127.0.0.1`, or the `file://` protocol.
- The button is **not rendered at all** (not merely hidden) when the hostname is anything other than the above.
- The button is visually distinct from the primary game buttons (e.g., secondary/outline style, smaller size) to signal that it is a dev tool, not a game feature.

### US-2: Browse all phase screens sequentially

**As a** developer in debug mode,
**I want to** navigate forward and backward through every phase screen,
**so that** I can inspect each one without restarting.

**Acceptance Criteria:**
- A fixed navigation bar (top or bottom of viewport) displays:
  - The current screen label (e.g., "Prologue", "Chapter I", "Epilogue -- Action 2", "Completed").
  - "Previous" and "Next" buttons to move between screens.
  - A counter showing position (e.g., "3 / 9").
- The ordered screen list covers all phases: **Start, Prologue, Chapter 1, Chapter 2, Chapter 3, Epilogue (Book Reveal), Epilogue Action 1, Epilogue Action 2, Epilogue Action 3, Epilogue Final, Completed**.
- "Previous" is disabled on the first screen; "Next" is disabled on the last screen.
- Each screen renders fully using mock game state (see US-3).

### US-3: Screens render with mock data

**As a** developer in debug mode,
**I want** every screen to display realistic placeholder data,
**so that** I can evaluate layout, typography, and translations accurately.

**Acceptance Criteria:**
- Mock data includes at minimum:
  - `character_name`, `genre`, `epoch` (string fields).
  - Three attributes (`body`, `mind`, `social`) with `base_value`, `background`, and `support` populated.
  - `current_phase` matching the screen being viewed.
  - `overcome_score` (integer).
  - `roll_results` array with one entry per past phase (attribute_type, outcome, dice values).
  - `books` array with at least one book object (color, binding, title).
  - `support_used` (boolean).
  - A small set of journal entries for the completed screen.
- Mock data is defined in a single constant object (or factory function) within a dedicated file (e.g., `public/js/debug.js`), not scattered across render functions.
- No API calls (`fetch`, `API.*`) are made while debug mode is active.

### US-4: Exit debug mode

**As a** developer in debug mode,
**I want to** return to the normal start screen,
**so that** I can resume normal app behavior.

**Acceptance Criteria:**
- The debug navigation bar includes an "Exit" or "Close" button.
- Clicking it clears any debug state and returns to the standard start screen.
- Exiting does not alter localStorage or any persisted game state.

### US-5: Language switching in debug mode

**As a** developer in debug mode,
**I want to** switch locales while browsing screens,
**so that** I can verify translations for every screen.

**Acceptance Criteria:**
- The language switcher (already present in the start screen) remains functional in debug mode.
- Changing the locale re-renders the current debug screen with the new locale's strings.

## Technical Approach

### Localhost detection

```js
function isLocalEnvironment() {
  const host = window.location.hostname;
  return host === 'localhost'
      || host === '127.0.0.1'
      || host === '::1'
      || window.location.protocol === 'file:';
}
```

This function should be called once at startup. If it returns `false`, the debug button is never added to the DOM.

### Debug screen list

Define an ordered array of "debug screen descriptors", each containing:
- `phase` -- the phase key (e.g., `prologue`, `chapter_1`, `epilogue_action_2`).
- `label` -- human-readable name for the nav bar.
- `renderFn` -- reference to the existing render function to call (e.g., `renderPrologueScreen`).

This mirrors the existing `PHASE_SCREENS` map but adds the start screen and separates the epilogue sub-screens explicitly.

### Mock state injection

Before rendering each debug screen:
1. Build a mock game object with all required fields.
2. Set `current_phase` to the phase being previewed.
3. Inject it into `State` via `State.setGame(mockGame)` (reusing the existing setter).
4. For screens that need a book (epilogue book reveal), also call `State.setCurrentBook(mockBook)`.
5. For screens that need a roll result, call `State.setGameWithRoll(mockGame, mockRoll)`.

After exiting debug mode, call `State.resetState()` and `State.hydrateFromStorage()` to restore real state.

### API call suppression

The simplest approach: the render functions already call `API.*` methods (e.g., `loadGameList`, `fetchJournalEntries`). Two options:

- **Option A (recommended):** Guard API calls inside render functions with a `if (isDebugMode()) return;` check, or pass a flag.
- **Option B:** Temporarily replace `API` methods with no-ops for the duration of debug mode.

Option A is preferred because it is explicit and does not rely on monkey-patching.

### Navigation bar

A fixed-position `<div>` with `position: fixed; bottom: 0;` (or top) containing the prev/next buttons, label, and counter. It should have a high `z-index` and a distinct background (e.g., semi-transparent dark bar) to be clearly identifiable as a debug overlay. Styles should go in a new `debug.css` file or be inlined in `debug.js`.

### File organization

| File | Purpose |
|------|---------|
| `public/js/debug.js` | Debug mode logic: mock data factory, screen list, navigation, enter/exit |
| `public/css/debug.css` | (Optional) Styles for the debug nav bar and debug button |

`debug.js` is imported in `app.js` only when `isLocalEnvironment()` returns `true`, using a dynamic `import()` so the file is never fetched in production.

### Integration with `app.js`

1. In `renderStartScreen()`, after the existing buttons, conditionally call a function from `debug.js` to append the debug button.
2. The debug button's click handler enters debug mode: renders the debug nav bar and the first screen.
3. All navigation is handled within `debug.js` by calling the existing `renderScreenForPhase()` / `showScreen()` functions from `app.js`, which must be exported or accessible.

**Assumption:** Some currently-unexported functions in `app.js` (like `showScreen`, `renderScreenForPhase`, `renderStartScreen`) may need to be exported so `debug.js` can call them. This is a minor refactor.

## Out of Scope

- **Backend changes** -- No API endpoints, controllers, or configuration changes.
- **Automated testing of debug mode** -- Manual verification is sufficient for a dev tool.
- **Editing mock data from the UI** -- The mock data is hardcoded; there is no form to customize it.
- **Performance profiling or memory debugging** -- This is purely a visual screen browser.
- **Responsive / mobile testing harness** -- Debug mode does not add viewport simulation; developers use browser DevTools for that.
- **Production feature flags** -- Debug mode is localhost-only, not behind a feature flag or environment variable.

## Dependencies

- **Existing screen render functions** -- `renderPrologueScreen`, `renderChapterScreen`, `renderEpilogueScreen`, `renderCompletedScreen` must remain callable with mock state. No changes to their signatures are expected.
- **State module (`state.js`)** -- The existing `setGame`, `setCurrentBook`, `setGameWithRoll`, and `resetState` exports are sufficient.
- **i18n module** -- The `t()` function and locale switching must work independently of API availability (they already do, since translations are bundled client-side).
- **No new external dependencies** -- Everything is vanilla JS/CSS, consistent with the project convention.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Render functions make API calls that fail without a backend | Medium | Medium | Guard API calls with a debug-mode check (Option A above) |
| Existing render functions have implicit dependencies on prior state mutations (e.g., a roll must have happened before chapter screen renders fully) | Medium | Low | Build mock data that satisfies all preconditions; test each screen manually |
| Exporting internal `app.js` functions could encourage tight coupling | Low | Low | Export only the minimum needed; document them as internal |
| `isLocalEnvironment()` could be spoofed | Low | None | Debug mode has no security implications; it is a UI convenience tool with no privileged actions |
| Mock data drifts out of sync with real API response shapes | Medium | Low | Keep mock data in one place; update it when API contracts change |

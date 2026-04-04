# LocalStorage Session Cleanup — Ephemeral Cache + API-Only Persistence

**Date:** 2026-04-04
**Status:** Draft — awaiting approval
**Affects:** `thelibrary/` (frontend only)

---

## Overview

Currently, the frontend uses `localStorage` for two distinct purposes that have become conflated:

1. **Session recovery** — `biblioteca_game_id` and `biblioteca_game_state` let the player resume a game after a page reload or accidental close. The "Continue Game" button on the start screen reads from these keys.
2. **Game listing** — `StartView.vue` fetches ALL games via `GET /api/games` (unfiltered by owner) and displays them as "Saved Games", alongside the localStorage-backed continue button.

With user authentication now in place, registered players have a proper persistence path: the "My Sessions" modal in `AuthSection.vue` loads the player's own sessions via `GET /api/player/sessions`. The localStorage-based recovery and the unfiltered game list on the start screen are now redundant and misleading.

This feature redefines localStorage as a **short-lived cache for the active game session only**. When the player leaves the game (exits to the start screen, logs out, or closes the browser), the localStorage game data is cleaned up. All long-term persistence flows through the API for authenticated users.

---

## Goals

- **Clean data lifecycle**: localStorage holds game data only while a game session is actively in progress. No stale data accumulates.
- **Single source of truth**: registered players resume games exclusively through "My Sessions" (`GET /api/player/sessions`), eliminating confusion from the duplicated unfiltered list.
- **Simpler start screen**: removing the "Saved Games" block and "Continue Game" button reduces visual noise and removes a confusing data path that showed all games regardless of owner.

---

## User Stories

### US-1: localStorage Cleared on Exit to Start Screen

> As a **player**, I want **my localStorage game data to be cleared when I exit the game and return to the start screen**, so that **no stale session data persists after I intentionally leave a game**.

**Acceptance Criteria:**

- [ ] When the player exits a game via the sidebar "Exit" button (which calls `gameStore.resetState()` and navigates to `/`), `biblioteca_game_id` and `biblioteca_game_state` are removed from localStorage.
- [ ] `resetState()` in `game.js` already removes `biblioteca_game_id` (verified in code); confirm that `biblioteca_game_state` is also explicitly removed (it currently is, via `_persistGameId(null)` which cascades).
- [ ] After exiting, returning to the start screen shows no "Continue Game" button (because `hasSavedGame` returns `false`).

### US-2: localStorage Cleared on Logout

> As a **registered player**, I want **my localStorage game data to be cleared when I log out**, so that **the next user on this device does not see my in-progress session**.

**Acceptance Criteria:**

- [ ] When the player logs out via `AuthSection.vue`, `gameStore.resetState()` is called in addition to `authStore.clearAuth()`.
- [ ] After logout, `biblioteca_game_id`, `biblioteca_game_state`, and `biblioteca_refresh_token` are all absent from localStorage.
- [ ] The start screen shows no "Continue Game" button and no stale game data.

### US-3: Remove the "Saved Games" Block from the Start Screen

> As a **registered player**, I want **the start screen to not show an unfiltered list of all games**, so that **I only see my own sessions through "My Sessions"**.

**Acceptance Criteria:**

- [ ] The `game-list-section` block in `StartView.vue` is removed entirely (the `<div v-if="gamesLoaded && games.length" ...>` block).
- [ ] The `onMounted` call to `API.fetchGames()` is removed (no more `GET /api/games` on page load).
- [ ] The `games`, `gamesLoaded`, `loadGameLoading` refs are removed from `StartView.vue`.
- [ ] The `loadGame()` and `formatDate()` functions are removed from `StartView.vue`.
- [ ] The i18n keys used exclusively by this block (`start.saved_games`, `start.load_game_aria`, `start.no_name`) may be left in place or removed; removing is preferred for cleanliness.

### US-4: Remove the "Continue Game" Button from the Start Screen

> As a **registered player**, I want **the start screen to not offer a localStorage-based "Continue Game" button**, so that **game resumption happens only through "My Sessions"**.

**Acceptance Criteria:**

- [ ] The `btn-continue-game` button is removed from `StartView.vue`.
- [ ] The `onContinueGame()` function is removed from `StartView.vue`.
- [ ] The `continueLoading` ref is removed.
- [ ] The `hasSavedGame` computed property in `game.js` is removed (no longer consumed by any component).
- [ ] The `hydrateFromStorage()` function in `game.js` is removed if no other component calls it. **Verify** by searching for usages before removing.
- [ ] The i18n key `start.continue_game` may be removed.

### US-5: Auto-Resume Active Session on Page Load (Optional Enhancement)

> As a **player with a game in progress**, I want **to be automatically redirected to my active game if localStorage still has valid session data**, so that **a page reload during gameplay does not dump me on the start screen**.

**Acceptance Criteria:**

- [ ] On app mount (in `App.vue` or the router guard), if `biblioteca_game_id` exists in localStorage, attempt to fetch the game from the API (`GET /api/games/{id}`).
- [ ] If the fetch succeeds and the game is not `completed`, navigate directly to the game's current phase.
- [ ] If the fetch fails (404, 403, network error), clear localStorage game data and show the start screen normally.
- [ ] This behavior only fires on initial page load, not on every route change.
- [ ] **Note**: This preserves the page-reload recovery behavior that currently exists via `hydrateFromStorage()` but routes it through the API for data freshness.

---

## Impact on Components

### Files to Modify

| File | Changes |
|------|---------|
| `src/stores/game.js` | Remove `hasSavedGame` computed. Remove `hydrateFromStorage()` if unused elsewhere. Ensure `resetState()` clears both `biblioteca_game_id` and `biblioteca_game_state` (already does). |
| `src/stores/auth.js` | No structural changes, but the `clearAuth()` call site in `AuthSection.vue` must also trigger `gameStore.resetState()`. |
| `src/views/StartView.vue` | Remove: `games` ref, `gamesLoaded` ref, `loadGameLoading` ref, `continueLoading` ref, `onContinueGame()`, `loadGame()`, `formatDate()`, `onMounted` fetch of `API.fetchGames()`, the "Continue Game" button, and the "Saved Games" list block. |
| `src/features/auth/AuthSection.vue` | In `logout()`, add a call to `gameStore.resetState()` before or after `authStore.clearAuth()`. |
| `src/layout/AppSidebar.vue` | No changes needed — `exitGame()` already calls `gameStore.resetState()` which clears localStorage. |
| `src/App.vue` or `src/router/index.js` | (US-5 only) Add auto-resume logic on initial load. |

### Files to Leave Unchanged

| File | Reason |
|------|--------|
| `src/api/index.js` | The `fetchGames` export can remain (backend endpoint still exists); it simply will no longer be called from `StartView`. |
| Backend (`oracles-api/`) | No backend changes. `GET /api/games` endpoint stays; it may be used by admin or future features. |

### Code to Remove

- `StartView.vue`: ~50 lines of template (saved games block + continue button) + ~30 lines of script (refs, functions, onMounted fetch).
- `game.js`: `hasSavedGame` computed (~1 line), `hydrateFromStorage()` (~7 lines) if confirmed unused.

---

## Out of Scope

- **Backend changes** — no API endpoints are created, modified, or removed.
- **Removing `GET /api/games` endpoint** — the endpoint may serve other purposes (admin, debugging, future features).
- **Guest/anonymous play support** — there are no guest users in the current system (all users are `ROLE_PLAYER`). This spec does not add or restore anonymous play.
- **Browser `beforeunload` cleanup** — we do NOT add a `beforeunload` listener to clear localStorage on tab/window close. The auto-resume logic (US-5) handles stale data on next visit. Adding `beforeunload` is fragile and unreliable across browsers.
- **Removing `biblioteca_refresh_token` from localStorage** — the refresh token lifecycle is managed by the auth store and is not part of this feature. It is only mentioned here in the context of logout cleanup (US-2), which already works via `authStore.clearAuth()`.

---

## Dependencies

- **User authentication is fully implemented** — login, registration, JWT refresh, and the "My Sessions" modal in `AuthSection.vue` are all functional. (Confirmed: auth was shipped in prior phases.)
- **`GET /api/player/sessions`** returns the authenticated user's sessions correctly. This is the replacement for the removed "Saved Games" list.
- **Router guards** must not interfere with the auto-resume redirect (US-5). The existing `beforeEach` guard in `router/index.js` should be reviewed to ensure it does not block navigation to game views when triggered programmatically on app init.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Removing "Continue Game" frustrates users who rely on page-reload recovery | Medium | Medium | US-5 (auto-resume on page load) preserves this behavior through the API. If localStorage has a valid game ID, the player is redirected automatically. |
| `hydrateFromStorage()` is called somewhere not yet identified | Low | Low | Search all files for `hydrateFromStorage` before removing. If found, evaluate whether the call site should use the API-based auto-resume instead. |
| Stale localStorage data from before this change causes confusion | Low | Low | The `resetState()` function already clears localStorage. Any stale data from a previous session will be ignored if auto-resume (US-5) fails the API check and clears it. |
| Removing the game list from the start screen makes the page feel empty for new users | Low | Low | The start screen retains: title/intro, "New Game" button, auth section (login/register or user info + "My Sessions"). The layout remains functional and clear. |

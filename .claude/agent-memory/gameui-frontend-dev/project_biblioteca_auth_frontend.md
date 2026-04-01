---
name: La Biblioteca Frontend Auth Flow (Phase 3)
description: Auth implementation decisions for the TTRPG frontend — token storage, module boundaries, UI patterns
type: project
---

Access token lives in JS memory only (`_state.authToken` in state.js). Refresh token persists in `localStorage` under key `biblioteca_refresh_token`.

**Auth module boundary:** `auth.js` owns all auth UI (forms, modals, session list). It communicates back to `app.js` via a custom DOM event `auth:resume-session` on `document` — this avoids a circular import between auth.js and app.js.

**Modal pattern:** A single `#auth-modal` div (`.modal-overlay.auth-modal`) is defined in index.html and shared by login, register, and My Sessions screens. The `hidden` attribute controls visibility; `auth.js` adds/removes it. The close button is `#auth-modal-close`; its click is handled by a delegated listener in `app.js`.

**Silent refresh on boot:** `init()` in app.js checks `State.getRefreshToken()` before rendering the start screen, exchanges it for a new access token via `API.refreshToken()`, then calls `API.fetchMe()` to populate `authUser`.

**401 retry in api.js:** `request()` takes an `isRetry = false` flag. On 401, if a refresh token is available it tries `POST /api/auth/refresh` inline, updates state, then retries with `isRetry = true` to prevent infinite loops. If refresh fails, it calls `clearAuth()` and lets the original error propagate.

**State continuity:** `resetState()` preserves `authToken` and `authUser` so auth survives starting a new game session.

**Why:** Spec-driven Phase 3 implementation for `iribarren/thelibrary`. Token-in-memory is a security requirement (no access token in localStorage).

**How to apply:** When extending auth (e.g. adding a profile page), follow the same module boundary: keep UI in `auth.js`, routing events via custom DOM events, API calls via `api.js` which auto-injects the Bearer header.

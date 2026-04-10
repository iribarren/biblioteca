# Performance Improvements

**Date:** 2026-04-06
**Status:** Draft — Pending Approval

---

## Overview

A set of three targeted improvements to reduce API response latency, shrink frontend payload size, and unblock production deployment. These are low-risk, high-impact changes that touch the backend controller, frontend Nginx config, and frontend API client.

## Goals

1. Eliminate N+1 query overhead in the primary game-state serialization path.
2. Enable gzip compression on the frontend Nginx server to reduce transfer size.
3. Make the API base URL configurable so the frontend can deploy to production without code changes.

---

## User Stories

### US-1: Eager Loading in `serializeGameState()`

**As a** player, **I want** game API responses to load quickly, **so that** the game feels responsive during play.

**Context:** `GameController::serializeGameState()` calls `.toArray()` on four lazy-loaded Doctrine collections (`attributes`, `books`, `journal_entries`, `roll_results`). Each triggers a separate SQL query, resulting in ~6 queries per response. This method is called on every game endpoint (create, load, prologue, chapter roll, advance, epilogue, journal save).

**Acceptance Criteria:**

- [ ] A dedicated DQL query (or repository method) fetches a `GameSession` with all four collections joined in a single query.
- [ ] `serializeGameState()` uses the eagerly-loaded entity instead of triggering lazy loads.
- [ ] Total DB queries per game-state response drops from ~6 to ~2 (the game fetch + any write operation).
- [ ] All existing API tests continue to pass with identical response payloads.
- [ ] No changes to the JSON response structure or field names.

**Files:** `oracles-api/src/Controller/GameController.php`, `oracles-api/src/Repository/GameSessionRepository.php`

---

### US-2: Gzip Compression in Frontend Nginx

**As a** player, **I want** the game to load faster on slow connections, **so that** I can start playing sooner.

**Context:** The frontend Nginx config (`thelibrary/nginx.conf`) has no gzip configuration. The built JS bundle is ~85KB uncompressed. The backend Nginx (`docker/nginx/backend.prod.conf`) already has a working gzip block (level 5, standard MIME types) that should be mirrored.

**Acceptance Criteria:**

- [ ] `thelibrary/nginx.conf` includes gzip configuration matching the backend: `gzip on`, `gzip_vary on`, `gzip_proxied any`, `gzip_min_length 1000`, `gzip_comp_level 5`, same `gzip_types` list.
- [ ] JS/CSS assets are served with `Content-Encoding: gzip` when the client sends `Accept-Encoding: gzip`.
- [ ] Existing security headers and cache directives remain unchanged.
- [ ] Manual verification: `curl -H "Accept-Encoding: gzip" -sI http://localhost:3000/assets/<bundle>.js` shows `Content-Encoding: gzip`.

**Files:** `thelibrary/nginx.conf`

---

### US-3: Configurable API URL in Frontend

**As a** developer deploying to production, **I want** the API base URL to be configurable via environment variable, **so that** I can deploy the frontend to any domain without modifying source code.

**Context:** `thelibrary/src/api/index.js` hardcodes `const BASE_URL = 'http://localhost:8080'`. This works for local dev but blocks production deployment where the API lives at a different origin.

**Acceptance Criteria:**

- [ ] `BASE_URL` reads from `import.meta.env.VITE_API_BASE_URL` with a fallback to `'http://localhost:8080'`.
- [ ] A `.env.example` file is added to `thelibrary/` documenting `VITE_API_BASE_URL`.
- [ ] The `Content-Security-Policy` `connect-src` directive in `thelibrary/nginx.conf` is documented as needing an update for production (not automated -- this is a deploy-time config concern).
- [ ] Local development continues to work without creating any `.env` file (the fallback covers it).
- [ ] The `Dockerfile.prod` (or `compose.prod.yaml`) documents how to pass `VITE_API_BASE_URL` at build time.

**Files:** `thelibrary/src/api/index.js`, `thelibrary/.env.example`, `thelibrary/nginx.conf` (CSP comment only), production Docker docs

---

## Out of Scope

- Full API response caching (Redis, HTTP cache headers) -- a separate initiative.
- Frontend code-splitting or lazy-loading routes -- the bundle is small enough (~85KB) that this is not warranted yet.
- Automated CSP header generation based on environment variables.
- Database indexing or query optimization beyond the eager-loading fix.
- Backend API response pagination.

## Dependencies

| Dependency | Story | Notes |
|------------|-------|-------|
| Doctrine DQL / QueryBuilder knowledge | US-1 | Standard Doctrine JOIN fetch syntax |
| Access to `docker/nginx/backend.prod.conf` as reference | US-2 | Already exists in the repo |
| Vite env variable support (`import.meta.env`) | US-3 | Built into Vite, no extra config needed |

No external dependencies or blocking work items.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Eager loading changes the entity hydration behavior in edge cases (e.g., empty collections) | Low | Verify with existing test suite; add a test for a freshly-created game with no collections |
| Gzip on small responses adds CPU overhead without meaningful size savings | Low | `gzip_min_length 1000` already filters out tiny responses |
| `VITE_API_BASE_URL` is a build-time variable, not runtime -- requires rebuild per environment | Medium | Document this clearly; a future improvement could inject it at runtime via `window.__CONFIG__` |

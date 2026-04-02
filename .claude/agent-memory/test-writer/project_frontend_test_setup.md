---
name: Frontend Test Setup (thelibrary)
description: Vitest + Vue Test Utils config for the Vue 3 frontend; Pinia setup pattern for store tests
type: project
---

The `thelibrary/` frontend uses Vitest 3 + @vue/test-utils 2 + jsdom.

- Test runner: `npm test` (runs `vitest run`) from `thelibrary/`
- Environment: jsdom, globals enabled — no `import { describe, it, expect }` needed, but explicit imports work fine too
- Test file convention: `*.test.js` co-located next to source files (e.g., `src/stores/auth.test.js`)
- Pinia store tests require this setup in `beforeEach`:
  ```js
  import { setActivePinia, createPinia } from 'pinia'
  beforeEach(() => { setActivePinia(createPinia()) })
  ```
- localStorage is provided by jsdom — call `localStorage.clear()` in `beforeEach`/`afterEach` to isolate tests; no mocking needed
- Path alias `@` maps to `src/` (defined in `vite.config.js`)

**Why:** No separate vitest config file exists; test config lives inside `vite.config.js` under `test:`.

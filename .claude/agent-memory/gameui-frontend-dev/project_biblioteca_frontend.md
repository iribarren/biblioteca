---
name: La Biblioteca Frontend Design System
description: Established aesthetic, color palette, fonts, and architecture for La Biblioteca frontend
type: project
---

La Biblioteca frontend is a medieval library themed solo TTRPG journal game. All 7 files were built in the initial session.

**File locations:**
- `frontend/public/index.html` — HTML shell, Google Fonts, no inline styles
- `frontend/public/css/theme.css` — CSS custom properties, reset, animations, typography
- `frontend/public/css/layout.css` — Sidebar (280px), main content area, journal panel (slide-in), responsive
- `frontend/public/css/components.css` — All component styles
- `frontend/public/js/api.js` — ES module API client (ApiError class + named exports)
- `frontend/public/js/state.js` — ES module state store (in-memory + localStorage)
- `frontend/public/js/app.js` — Main controller (screen routing, all event handlers)

**Color palette (CSS vars):**
- `--color-bg-deep: #1a1a2e`, `--color-bg-panel: #2d2d44`
- `--color-paper: #f4e8c1`, `--color-paper-dark: #e8d5a3`
- `--color-gold: #c9a84c`, `--color-gold-dark: #8b6914`, `--color-gold-bright: #e8c46a`
- Success: `#4a7c59`, Partial: `#c9a84c`, Failure: `#8b3a3a`

**Fonts:** Cinzel (headings) + Lora (body) from Google Fonts

**Architecture pattern:**
- Screens are `<section id="screen-*" class="screen">` rendered dynamically via `innerHTML`
- Navigation via `navigateToPhase(phase)` → maps phase string to screen ID
- State listener pattern: `State.subscribe(callback)` for sidebar reactivity
- Epilogue roll button uses global delegated click listener (button is dynamically rendered)

**Book animation system (added 2026-03-27):**

- `frontend/public/css/book.css` — all 3D book animation CSS (perspective, preserve-3d, keyframes)
- `frontend/public/js/book-animator.js` — ES module, exports `animateBookReveal(container, book) → Promise`
- Animation is 5 stages over ~6.2 seconds. Stages toggled via CSS class `.stage-1` through `.stage-5` + `.complete`
- Skippable: user click resolves the Promise immediately and jumps to final state
- Mobile: `.mobile-mode` class on root shows final state with no 3D
- Integration: containers wrapped in `.book-animator-container` div. Roll/action sections appear AFTER the animation Promise resolves (not immediately after API call)
- `buildBookCard()` still exists in app.js for the completed-screen journal and for epilogue screen when book already exists (continuing a saved game)

**Dice animation system (added 2026-03-27):**

- `frontend/public/css/dice.css` — all dice animation CSS: d6 3D cube, d10 slot-machine spinner, outcome banner, math breakdown, phase transitions, button press effect, loading dots
- `frontend/public/js/dice-animator.js` — ES module, exports `animateDiceRoll(container, rollResult, context, extraData?) → Promise`
- context values: `'chapter'`, `'epilogue_action'`, `'epilogue_final'`
- epilogue_final passes `extraData = { overcome_score }` — no d6 is rolled, overcome score is shown instead
- Animation is ~5s over 7 stages (intro, spin, land, math, comparison, banner, effect text)
- Skippable: click during animation jumps to final state via `jumpToFinal()`
- Mobile: CSS disables 3D transforms on d6 (flat spin only), slot machine still works
- Integration: `await animateDiceRoll(...)` replaces `buildDiceResultCard()` / `buildFinalResultCard()` calls in app.js. Journal/next-button sections appear AFTER the Promise resolves.
- `navigateToPhase()` now has phase-transition fade (300ms out, 400ms in) on `.main-content`
- `setLoading()` now adds `.loading-dots` CSS class to `.btn-text` for animated "..." during API calls

**Why:** The frontend communicates with Symfony backend at `http://localhost:8080`. Nginx serves frontend static files at port 3000.

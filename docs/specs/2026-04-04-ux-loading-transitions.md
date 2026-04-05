# UX Improvements -- Loading Feedback & Smooth Transitions

**Date:** 2026-04-04
**Status:** Draft
**Sub-project:** thelibrary (Frontend SPA)

---

## Overview

The game flow in La Biblioteca moves the player through a linear sequence of phases (Prologue, Chapters I--III, Epilogue, Completed), each with internal step progressions that reveal new sections on-screen. While all user-triggered API calls already have proper loading spinners and disabled buttons, the transitions between phases and between steps within a phase lack visual polish. Specifically: phase transitions jump the viewport abruptly, new step sections appear instantly with no animation, the viewport does not scroll to newly revealed content, and the initial oracle data load has no feedback if it is still in flight when the player reaches the Prologue.

These gaps make the experience feel rough at key narrative moments. This feature addresses all four with minimal, targeted changes that leverage existing CSS infrastructure.

## Goals

- Every viewport movement caused by the game flow should feel intentional and smooth.
- The player should never have to hunt for the next action after a step progression -- the viewport should guide them.
- New content sections should fade in to reinforce the narrative rhythm of the game.
- If the player reaches the Prologue before oracle tables have loaded, they should see clear feedback instead of empty dropdowns.

## User Stories

### US-1: Smooth scroll on phase transitions

**As a** player finishing a chapter,
**I want** the page to scroll smoothly to the top when a new phase loads,
**so that** the transition feels continuous rather than jarring.

**Acceptance Criteria:**
- All existing `window.scrollTo(0, 0)` calls in `ChapterView.vue` (line 167) and `EpilogueView.vue` (lines 108, 160) use `behavior: 'smooth'`.
- The scroll completes within a reasonable time (the browser's native smooth scroll duration, no custom JS timing required).
- No regressions: the scroll still reaches `(0, 0)`.

### US-2: Auto-scroll to newly revealed sections

**As a** player progressing through a chapter or epilogue,
**I want** the viewport to scroll down to the next section when it appears,
**so that** I do not have to manually scroll to discover my next action.

**Acceptance Criteria:**
- In **ChapterView**, when the step transitions to `pre-journal`, `roll`, `support-title`, or `post-journal`, the corresponding section (`#chapter-pre-journal-section`, `#chapter-roll-section`, `#chapter-support-title-section`, `#chapter-post-journal-section`) is scrolled into view.
- In **EpilogueView**, when `showPreJournal`, `showPostRoll`, or `showPostFinal` become true, the corresponding section is scrolled into view.
- Scrolling uses `Element.scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- The scroll happens after the DOM has updated (use `nextTick`).
- Sections already fully visible in the viewport should not cause unnecessary scroll movement (the browser's native `scrollIntoView` handles this).

### US-3: Fade-in transition for step sections

**As a** player,
**I want** new content sections to fade in when they appear,
**so that** the progression feels polished and deliberate.

**Acceptance Criteria:**
- All `v-if`-controlled step sections in ChapterView and EpilogueView are wrapped in a Vue `<Transition>` component.
- The transition uses the existing `fadeInUp` keyframe animation from `theme.css` (0.5s ease, 20px vertical translate).
- The enter transition class applies the `.animate-fade-in-up` utility class (or equivalent CSS using the same keyframe).
- No leave/exit transition is needed -- sections that disappear can do so instantly.
- The transition does not interfere with the auto-scroll from US-2 (scroll should trigger after the transition element is inserted into the DOM, not after the animation completes).

### US-4: Loading state for oracle table prefetch

**As a** player who opens the game and immediately starts a session,
**I want** to see a loading indicator on the Prologue dropdowns if oracle data has not loaded yet,
**so that** I understand the game is preparing rather than broken.

**Acceptance Criteria:**
- `App.vue` exposes the loading state of `fetchOracleTables()` via a reactive flag on the game store (e.g., `oracleTablesLoading`).
- `PrologueView.vue` reads this flag. While true, the Genre and Epoch `<select>` elements are disabled and show placeholder text indicating loading (use existing i18n pattern, e.g., `t('prologue.loading_oracles')`).
- If `fetchOracleTables()` fails in `App.vue`, the existing retry logic in `PrologueView.onMounted` (line 33--41) still works as a fallback. The loading flag is reset to false on both success and failure.
- The loading indicator is lightweight -- a disabled select with placeholder text is sufficient. No spinner is needed here.

## Technical Approach

### US-1 (smooth scroll)
Replace the three `window.scrollTo(0, 0)` calls with `window.scrollTo({ top: 0, behavior: 'smooth' })`. Pure find-and-replace.

### US-2 (auto-scroll to sections)
Create a small helper (inline or in a composable) that calls `nextTick(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))`. Invoke it at the end of each step-advancing function in ChapterView and EpilogueView. The sections already have `id` attributes (`#chapter-pre-journal-section`, etc.).

### US-3 (fade-in transitions)
Wrap each `v-if` section in `<Transition name="section-fade">`. Define `.section-fade-enter-active` to apply the existing `fadeInUp` keyframe. No leave classes needed. Since `<Transition>` inserts the element before animating, `nextTick` in US-2 will fire after DOM insertion, allowing the scroll to target the element correctly.

### US-4 (oracle loading state)
Add an `oracleTablesLoading` ref to the game store. Set it to `true` before the `fetchOracleTables()` call in `App.vue`, and `false` in both the success and catch paths. In `PrologueView`, conditionally disable the selects and show loading text when the flag is true.

## Out of Scope

- **Skeleton loaders or shimmer effects** -- disabled selects with placeholder text are sufficient for US-4.
- **Request cancellation or abort controllers** -- not needed for these changes.
- **Page-level route transition animations** -- this spec only covers intra-view scrolling and section reveals.
- **Leave/exit animations** for sections that are hidden -- sections disappear instantly as they do today.
- **Custom scroll timing or easing** -- browser-native smooth scroll is sufficient.
- **Changes to the existing BookReveal or DiceRoll animations** -- those are already polished.
- **Accessibility motion preferences** (`prefers-reduced-motion`) -- worth doing but out of scope for this ticket. Can be a follow-up.

## Dependencies

- **Vue `nextTick`** -- already imported in both ChapterView and EpilogueView (available from `vue`).
- **Vue `<Transition>` component** -- built-in, no import needed.
- **Existing CSS keyframe `fadeInUp`** -- defined in `src/assets/css/theme.css` (line 245). Utility class `.animate-fade-in-up` also available (line 286).
- **Existing section `id` attributes** -- ChapterView sections already have `id="chapter-pre-journal-section"`, `id="chapter-roll-section"`, etc. EpilogueView sections may need `id` attributes added.
- **Pinia game store** (`src/stores/game.js`) -- for the new `oracleTablesLoading` flag.
- **i18n keys** -- one new key needed for the oracle loading placeholder text.

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Smooth scroll + auto-scroll conflict when both fire in sequence (phase transition then step reveal) | Low | Phase transitions reset to step 1 (book reveal), so auto-scroll only fires on subsequent steps, not simultaneously with the phase scroll-to-top. |
| `scrollIntoView` behavior varies across browsers | Low | All target browsers (modern Chrome, Firefox, Safari) support `behavior: 'smooth'`. The game already requires a modern browser. |
| Transition wrapper breaks existing CSS layout | Low | `<Transition>` renders no wrapper element by default -- it applies classes to the child. Test that `content-section` styling is preserved. |
| Oracle loading flag race condition (PrologueView mounts before App.vue finishes) | Medium | The flag correctly reflects in-flight state. PrologueView's existing fallback fetch (lines 33--41) covers the case where App.vue's fetch failed entirely. |

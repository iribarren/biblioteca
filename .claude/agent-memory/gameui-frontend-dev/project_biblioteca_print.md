---
name: La Biblioteca Print Export
description: Print stylesheet decisions, cascade notes, and completed-screen HTML structure for the print/export feature
type: project
---

Print stylesheet lives at `frontend/public/css/print.css`, loaded with `media="print"` after all other stylesheets in index.html.

**Key cascade note:** `components.css` already has a `@media print` block. The rules in that block are compatible — `.screen:not(.active) { display:none !important }` correctly hides non-active screens (completed is active when print fires). `print.css` loads after and overrides border/color details cleanly.

**Structure of completed screen (rendered dynamically by `renderCompletedScreen()` in app.js):**
- `.screen-header` → `.screen-title` + `.screen-subtitle`
- `.summary-header` → emoji, `<h3>` (character name), `.setting-badge` spans (genre/epoch), `.summary-final-result.{hit|weak_hit|miss}`, buttons (hidden in print)
- `.content-section` → `.section-title` + `#full-journal` (`.journal-entry` list)
- `.content-section` → `.section-title` + roll rows (inline-styled flex divs from `buildRollSummaryRow()`)

**Roll rows use inline styles only** (no CSS class for the row itself), so print overrides target `div[style*="display:flex"]` within the content-section.

**Outcome color classes used in roll rows:** `.outcome-hit`, `.outcome-partial`, `.outcome-miss` (set as class on a `<span>`).

**Footer:** implemented via `#screen-completed::after` pseudo-element with `content: "Exportado de La Biblioteca"`.

**Why:** `window.print()` is called directly from the Exportar button onclick; no JS changes are needed. All print logic is pure CSS.

---
name: La Biblioteca Admin Panel
description: Admin panel structure, auth pattern, and CSS conventions for the standalone admin.html page
type: project
---

Admin panel is a standalone page at `frontend/public/admin.html` — NOT part of the SPA. It loads its own CSS (`css/admin.css`) and JS (`js/admin.js`) only. It does not import theme.css.

**Auth:** Client-side password gate using `sessionStorage`. Password: `biblioteca2026`. Key: `admin_auth`. Gate shown by default; panel hidden via `hidden` attribute. Logout clears sessionStorage and swaps visibility.

**CSS file:** `frontend/public/css/admin.css` — uses raw hex values (not CSS vars from theme.css). All palette values duplicated under local vars (`--bg-deep`, `--gold`, etc.). Mirrors the game palette exactly.

**JS file:** `frontend/public/js/admin.js` — ES module, no external deps. Single event delegation listener on `#categories-container` handles inline edit (focusout + keydown), toggle active (change), and delete (click). Add-option forms also delegated via submit event.

**API base:** `BASE_URL = 'http://localhost:8080'`

**Category name→label map** (defined in JS as `CATEGORY_LABELS`):
- color → Color, binding → Encuadernación, smell → Olor, interior → Interior, genre → Género, epoch → Época

**DOM pattern:** Categories rendered as `<details>` (collapsible), open by default. Options in `<table class="options-table">`. Each row has inline `<input class="field-editable">` for value/hint — saved on blur or Enter, reverted on Escape. Active toggle is a CSS-styled checkbox with `.toggle-input` + `.toggle-label` + `.toggle-track` + `.toggle-thumb`. Delete triggers a custom Promise-based modal (`confirmDelete()`).

**Toast system:** `showToast(message, type, duration)` — appends `.toast` divs to `#toast-container`, auto-dismissed after 3.5s, dismissable on click. Types: `success`, `error`, `info`.

**Why:** Admin panel is out-of-band from the SPA so it can be accessed at `/admin.html` without the Vue/React routing. The nginx config serves it directly.

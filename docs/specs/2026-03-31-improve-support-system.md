# Improve Support System

**Date:** 2026-03-31
**Status:** Draft — Awaiting Approval
**Scope:** `oracles-api/` (backend) + `thelibrary/` (frontend)

---

## Overview

The support system (Apoyo) currently awards a numeric +1 bonus when a player achieves a partial success (weak_hit) during a chapter roll, but the support point is anonymous — it has no narrative identity. This feature adds a **description step** so players must label their support with a short description of the object, ally, weapon, or resource they gained (max 50 characters). It also refines the **epilogue support-usage flow** so that the game explicitly prompts the player per-attribute, reminds them of the one-time-only constraint, and displays the support's label for narrative context.

### Current Behavior

1. **Chapter roll with weak_hit:** The attribute's `support` value is silently incremented by 1. The `support_title` field on the `Attribute` entity exists in the schema but is **never populated** — the frontend does not collect it, and the backend does not require it.
2. **Epilogue action roll:** The frontend shows a generic support selector listing attributes that have `support > 0`. The player can pick one (or none). No label or description is shown — just the attribute name and the numeric bonus. The support selector is shown as a separate section below the attribute selector, regardless of which attribute was chosen for the action.

### Desired Behavior

1. **Chapter roll with weak_hit:** After the roll animation, an input field appears asking the player to describe what support they gained (e.g., "Ancient map", "Loyal hound", "Silver dagger"). This description is saved as `support_title` on the attribute. The player cannot proceed to the post-roll journal until they provide this description.
2. **Epilogue action roll:** When the player selects an attribute for their action, if that attribute has `support > 0`, a confirmation prompt appears showing the support's label (support_title) and asking: "Do you want to use this support? You can only use one support during the entire epilogue." If the attribute has no support, or support has already been used, no prompt appears. The support selection is now **contextual to the chosen attribute**, not a separate global selector.

---

## Goals

1. Give every support point a narrative identity that enriches the journaling experience.
2. Make the epilogue support decision more intentional and informed — the player sees *what* they are using, not just a number.
3. Simplify the epilogue UI by replacing the separate support attribute selector with an inline confirmation tied to the selected action attribute.
4. Enforce the max-50-character limit on support descriptions at both frontend and backend.

---

## User Stories

### US-1: Describe Support on Partial Success

> As a player, when I achieve a partial success (weak_hit) on a chapter roll, I want to describe the support I gained with a short label, so that it has narrative meaning when I use it later.

**Acceptance Criteria:**

- AC-1.1: After a chapter roll resulting in `weak_hit`, an input field appears below the roll result, labeled with a prompt like "What did you find?" (localized).
- AC-1.2: The input field has a max length of 50 characters, enforced in HTML (`maxlength`) and validated on the backend.
- AC-1.3: The player cannot proceed to the post-roll journal section until they submit a non-empty support description.
- AC-1.4: The description is saved to the `support_title` field of the corresponding `Attribute` entity via the backend API.
- AC-1.5: The support description is visible in the sidebar attribute breakdown (next to the support pip value).
- AC-1.6: On `hit` or `miss` outcomes, this input does NOT appear.

### US-2: Contextual Support Prompt in Epilogue

> As a player, during an epilogue action, when I select an attribute that has a support point, I want the game to show me the support's description and ask if I want to use it, so that I can make an informed narrative decision.

**Acceptance Criteria:**

- AC-2.1: When the player selects an attribute for an epilogue action, if that attribute has `support > 0` AND `support_used === false` on the game session, a confirmation prompt appears inline.
- AC-2.2: The prompt displays the `support_title` of the selected attribute (e.g., "Use your 'Ancient map' (+1)?").
- AC-2.3: The prompt includes a reminder that support can only be used once during the entire epilogue.
- AC-2.4: The prompt offers two clear options: "Use support" and "Do not use".
- AC-2.5: If the player selects an attribute with NO support points, no support prompt appears.
- AC-2.6: If `support_used === true` on the game session, no support prompt appears for any attribute; a read-only note indicates support was already used.
- AC-2.7: The player's choice (use or decline) is sent to the existing `POST /api/game/{id}/epilogue/action` endpoint via the `support_attribute` field (attribute type if using, `null` if declining).

### US-3: Support Description Visible in Sidebar and Export

> As a player, I want to see my support descriptions in the sidebar attribute breakdown and in the exported journal, so that the narrative context is preserved throughout the game.

**Acceptance Criteria:**

- AC-3.1: The sidebar attribute breakdown shows the `support_title` next to the support value when it is set (e.g., "Support: 1 — Ancient map").
- AC-3.2: The export endpoint (`GET /api/game/{id}/export`) already includes `support_title` in the attribute serialization — no backend change needed, but the frontend export/print view should display it.

---

## Technical Approach

### Backend (`oracles-api/`)

**No entity or migration changes required.** The `Attribute` entity already has a `support_title` field (`VARCHAR(255)`, nullable). The serialization in `GameController::serializeAttribute()` already returns `support_title`. The infrastructure is in place but unused.

1. **New API endpoint — `POST /api/game/{id}/chapter/support-title`:**
   - Accepts `{ "attribute": "body|mind|social", "support_title": "string (max 50)" }`.
   - Validates: attribute must exist, attribute must have `support > 0`, `support_title` must be non-empty and max 50 characters, current phase must be one step after the chapter where the weak_hit occurred (or still on the same chapter phase — depending on when in the flow this is called; see note below).
   - Sets `support_title` on the matching `Attribute` entity and persists.
   - Returns the updated game state.
   - **Alternative approach:** Instead of a new endpoint, this could be handled by extending the existing `POST /api/game/{id}/journal` endpoint to accept an optional `support_title` parameter when saving the post-roll journal entry. This bundles the support description with the journal save, simplifying the flow. **Recommendation:** Use the new dedicated endpoint for clearer separation of concerns, since support description and journal content are conceptually distinct.

2. **Validation update on `support_title` field:**
   - Add a length constraint (max 50) in the endpoint validation. The DB column is `VARCHAR(255)` which is fine — the 50-char limit is a game rule, not a schema constraint.
   - Strip HTML tags from the input (consistent with existing `strip_tags` usage).

3. **GameEngine — no changes needed for the epilogue flow.** The existing `resolveEpilogueAction()` method already accepts an optional `$supportAttribute` parameter and correctly applies the support bonus. The `support_used` flag on `GameSession` already tracks one-time usage.

### Frontend (`thelibrary/`)

1. **Chapter roll weak_hit flow (`app.js` — `onChapterRoll` area):**
   - After `animateDiceRoll` completes and the outcome is `weak_hit`, show a new inline section (between the roll result and the post-journal section) with:
     - A prompt/label explaining the player found support.
     - A text input (`maxlength="50"`) for the support description.
     - A "Confirm" button.
   - On confirm: call the new API endpoint to save the `support_title`, then reveal the post-journal section.
   - On `hit` or `miss`: skip this section entirely, go straight to post-journal.

2. **Epilogue action flow (`app.js` — `buildActionSection` / `renderSupportButtons`):**
   - Remove the current separate `renderSupportButtons()` section and the `#epilogue-support-selector` container.
   - When the player selects an attribute (`onSelectEpilogueAttribute`):
     - Check if the selected attribute has `support > 0` and `game.support_used === false`.
     - If yes: show an inline confirmation prompt displaying the `support_title` and the bonus value. Two buttons: "Use" / "Do not use".
     - If the player clicks "Use": set `_selectedSupportAttribute` to the selected attribute type.
     - If the player clicks "Do not use" or does nothing: set `_selectedSupportAttribute` to `null`.
   - The roll button remains enabled regardless of the support decision.
   - The existing `onRollEpilogueAction()` function already sends `_selectedSupportAttribute` to the API — no change needed there.

3. **Sidebar attribute display (`renderAttributeList`):**
   - When `attr.support > 0` and `attr.support_title` is set, display the title alongside the support pip (e.g., show a small text label under or next to the support value).

4. **Localization (`i18n`):**
   - Add new translation keys for:
     - Support description prompt text.
     - Epilogue support confirmation prompt (with placeholder for support_title).
     - Epilogue support one-time reminder text.
     - "Use support" / "Do not use" button labels.

### API Contract

**New endpoint:**

```
POST /api/game/{id}/chapter/support-title
Content-Type: application/json

{
  "attribute": "body",         // Required: body | mind | social
  "support_title": "Ancient map"  // Required: 1-50 characters
}

Response 200: Full game state (same shape as GET /api/game/{id})
Response 422: { "error": "Validation failed", "details": { ... } }
```

**Existing endpoint (unchanged):**

```
POST /api/game/{id}/epilogue/action
Content-Type: application/json

{
  "attribute": "mind",                // Required
  "support_attribute": "body"         // Optional: null or attribute type
}
```

---

## Out of Scope

- **Multiple support points per attribute:** The current system only awards +1 per weak_hit. Changing the support value mechanics is not part of this feature.
- **Editing a support description after submission:** Once submitted, the support_title is final. No edit flow.
- **Support description on epilogue rolls:** Support descriptions are only collected during chapter rolls (where weak_hits grant support). Epilogue rolls do not grant new support.
- **Changing the support_title DB column length:** The column is already `VARCHAR(255)`, which accommodates the 50-char game rule with room to spare. No migration needed.
- **Admin panel changes:** The EasyAdmin panel already exposes `support_title` through the Attribute entity. No admin-specific work is planned.

---

## Dependencies

1. **Existing `support_title` field on `Attribute` entity:** Already present in the schema and serialized in the API response. No migration required.
2. **Existing `support_used` flag on `GameSession` entity:** Already tracks one-time epilogue support usage. No changes needed.
3. **Existing `resolveEpilogueAction()` in `GameEngine`:** Already handles the `$supportAttribute` parameter correctly.
4. **Localization system in `thelibrary/`:** The frontend uses `t()` function calls with i18n keys. New keys must be added for both languages (Spanish primary, English fallback).

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Players may find the 50-char limit too restrictive | Low | Low | The limit is a game-design decision; 50 chars is enough for a short label (e.g., "Grimorio de conjuros antiguos" = 30 chars). Can be adjusted later without migration. |
| Existing game sessions have `support > 0` but no `support_title` | Medium | Low | The frontend must handle `null` support_title gracefully — display the support value without a label, or show a fallback like "Support +1". The epilogue prompt should still work even without a title. |
| Breaking the chapter flow if the support input is skipped | Low | Medium | The input is mandatory — the post-journal section is gated behind it. Backend validation ensures `support_title` is non-empty. If the API call fails, the player can retry. |
| The separate `support-title` endpoint adds a network call to the chapter flow | Low | Low | The call is lightweight (single field update). Alternative: bundle with journal save. Keeping it separate is cleaner and allows the player to see their description before writing the journal entry. |

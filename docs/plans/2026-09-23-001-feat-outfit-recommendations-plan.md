---
title: "feat: Add outfit recommendations to the builder"
type: feat
date: 2026-09-23
origin: docs/brainstorms/2026-09-23-outfit-recommendations-requirements.md
---

# feat: Add outfit recommendations to the builder

## Summary

Extend the existing Build an outfit page with local natural-language request interpretation and constraint-aware recommendations while preserving its current visual design and manual editing workflow.

## Problem Frame

The builder currently treats a natural-language request as an outfit name and places its only save control below every garment category. The repository already has a rule-based recommendation engine and reusable recommendation cards, but the builder does not connect to them.

## Requirements

**Request interpretation**

- R1. Interpret a requested outfit count, defaulting to two recommendations when no count is stated.
- R2. Recognize common jacket requirements and tie exclusions from ordinary-language requests.
- R3. Report constraints that the selected closet cannot satisfy.

**Recommendation behavior**

- R4. Generate complete recommendations only from active garments in the selected closet.
- R5. Enforce required and excluded slots before scoring or presenting an outfit.
- R6. Prefer distinct jacket or shirt anchors across multiple recommendations while permitting practical item reuse.

**Builder experience**

- R7. Keep the current card, typography, photography, occasion, closet, and garment-selection patterns.
- R8. Place a visible Recommend outfits action with the request field at the top of the page.
- R9. Allow each recommendation to be saved directly or loaded into the manual builder for adjustment.
- R10. Keep a visible Save outfit action with the editable preview instead of relying only on the bottom-of-page control.

## Key Technical Decisions

- **Use a deterministic request interpreter:** The core workflow must work without credentials or an external AI service, and a pure interpreter is directly testable.
- **Represent prompt meaning as recommender constraints:** Count, required slots, and excluded slots should be passed into the existing engine instead of duplicating outfit assembly in the page.
- **Reuse recommendation cards:** Extend the current card with an optional edit action so saving and presentation behavior stay consistent with Today and Stylist.
- **Keep manual selection as the edit surface:** Loading a recommendation into the existing picked-garment state preserves the visual and interaction model the user already likes.

## Implementation Units

### U1. Interpret outfit requests

- **Goal:** Convert common natural-language requests into a bounded recommendation count and explicit slot constraints.
- **Requirements:** R1-R3
- **Dependencies:** None
- **Files:** `src/lib/outfitRequest.js`, `src/lib/outfitRequest.test.js`
- **Approach:** Add a pure interpreter for numeric and common word counts, jacket or blazer requirements, and tie exclusions. Return human-readable constraint labels for UI feedback and clamp unreasonable counts to the supported recommendation range.
- **Execution note:** Implement the interpreter test-first.
- **Patterns to follow:** Pure helpers and Vitest coverage in `src/lib/outfitEngine.js` and `src/lib/outfitEngine.test.js`.
- **Test scenarios:**
  - Parse “give me two outfits” as count 2.
  - Parse digit counts and clamp them to the supported maximum.
  - Treat “sports jacket,” “sport coat,” and “blazer” as a required jacket slot.
  - Treat “no tie” and “without a tie” as an excluded tie slot.
  - Return defaults for an empty or unconstrained request.
- **Verification:** The interpreter produces stable structured constraints without network or application state.

### U2. Enforce request constraints in recommendations

- **Goal:** Make the existing recommendation engine honor required and excluded slots and explain unsatisfied requirements.
- **Requirements:** R3-R6
- **Dependencies:** U1
- **Files:** `src/lib/outfitEngine.js`, `src/lib/outfitEngine.test.js`
- **Approach:** Accept optional constraints in the current recommender, force required jacket candidates regardless of mild-weather preferences, remove excluded slots, and include unmet required slots in the result. Preserve existing callers by keeping default behavior unchanged when constraints are absent.
- **Execution note:** Add failing engine tests before changing recommendation logic.
- **Patterns to follow:** Existing category pools, missing-slot reporting, diversity selection, and active-status filtering in `src/lib/outfitEngine.js`.
- **Test scenarios:**
  - Covers AE1: A business-casual request requiring a jacket returns the requested count with a jacket in every outfit and no tie.
  - Covers AE2: Multiple recommendations prefer distinct jackets or shirts when the closet permits.
  - Covers AE3: A required jacket with no active jacket returns an unmet jacket requirement and no noncompliant recommendation.
  - Existing unconstrained casual, formal, unavailable-garment, and weather behavior remains unchanged.
- **Verification:** All engine tests pass and constrained results never violate required or excluded slots.

### U3. Add recommendations to the existing builder

- **Goal:** Let the user request, review, save, and edit outfit recommendations without changing the page's visual language.
- **Requirements:** R7-R10
- **Dependencies:** U1, U2
- **Files:** `src/pages/OutfitBuilder.jsx`, `src/components/OutfitSuggestion.jsx`, `src/styles.css`
- **Approach:** Relabel the top field as an outfit request, add a colocated recommendation action, and render results with the current recommendation card. Add an optional Edit in builder action that copies a recommendation into the existing manual selection state. Show the manual save action with the preview while retaining the bottom control and notes.
- **Patterns to follow:** Segmented controls and cards in `src/pages/OutfitBuilder.jsx`; saved-state handling and FlatLay presentation in `src/components/OutfitSuggestion.jsx`; existing responsive layout utilities in `src/styles.css`.
- **Test scenarios:**
  - Covers AE4: At the top of desktop and mobile layouts, the request field and Recommend outfits action are visible without scrolling.
  - Submitting an empty request still produces default recommendations from the selected closet and occasion.
  - An unsatisfied hard constraint renders a clear explanation and no falsely compliant recommendation.
  - Covers AE5: Editing a recommendation selects its garments in the manual builder, and saving uses the edited selection.
  - Saving one recommendation does not save any other recommendation.
- **Verification:** The production build succeeds, existing unit tests pass, and browser QA confirms recommendation, edit, manual-save, and responsive visibility flows.

## Scope Boundaries

- Use only garments already recorded in the wardrobe.
- Do not add shopping, cart, checkout, purchase, account, or credential behavior.
- Do not require the optional AI stylist or Anthropic API key.
- Do not redesign the builder or require all items to be unique across recommendations.

## Acceptance Examples

- AE1. “Dinner with friends two nights in a row, sports jacket, no tie—give me two outfits” produces two complete jacket-based outfits without ties when the selected closet can satisfy the request.
- AE2. Two recommendations differ in jacket or shirt when suitable alternatives exist, while trousers or shoes may repeat.
- AE3. A selected closet without an active jacket reports that the jacket constraint cannot be met instead of returning a jacket-free outfit.
- AE4. The top of the page exposes the request and recommendation action, and the editable preview exposes a save action.
- AE5. Loading a recommendation into the builder, replacing its shirt, and saving persists only the edited outfit.

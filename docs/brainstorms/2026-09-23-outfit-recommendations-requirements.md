---
date: 2026-09-23
topic: outfit-recommendations
---

# Outfit Recommendations

## Summary

Preserve the existing Build an outfit page and visual design while adding a prompt-first way to request outfit recommendations from the garments already in the wardrobe.

---

## Problem Frame

The current page is a manual outfit builder. Its first field is labeled Name, so a natural-language request is stored as an outfit title rather than interpreted. The only Save outfit control also appears after every garment category, which makes the page look unfinished in a normal desktop viewport.

The desired use is to ask for a specific number of outfits in ordinary language, including constraints such as “sports jacket” and “no tie,” review the recommendations visually, adjust individual pieces when needed, and decide which outfits to save.

---

## Key Decisions

- **Preserve the existing design.** Recommendation controls and results should use the page's current cards, garment photography, typography, and manual selection patterns rather than replace the page with a new interface.
- **Recommendations are advisory.** Generated outfits are previews until the user explicitly saves them.
- **Hard constraints outrank scoring.** Explicit inclusions and exclusions must be honored or reported as unsatisfied; the planner must not silently substitute a conflicting outfit.
- **Core behavior is local.** Outfit recommendations must work without an AI subscription, external API key, or conversational service.
- **Variety is a preference.** Multi-outfit requests should favor visibly different looks but may repeat practical pieces such as shoes or trousers.

---

## Requirements

**Request and controls**

- R1. The page provides a clearly labeled request field for natural-language outfit needs.
- R2. A visible Recommend outfits action appears with the request controls without requiring the user to scroll through the wardrobe.
- R3. The existing occasion and closet controls remain available and visibly affect recommendations.
- R4. The page continues to support manual garment selection and editing.

**Recommendation behavior**

- R5. The planner extracts the requested outfit count when the request states one and otherwise uses a sensible default.
- R6. The planner treats explicit required garments, such as a sports jacket, as hard constraints.
- R7. The planner treats explicit exclusions, such as no tie, as hard constraints.
- R8. The planner recommends complete outfits only from active garments in the selected closet.
- R9. Multiple recommendations should differ in their most visually important garments when the wardrobe permits, without requiring every piece to be unique.
- R10. When a hard constraint cannot be satisfied, the page explains the missing or conflicting requirement instead of returning a noncompliant outfit.

**Review and saving**

- R11. Each recommendation shows garment photos and identifies every included piece.
- R12. The user can replace a recommended piece using the existing garment selectors before saving.
- R13. Each recommended outfit requires an explicit save action.
- R14. The existing manual Save outfit action remains easy to locate throughout the building workflow.

---

## Key Flows

- F1. Request recommendations
  - **Trigger:** The user enters an outfit request and selects Recommend outfits.
  - **Steps:** The page interprets count and constraints, uses occasion and closet context, and shows compliant outfit recommendations.
  - **Outcome:** The user can compare complete looks without manually assembling every combination.
  - **Covered by:** R1-R3, R5-R11

- F2. Refine and save
  - **Trigger:** The user chooses a recommendation to adjust or keep.
  - **Steps:** The user replaces pieces if desired, reviews the updated look, and selects Save outfit.
  - **Outcome:** Only approved outfits are added to saved outfits.
  - **Covered by:** R4, R12-R14

---

## Acceptance Examples

- AE1. **Covers R5-R9.** Given the request “Dinner with friends two nights in a row, sports jacket, no tie—give me two outfits,” when the selected closet contains enough active garments, then the page returns two complete outfits that each include a jacket and exclude a tie.
- AE2. **Covers R9.** Given enough suitable jackets and shirts, when two outfits are requested, then the recommendations use different jackets or shirts while allowing trousers or shoes to repeat.
- AE3. **Covers R10.** Given a request requiring a sports jacket and a selected closet with no active jackets, when recommendations are requested, then the page states that the jacket requirement cannot be satisfied and does not present a jacket-free outfit as compliant.
- AE4. **Covers R2 and R14.** Given a desktop or mobile viewport at the top of the page, when the builder is opened, then the primary recommendation action is visible and the outfit-saving action remains readily reachable during manual selection.
- AE5. **Covers R12-R13.** Given a displayed recommendation, when the user replaces its shirt and saves it, then the saved outfit contains the replacement shirt and no other recommendation is saved automatically.

---

## Scope Boundaries

- Recommendations use garments already recorded in the wardrobe.
- Shopping, cart changes, checkout, purchases, account creation, and credential changes are outside this feature.
- Free-form stylist chat is not required for recommendation generation.
- Complete item-level uniqueness across multi-day outfits is not required.

---

## Success Criteria

- A natural-language request produces the requested number of compliant outfits when the selected closet can satisfy it.
- Explicit inclusions and exclusions are never silently ignored.
- The recommendation action is visible without scrolling through garment categories.
- The original page's visual character and manual builder remain intact.

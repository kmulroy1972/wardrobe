---
date: 2026-09-23
topic: outfit-recommendations
---

# Conversational Wardrobe Recommendations

## Summary

Make the Stylist the obvious place to ask natural-language wardrobe questions, including occasion-based requests and questions about one exact garment. Keep Build an outfit as the manual editing and saving workspace.

---

## Problem Frame

The manual builder currently presents a request field that understands only a few fixed phrases. It looks conversational but cannot reliably answer ordinary questions such as “What goes with this jacket?” or infer what the user needs from “Dinner with friends.” This creates the wrong expectation and obscures the app's existing AI Stylist, which already has access to the wardrobe catalog, fit profile, saved outfits, wishlist, wear history, and weather.

The product needs one clear mental model: ask the Stylist for ideas, then use the Builder when pieces need to be adjusted or an outfit needs to be saved.

---

## Key Decisions

- **One recommendation surface.** The Stylist is the conversational recommendation experience; the Builder does not maintain a second, less capable interpretation system.
- **Exact garment context is selectable.** A user can choose a catalog item or arrive from its detail page, allowing phrases such as “this jacket” to refer to a known garment.
- **Examples teach the interface.** Common questions appear as easy starting actions rather than explanatory prose the user must translate into a request.
- **Inventory evidence remains visible.** Recommendations identify the exact catalog garments they refer to, with the existing linked garment presentation.
- **Advice remains non-destructive.** Asking questions does not save outfits, modify garments, add shopping-list items, or initiate shopping actions.

---

## Requirements

**Conversational Stylist**

- R1. The Stylist page presents a prominent question field and an unmistakable action to ask the wardrobe adviser.
- R2. The Stylist accepts broad questions about occasions, combinations, packing, wardrobe gaps, and multiple outfit ideas.
- R3. The page offers concise example questions that can be placed into the question field with one action.
- R4. The page gives actionable setup guidance if the Stylist reports that no AI key is available, without claiming readiness before the service is contacted.
- R5. Responses continue to identify exact garments from the catalog and link back to those garments.

**Exact garment context**

- R6. The user can optionally select one active catalog garment as the subject of a question.
- R7. A garment detail page provides a prominent Ask the stylist about this item action.
- R8. Opening the Stylist from a garment preserves that garment as visible context.
- R9. When a garment is selected, ordinary references such as “this jacket” are interpreted as referring to that exact catalog item.
- R10. The selected garment remains available for follow-up questions until the user changes or clears it.

**Clear page roles**

- R11. Build an outfit remains the manual garment-selection, editing, and saving workspace.
- R12. The Builder no longer presents a limited natural-language field as though it were the full recommendation experience.
- R13. The Builder provides a clear route to the Stylist for users who need ideas before selecting pieces manually.
- R14. Existing occasion, closet, preview, and save controls in the Builder remain available.

**Safety and personal context**

- R15. The Stylist continues to use saved fit and mobility context without exposing unnecessary medical detail in the interface.
- R16. Asking for advice never changes wardrobe records, saved outfits, shopping lists, carts, accounts, or purchases without a separate explicit action.

---

## Key Flows

- F1. Ask for occasion-based ideas
  - **Trigger:** The user opens Stylist and asks a question such as “Dinner with friends tomorrow.”
  - **Steps:** The Stylist considers the question together with inventory, fit context, closet location, saved history, and available weather.
  - **Outcome:** The user receives concise advice grounded in exact catalog garments.
  - **Covered by:** R1-R5, R15-R16

- F2. Ask about one garment
  - **Trigger:** The user chooses a garment in Stylist or selects Ask the stylist about this item from its detail page.
  - **Steps:** The selected garment appears as context; the user asks “What goes with this?” or a more specific follow-up.
  - **Outcome:** The answer treats the selected catalog item as the subject and recommends compatible inventory pieces.
  - **Covered by:** R5-R10, R15-R16

- F3. Move from advice to manual editing
  - **Trigger:** The user wants to adjust or save an outfit after receiving advice.
  - **Steps:** The user opens Build an outfit and selects or changes the recommended pieces using the existing controls.
  - **Outcome:** No outfit is saved until the user selects Save outfit.
  - **Covered by:** R11-R14, R16

---

## Acceptance Examples

- AE1. **Covers R1-R5.** Given an enabled Stylist, when the user asks “Dinner with friends tomorrow,” then the answer uses the wardrobe and identifies exact relevant garments rather than requiring command-style phrasing.
- AE2. **Covers R3.** Given an empty question field, when the user chooses an example question, then that question appears ready to review and ask.
- AE3. **Covers R6-R10.** Given a selected jacket, when the user asks “What goes with this jacket?” then the request sent to the Stylist identifies that exact jacket and the interface keeps it visibly selected.
- AE4. **Covers R7-R9.** Given an open garment detail page, when the user selects Ask the stylist about this item, then Stylist opens with that garment already selected.
- AE5. **Covers R11-R14.** Given the Builder page, when the user needs recommendations, then a clear link points to Stylist while the manual selection and save workflow remains usable.
- AE6. **Covers R16.** Given any question or answer, when the user does not separately choose a modifying action, then no wardrobe, outfit, wishlist, shopping, or account data changes.

---

## Scope Boundaries

- This work improves wardrobe advice using the existing private catalog and Stylist connection.
- It does not add shopping, cart, checkout, purchase, account-creation, or credential-changing behavior.
- It does not require the manual Builder to understand arbitrary language.
- It does not automatically save an outfit from a chat response.
- Structured one-click transfer of a complete AI response into the Builder can be considered later after the conversational flow is reliable.

---

## Success Criteria

- A first-time user can immediately tell where to ask for advice and where to manually build an outfit.
- “Dinner with friends” works as a natural question without special syntax.
- “What goes with this?” works when a garment has been selected or supplied from its detail page.
- Recommendations remain grounded in the user's catalog and personal fit context.
- No wardrobe data changes during question-and-answer use.

---
title: "feat: Make the Stylist the conversational wardrobe adviser"
type: feat
date: 2026-09-23
origin: docs/brainstorms/2026-09-23-outfit-recommendations-requirements.md
---

# feat: Make the Stylist the conversational wardrobe adviser

## Summary

Consolidate natural-language wardrobe advice in the existing AI Stylist, add exact-garment context, and return Build an outfit to a clear manual editing role.

---

## Problem Frame

The Builder's recently added request field recognizes only a few phrases and cannot meet the expectation created by an open-ended prompt. The existing Stylist already sends the complete wardrobe, profile, outfits, wishlist, weather, and conversation history to the wardrobe-aware AI service, but its purpose and garment-context controls are not obvious enough.

---

## Requirements

**Conversational Stylist**

- R1. Make the Stylist's question field and Ask action the dominant recommendation controls.
- R2. Provide example questions for occasions, combinations, multiple looks, and packing.
- R3. Show actionable setup guidance if the Stylist service reports that no AI key is available; do not infer service readiness from personal-key storage alone.
- R4. Preserve exact linked garment references in assistant responses.

**Exact garment context**

- R5. Allow one active garment to be selected as optional question context.
- R6. Preserve a garment selected from a garment-detail deep link.
- R7. Enrich the AI request with the selected garment's exact ID and name while keeping the visible user message natural.
- R8. Keep the selected garment available for follow-up questions until it is cleared or changed.

**Clear page roles**

- R9. Add an obvious Ask the stylist about this item action to garment details.
- R10. Remove the limited natural-language interpretation experience from the manual Builder.
- R11. Add a prominent route from Builder to Stylist without removing manual selection, preview, or save controls.
- R12. Asking questions remains read-only unless the user separately chooses a modifying action.

---

## Key Technical Decisions

- **Reuse the existing Stylist service:** It already carries the private wardrobe and fit context required for open-ended questions, avoiding a second interpretation system.
- **Pass garment identity in the question envelope:** Client-side context enrichment supports “this jacket” without changing the deployed AI function contract or handling credentials.
- **Use URL garment context:** A garment-detail link can open Stylist with an exact catalog item while remaining bookmarkable and compatible with the current hash router.
- **Retire dead parser code:** Removing the narrow parser prevents two recommendation systems from drifting and makes page roles unambiguous.
- **Keep AI requests non-mutating:** Tests and live QA will ask questions but will not save outfits, alter garments, or add wishlist items.

---

## Implementation Units

### U1. Add deterministic garment-context enrichment

- **Goal:** Produce a stable AI question that identifies an optional selected garment without changing the user's visible wording.
- **Requirements:** R5-R8, R12
- **Files:** `src/lib/stylistRequest.js`, `src/lib/stylistRequest.test.js`
- **Approach:** Add a pure helper that returns the original question when no garment is selected and a concise exact-ID/name context envelope when one is selected.
- **Test scenarios:**
  - A normal occasion question passes through unchanged without a selected garment.
  - “What goes with this?” includes the selected garment's exact ID and name.
  - Empty or incomplete garment context does not produce misleading identity text.
- **Verification:** Unit tests prove context enrichment is deterministic and contains no writes or network behavior.

### U2. Make Stylist obvious and context-aware

- **Goal:** Turn the existing Stylist into the primary, easy-to-discover wardrobe question experience.
- **Requirements:** R1-R8, R12
- **Dependencies:** U1
- **Files:** `src/pages/Stylist.jsx`, `src/pages/Stylist.test.jsx`, `src/lib/data.js`, `src/styles.css`
- **Approach:** Replace the passive examples with selectable starter prompts, add an optional active-garment selector and selected-item summary, read garment context from the URL, enrich only the server-bound question, and use a read-only profile lookup for advice.
- **Patterns to follow:** Existing garment chips, segmented controls, chat bubbles, and Profile AI status handling.
- **Test scenarios:**
  - The initial page explains that the user can ask ordinary questions and exposes starter prompts.
  - Choosing a starter prompt fills the field without sending it automatically.
  - A garment ID in the URL becomes visible selected context after inventory loads.
  - The visible chat message remains the user's wording while the service receives exact garment context.
  - Successful connection and setup-needed states are clear after a service response, without exposing a key or making an unverified readiness claim.
- **Verification:** Server-rendered component tests cover the visible controls, pure helper tests cover the request boundary, and authenticated live QA covers effects and interactions without adding a DOM-test dependency.

### U3. Clarify garment and Builder entry points

- **Goal:** Make it obvious how to ask about a garment and distinguish advice from manual outfit construction.
- **Requirements:** R9-R12
- **Dependencies:** U2
- **Files:** `src/pages/GarmentDetail.jsx`, `src/pages/OutfitBuilder.jsx`, `src/pages/OutfitBuilder.test.jsx`, `src/components/OutfitSuggestion.jsx`, `src/lib/outfitRequest.js`, `src/lib/outfitRequest.test.js`, `src/styles.css`
- **Approach:** Link garment details to Stylist with the garment ID, replace the Builder's pseudo-chat with a concise Stylist callout, retain the editable preview save action, and remove parser-only code and unused edit plumbing.
- **Test scenarios:**
  - Garment detail creates a Stylist link containing the current garment ID.
  - Builder shows Ask the stylist before the manual garment controls.
  - Builder no longer shows a request input or Recommend outfits action.
  - Manual selection, outfit naming, notes, preview, and save controls remain.
- **Verification:** Server-rendered component tests, pure deep-link helper tests, the production build, and authenticated live QA confirm the entry points without changing persistence behavior.

### U4. Verify the complete live flow

- **Goal:** Confirm the deployed app supports broad and exact-garment questions without modifying wardrobe data.
- **Requirements:** R1-R12
- **Dependencies:** U1-U3
- **Files:** No source files; verification only.
- **Approach:** Run the full unit suite and production build, then exercise the authenticated live Stylist with an occasion question and an exact-garment question. Do not save an outfit, modify a garment, add a wishlist item, or change AI settings.
- **Test scenarios:**
  - “Dinner with friends” produces a wardrobe-grounded response or a clear inventory gap.
  - “What goes with this?” uses the selected garment and returns exact linked catalog items.
  - Builder routes clearly to Stylist and still supports manual garment selection.
- **Verification:** Record the live URL, observed response behavior, and any remaining inventory gaps.

---

## Scope Boundaries

- No Supabase schema changes or AI credential changes.
- No shopping, cart, checkout, purchase, or account behavior.
- No automatic outfit save or automatic wishlist mutation from chat.
- No attempt to make the manual Builder parse arbitrary language.
- Structured one-click transfer from a multi-outfit AI response to Builder is deferred.

---

## Risks and Dependencies

- The conversational flow depends on the existing authenticated Stylist function and a configured private AI key; the interface must show an actionable setup state when either is unavailable.
- Free-form responses may mention several alternative garments, so this scope preserves linked evidence without attempting ambiguous automatic transfer into the Builder.
- The live wardrobe currently lacks active shoes in D.C.; successful advice may still identify that inventory gap rather than produce a complete head-to-toe outfit.

---

## Acceptance Examples

- AE1. Given the Stylist is ready, when the user asks “Dinner with friends,” then the service receives the ordinary question with the existing wardrobe context and returns a concise grounded answer.
- AE2. Given a selected jacket, when the user asks “What goes with this?”, then the server-bound request includes the exact jacket ID and name while the chat displays only the user's question.
- AE3. Given a garment detail page, when the user chooses Ask the stylist about this item, then Stylist opens with that item visibly selected.
- AE4. Given Build an outfit, when the user needs ideas, then the page directs them to Stylist and keeps the manual editing and save workflow intact.
- AE5. Given any QA question, when no modifying action is selected, then garments, saved outfits, wishlist items, AI settings, carts, and purchases remain unchanged.

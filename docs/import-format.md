# Wardrobe bulk-import format

Canonical spec for bulk-importing garments (used for the initial full-wardrobe
creation by an external agent, and any future batch import).

## Deliverable

A single folder (or ZIP) containing:

- `wardrobe.json` — the manifest
- One image file per garment (JPEG/PNG, ≥800×800, product-style/flat-lay,
  garment alone on a plain light background, no human/mannequin)

Every `image` value in the manifest must exactly match a filename in the
folder; no extra or missing files.

## Manifest schema

```json
{
  "items": [
    {
      "image": "navy-chalk-stripe-suit.jpg",
      "name": "Navy chalk-stripe suit",
      "category": "suit",
      "location": "dc",
      "brand": "Brooks Brothers",
      "size": "Boys 14",
      "color": "Navy",
      "pattern": "Chalk stripe",
      "material": "Wool",
      "formality": "formal",
      "warmth": "mid",
      "status": "active",
      "notes": "",
      "fit_notes": ""
    }
  ]
}
```

## Field rules

| Field | Required | Values |
|---|---|---|
| `image` | yes | exact filename in the folder |
| `name` | yes | short descriptive name |
| `category` | yes | `suit, blazer, dress_shirt, casual_shirt, polo, t_shirt, sweater, dress_pants, chinos, jeans, shorts, dress_shoes, casual_shoes, boots, outerwear, tie, belt, pocket_square, scarf, hat, gloves, watch, cufflinks, socks, bag, accessory` |
| `location` | no | `dc` \| `howell` \| `""` — blanks default to `dc` at import (flagged in the report) |
| `formality` | no | `formal` \| `business_casual` \| `casual` \| `""` — blanks default to the category's standard at import |
| `warmth` | no | `light` \| `mid` \| `warm` \| `all` \| `""` — blanks default to the category's standard at import |
| `color` | no | preferred: the app's color list; free text allowed |
| `brand`,`size`,`pattern`,`material`,`notes`,`fit_notes` | no | free text, `""` if unknown; record sizes verbatim; never invent |
| `status` | no | `active` (default) \| `laundry` \| `tailor` \| `archived` |

Source-specific note (Proper Cloth pass, 2026-07): data comes from Kyle's
propercloth.com order history; fabric details go in `notes`; suit images show
jacket + trousers together, retail product style, no model; prefer the site's
actual product/fabric imagery over generated images.

## Import procedure (for the assistant)

1. Validate the manifest: required fields present, enums exact, image files
   all present, no orphans. Report problems instead of guessing.
2. Import runs under Kyle's signed-in session (storage RLS restricts photo
   uploads to the owner's folder) — via an import page in the app or an
   authenticated batch through the browser.
3. Photos upload to the `garments` bucket at `<user-id>/<uuid>.jpg` (the
   client pipeline downscales to ≤1200px JPEG); each item becomes a
   `garments` row with `photo_url` set.
4. After import: report counts per closet/category and list any skipped items.

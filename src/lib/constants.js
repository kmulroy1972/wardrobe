export const CATEGORIES = [
  { id: 'suit', label: 'Suit', slot: 'suit', formality: 'formal', warmth: 'mid' },
  { id: 'blazer', label: 'Blazer / Sport coat', slot: 'jacket', formality: 'business_casual', warmth: 'mid' },
  { id: 'dress_shirt', label: 'Dress shirt', slot: 'top', formality: 'formal', warmth: 'light' },
  { id: 'casual_shirt', label: 'Casual shirt', slot: 'top', formality: 'casual', warmth: 'light' },
  { id: 'polo', label: 'Polo', slot: 'top', formality: 'casual', warmth: 'light' },
  { id: 't_shirt', label: 'T-shirt', slot: 'top', formality: 'casual', warmth: 'light' },
  { id: 'sweater', label: 'Sweater / Knit', slot: 'layer', formality: 'business_casual', warmth: 'warm' },
  { id: 'dress_pants', label: 'Dress trousers', slot: 'bottom', formality: 'formal', warmth: 'mid' },
  { id: 'chinos', label: 'Chinos', slot: 'bottom', formality: 'business_casual', warmth: 'mid' },
  { id: 'jeans', label: 'Jeans', slot: 'bottom', formality: 'casual', warmth: 'mid' },
  { id: 'shorts', label: 'Shorts', slot: 'bottom', formality: 'casual', warmth: 'light' },
  { id: 'dress_shoes', label: 'Dress shoes', slot: 'shoes', formality: 'formal', warmth: 'all' },
  { id: 'casual_shoes', label: 'Sneakers / Casual shoes', slot: 'shoes', formality: 'casual', warmth: 'all' },
  { id: 'boots', label: 'Boots', slot: 'shoes', formality: 'casual', warmth: 'warm' },
  { id: 'outerwear', label: 'Coat / Outer jacket', slot: 'outer', formality: 'casual', warmth: 'warm' },
  { id: 'tie', label: 'Tie / Bow tie', slot: 'tie', formality: 'formal', warmth: 'all' },
  { id: 'belt', label: 'Belt', slot: 'belt', formality: 'business_casual', warmth: 'all' },
  { id: 'accessory', label: 'Accessory', slot: 'accessory', formality: 'casual', warmth: 'all' },
]

export const categoryById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[CATEGORIES.length - 1]

export const COLORS = [
  'White', 'Cream', 'Light blue', 'Blue', 'Navy', 'Gray', 'Charcoal', 'Black',
  'Brown', 'Tan', 'Khaki', 'Olive', 'Green', 'Burgundy', 'Red', 'Pink',
  'Purple', 'Orange', 'Yellow', 'Multi / Pattern',
]

export const NEUTRALS = new Set([
  'white', 'cream', 'gray', 'charcoal', 'black', 'navy', 'brown', 'tan', 'khaki', 'olive',
])

export const FORMALITY = [
  { id: 'formal', label: 'Formal' },
  { id: 'business_casual', label: 'Business casual' },
  { id: 'casual', label: 'Casual' },
]

export const WARMTH = [
  { id: 'light', label: 'Lightweight' },
  { id: 'mid', label: 'Midweight' },
  { id: 'warm', label: 'Warm' },
  { id: 'all', label: 'Any season' },
]

export const STATUSES = [
  { id: 'active', label: 'In closet' },
  { id: 'laundry', label: 'At laundry' },
  { id: 'tailor', label: 'At tailor' },
  { id: 'archived', label: 'Stored away' },
]

export const LOCATIONS = [
  { id: 'dc', label: 'Washington, D.C.' },
  { id: 'howell', label: 'Howell, NJ' },
]

export const SLOT_LABELS = {
  suit: 'Suit', jacket: 'Jacket', top: 'Shirt / Top', layer: 'Knit / Layer',
  bottom: 'Trousers', shoes: 'Shoes', outer: 'Outerwear', tie: 'Tie',
  belt: 'Belt', accessory: 'Accessory',
}

// The real fit profile is created server-side when the account is made;
// this fallback only appears if that somehow didn't run.
export const DEFAULT_FIT_NOTES = `Add your measurements and any fit guidance here — the stylist reads these notes on every recommendation.`

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
}

export const SunIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)

export const HangerIcon = (p) => (
  <svg {...base} {...p}><path d="M12 6.5a2 2 0 1 1 2-2" /><path d="M12 6.5v1.8" /><path d="M12 8.3 3.6 15c-.9.7-.4 2 .7 2h15.4c1.1 0 1.6-1.3.7-2L12 8.3z" /></svg>
)

export const SparkIcon = (p) => (
  <svg {...base} {...p}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" /></svg>
)

export const GridIcon = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
)

export const PersonIcon = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5" /></svg>
)

export const BagIcon = (p) => (
  <svg {...base} {...p}><path d="M6 8h12l1.2 12H4.8L6 8z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></svg>
)

export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
)

export const SearchIcon = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
)

// Category glyphs for garments without a photo yet
export const ShirtGlyph = (p) => (
  <svg {...base} {...p}><path d="M8.5 4 5 6.5l1.5 3.5 1.5-1V20h8v-11l1.5 1L19 6.5 15.5 4a3.5 3.5 0 0 1-7 0z" /></svg>
)

export const JacketGlyph = (p) => (
  <svg {...base} {...p}><path d="M9 4 5.5 6 4 20h5l1-8 2 3 2-3 1 8h5L18.5 6 15 4l-3 4.5L9 4z" /></svg>
)

export const PantsGlyph = (p) => (
  <svg {...base} {...p}><path d="M8 4h8l1.5 16H13l-1-9-1 9H6.5L8 4z" /></svg>
)

export const ShoeGlyph = (p) => (
  <svg {...base} {...p}><path d="M4 15V9c2 0 4 1 6 3 1.5 1.5 4 2 7 2.5 1.8.3 3 .8 3 2.5H4z" /><path d="M4 17h16" /></svg>
)

export const TieGlyph = (p) => (
  <svg {...base} {...p}><path d="M10 3h4l-1 3h-2l-1-3z" /><path d="M11 6h2l1.5 10L12 20l-2.5-4L11 6z" /></svg>
)

export const CoatGlyph = (p) => (
  <svg {...base} {...p}><path d="M9 3 5 5.5 4 21h5.5V11l2.5 4 2.5-4v10H20L19 5.5 15 3l-3 4-3-4z" /></svg>
)

export const BeltGlyph = (p) => (
  <svg {...base} {...p}><path d="M2 10h20v4H2z" /><rect x="9" y="8.5" width="6" height="7" rx="1" /><path d="M12 10.5v3" /></svg>
)

export const glyphForSlot = (slot) => (
  { suit: JacketGlyph, jacket: JacketGlyph, top: ShirtGlyph, layer: ShirtGlyph, bottom: PantsGlyph, shoes: ShoeGlyph, outer: CoatGlyph, tie: TieGlyph, belt: BeltGlyph, accessory: SparkIcon }[slot] || ShirtGlyph
)

import GarmentThumb from './GarmentThumb'

// Collage of the actual garment photos, laid out like clothes on a bed:
// jacket/suit and trousers get the big tiles, shoes and accessories small.
const TILE_SIZE = { suit: 'big', jacket: 'big', top: 'tall', layer: 'small', bottom: 'tall', shoes: 'small', outer: 'small', tie: 'small', belt: 'small', accessory: 'small' }
const TILE_ORDER = ['suit', 'jacket', 'top', 'bottom', 'layer', 'outer', 'shoes', 'tie', 'belt', 'accessory']

export default function FlatLay({ items }) {
  const sorted = [...items].sort(
    (a, b) => TILE_ORDER.indexOf(a.slot) - TILE_ORDER.indexOf(b.slot),
  )
  return (
    <div className="flatlay">
      {sorted.map(({ slot, g }, i) => (
        <div key={g.id + i} className={`tile ${TILE_SIZE[slot] || 'small'}`} title={g.name}>
          <GarmentThumb garment={g} />
        </div>
      ))}
    </div>
  )
}

import { categoryById } from '../lib/constants'
import { glyphForSlot } from './Icons'

export default function GarmentThumb({ garment, alt }) {
  if (garment?.photo_url) {
    return (
      <div className="ph">
        <img src={garment.photo_url} alt={alt || garment.name} loading="lazy" />
      </div>
    )
  }
  const Glyph = glyphForSlot(categoryById(garment?.category).slot)
  return (
    <div className="ph">
      <div className="placeholder" role="img" aria-label={alt || garment?.name || 'garment'}>
        <Glyph />
      </div>
    </div>
  )
}

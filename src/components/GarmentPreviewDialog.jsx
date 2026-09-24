import { useEffect, useRef } from 'react'
import GarmentThumb from './GarmentThumb'
import { categoryById, STATUSES } from '../lib/constants'

const statusLabel = (status) => STATUSES.find((item) => item.id === status)?.label || status

export default function GarmentPreviewDialog({ garment, onClose }) {
  const closeRef = useRef(null)

  useEffect(() => {
    if (!garment) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [garment, onClose])

  if (!garment) return null

  return (
    <div
      className="garment-preview-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="garment-preview"
        role="dialog"
        aria-modal="true"
        aria-labelledby="garment-preview-title"
      >
        <div className="garment-preview-actions">
          <button ref={closeRef} type="button" className="btn ghost" onClick={onClose}>
            ← Back to outfit
          </button>
          <button type="button" className="garment-preview-close" onClick={onClose} aria-label="Close garment preview">
            ×
          </button>
        </div>

        <div className="garment-preview-photo">
          <GarmentThumb garment={garment} />
        </div>

        <div className="garment-preview-details">
          <div className="eyebrow">{categoryById(garment.category).label}</div>
          <h2 id="garment-preview-title">{garment.name}</h2>
          <dl>
            {[
              ['Brand', garment.brand],
              ['Size', garment.size],
              ['Color', garment.color],
              ['Status', statusLabel(garment.status)],
              ['Closet', garment.location === 'dc' ? 'D.C.' : garment.location === 'howell' ? 'Howell' : garment.location],
            ].filter(([, value]) => value).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}

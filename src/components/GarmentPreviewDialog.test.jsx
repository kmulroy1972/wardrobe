import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import GarmentPreviewDialog from './GarmentPreviewDialog'

describe('GarmentPreviewDialog', () => {
  it('provides obvious ways to return to the outfit without navigating away', () => {
    const html = renderToStaticMarkup(
      <GarmentPreviewDialog
        garment={{
          id: 'jacket-1',
          name: 'Reda grey wool hopsack Bedford jacket',
          category: 'blazer',
          brand: 'Proper Cloth',
          size: 'Custom',
          color: 'Gray',
          photo_url: 'https://example.com/jacket.jpg',
        }}
        onClose={vi.fn()}
      />,
    )

    expect(html).toContain('role="dialog"')
    expect(html).toContain('Back to outfit')
    expect(html).toContain('aria-label="Close garment preview"')
    expect(html).toContain('Reda grey wool hopsack Bedford jacket')
    expect(html).not.toContain('href=')
  })
})

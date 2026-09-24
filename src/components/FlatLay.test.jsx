import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import FlatLay from './FlatLay'

describe('FlatLay', () => {
  it('makes every garment photo an obvious preview control when requested', () => {
    const html = renderToStaticMarkup(
      <FlatLay
        items={[
          { slot: 'jacket', g: { id: 'jacket-1', name: 'Grey jacket', category: 'blazer' } },
          { slot: 'top', g: { id: 'shirt-1', name: 'Blue shirt', category: 'dress_shirt' } },
        ]}
        onGarmentClick={vi.fn()}
      />,
    )

    expect(html).toContain('aria-label="Open larger photo of Grey jacket"')
    expect(html).toContain('aria-label="Open larger photo of Blue shirt"')
    expect(html.match(/<button/g)).toHaveLength(2)
  })
})

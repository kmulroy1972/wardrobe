import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import OutfitBuilder from './OutfitBuilder'

describe('OutfitBuilder', () => {
  it('routes recommendations to Stylist before the manual closet controls', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <OutfitBuilder />
      </MemoryRouter>,
    )

    expect(html).toContain('Ask the stylist in ordinary language')
    expect(html).toContain('href="/stylist"')
    expect(html).toContain('Build manually')
    expect(html).not.toContain('Recommend outfits')
    expect(html.indexOf('Ask the stylist')).toBeLessThan(html.indexOf('Opening the closet'))
  })
})

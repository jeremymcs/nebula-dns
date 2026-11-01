import { APP_ORIGIN, WWW_ORIGIN } from '../public-urls'

describe('public-urls defaults', () => {
  it('uses app subdomain for tenant dashboard', () => {
    expect(APP_ORIGIN).toBe('https://app.shield.fluxlabs.net')
  })

  it('uses apex shield host for marketing www', () => {
    expect(WWW_ORIGIN).toBe('https://shield.fluxlabs.net')
  })
})

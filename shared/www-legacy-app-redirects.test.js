'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  buildWwwLegacyAppRedirects,
  buildLegacyMarketingHostRedirects,
  resolveAppOrigin,
  LEGACY_APP_PATH_RULES,
} = require('./www-legacy-app-redirects.js')

describe('www legacy app redirects', () => {
  it('defaults app origin to app subdomain', () => {
    assert.equal(resolveAppOrigin({}), 'https://app.shield.fluxlabs.net')
  })

  it('strips trailing slash from NEXT_PUBLIC_APP_URL', () => {
    assert.equal(
      resolveAppOrigin({ NEXT_PUBLIC_APP_URL: 'https://app.example.com/' }),
      'https://app.example.com',
    )
  })

  it('maps invite accept to app host preserving path pattern', () => {
    const redirects = buildWwwLegacyAppRedirects('https://app.shield.fluxlabs.net')
    const invite = redirects.find((r) => r.source === '/invite/:path*')
    assert.ok(invite)
    assert.equal(invite.destination, 'https://app.shield.fluxlabs.net/invite/:path*')
    assert.equal(invite.permanent, true)
  })

  it('covers expected legacy app paths', () => {
    const sources = LEGACY_APP_PATH_RULES.map((r) => r.source)
    assert.ok(sources.includes('/login'))
    assert.ok(sources.includes('/signup'))
    assert.ok(sources.includes('/mfa'))
    assert.ok(sources.includes('/dashboard/:path*'))
  })

  it('redirects nebuladns.io hosts to shield marketing origin', () => {
    const redirects = buildLegacyMarketingHostRedirects()
    assert.equal(redirects.length, 2)
    assert.equal(redirects[0].destination, 'https://shield.fluxlabs.net/:path*')
    assert.equal(redirects[0].has[0].value, 'www.nebuladns.io')
  })
})

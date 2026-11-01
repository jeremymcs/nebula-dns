// Flux Shield — MFA backup codes print view
import {
  buildMfaBackupCodesPrintHtml,
  escapeHtml,
  FLUX_SHIELD_PRODUCT_NAME,
  FLUX_LABS_POWERED_BY,
  printMfaBackupCodes,
} from '@/lib/print-mfa-backup-codes'

describe('print-mfa-backup-codes', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml(`a&b<>"'`)).toBe('a&amp;b&lt;&gt;&quot;&#39;')
    })
  })

  describe('buildMfaBackupCodesPrintHtml', () => {
    it('includes product name, account, codes, and security note', () => {
      const html = buildMfaBackupCodesPrintHtml({
        codes: ['ABCD1234', 'EFGH5678'],
        accountLabel: 'user@example.com',
        generatedAt: new Date('2026-11-01T13:00:00.000Z'),
      })

      expect(html).toContain(FLUX_SHIELD_PRODUCT_NAME)
      expect(html).toContain(FLUX_LABS_POWERED_BY)
      expect(html).toContain('user@example.com')
      expect(html).toContain('ABCD1234')
      expect(html).toContain('EFGH5678')
      expect(html).toContain('Each backup code works only once')
      expect(html).toContain('@media print')
      expect(html).not.toContain('localStorage')
    })

    it('escapes malicious account labels', () => {
      const html = buildMfaBackupCodesPrintHtml({
        codes: ['SAFE0001'],
        accountLabel: '<script>alert(1)</script>',
      })
      expect(html).not.toContain('<script>')
      expect(html).toContain('&lt;script&gt;')
    })
  })

  describe('printMfaBackupCodes', () => {
    it('writes HTML to a blank popup without query parameters', () => {
      const write = jest.fn()
      const close = jest.fn()
      const open = jest.fn()
      const print = jest.fn()
      const focus = jest.fn()

      const mockDoc = {
        open: jest.fn(),
        write,
        close,
        readyState: 'complete' as DocumentReadyState,
      }

      open.mockReturnValue({
        document: mockDoc,
        focus,
        print,
        addEventListener: jest.fn(),
      })

      const originalOpen = window.open
      window.open = open

      try {
        printMfaBackupCodes({
          codes: ['CODE0001'],
          accountLabel: 'admin@fluxlabs.net',
        })
      } finally {
        window.open = originalOpen
      }

      expect(open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('noopener'),
      )
      expect(open.mock.calls[0][0]).toBe('')
      expect(write).toHaveBeenCalledTimes(1)
      expect(String(write.mock.calls[0][0])).toContain('CODE0001')
      expect(print).toHaveBeenCalled()
    })
  })
})

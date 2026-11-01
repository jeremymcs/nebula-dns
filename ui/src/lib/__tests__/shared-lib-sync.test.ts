import fs from 'fs'
import path from 'path'

const repoRoot = path.resolve(__dirname, '../../../..')

describe('shared lib sync', () => {
  it('keeps print-mfa-backup-codes.ts identical to shared/', () => {
    const sharedPath = path.join(repoRoot, 'shared/print-mfa-backup-codes.ts')
    const localPath = path.join(__dirname, '../print-mfa-backup-codes.ts')
    expect(fs.readFileSync(localPath, 'utf8')).toBe(fs.readFileSync(sharedPath, 'utf8'))
  })
})

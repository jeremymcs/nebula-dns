import { resolveTenantUploadFile } from './block-page-upload.util';

describe('block-page-upload.util', () => {
  const root = '/tmp/block-pages';

  it('resolves files under tenant directory', () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    const file = resolveTenantUploadFile(root, tenantId, 'logo.png');
    expect(file).toBe(`${root}/${tenantId}/logo.png`);
  });

  it('rejects path traversal in filename', () => {
    const tenantId = '11111111-1111-4111-8111-111111111111';
    expect(() =>
      resolveTenantUploadFile(root, tenantId, '../secret.txt'),
    ).toThrow('Invalid filename');
  });

  it('rejects invalid tenant ids', () => {
    expect(() => resolveTenantUploadFile(root, 'not-a-uuid', 'a.png')).toThrow(
      'Invalid tenant id',
    );
  });
});

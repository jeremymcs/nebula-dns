import { parseDomainLine } from './ut1-stream-loader';

describe('ut1-stream-loader', () => {
  it('parseDomainLine skips comments and blanks', () => {
    expect(parseDomainLine('# x')).toBeNull();
    expect(parseDomainLine('  evil.com  ')).toBe('evil.com');
  });
});

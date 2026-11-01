import { parseDomainLines } from './ut1-tar-extract';

describe('ut1-tar-extract', () => {
  it('parses domain lines', () => {
    const domains = parseDomainLines('# comment\nevil.com\n\nfoo.bar\n');
    expect(domains).toEqual(['evil.com', 'foo.bar']);
  });
});

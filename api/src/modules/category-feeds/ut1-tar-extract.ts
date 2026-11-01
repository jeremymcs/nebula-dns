import * as tar from 'tar';
import { Readable } from 'stream';

/**
 * Extract UT1 `blacklists/<category>/domains` files from the official tar.gz.
 */
export async function extractUt1DomainsFromTarGz(
  buffer: Buffer,
  categories: string[],
): Promise<Map<string, string[]>> {
  const wanted = new Set(categories);
  const out = new Map<string, string[]>();

  await new Promise<void>((resolve, reject) => {
    const parser = tar.t({
      onentry: (entry) => {
        const parts = entry.path.split('/');
        if (parts.length < 3) return;
        const category = parts[parts.length - 2];
        const fileName = parts[parts.length - 1];
        if (fileName !== 'domains' || !wanted.has(category)) {
          entry.resume();
          return;
        }

        const chunks: Buffer[] = [];
        entry.on('data', (c: Buffer) => chunks.push(c));
        entry.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          out.set(category, parseDomainLines(text));
        });
      },
    });

    parser.on('finish', () => resolve());
    parser.on('error', reject);
    Readable.from(buffer).pipe(parser);
  });

  return out;
}

export function parseDomainLines(content: string): string[] {
  const domains: string[] = [];
  for (const line of content.split('\n')) {
    const trimmed = line.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith('#')) continue;
    domains.push(trimmed);
  }
  return domains;
}

import * as tar from 'tar';
import * as zlib from 'zlib';
import * as https from 'https';
import * as http from 'http';
import { olbatDomainsUrl, UT1_OLBAT_MIRROR_BASE, UT1_TAR_URL } from './ut1-category-map';

export type DomainLineHandler = (
  ut1Category: string,
  domain: string,
) => void | Promise<void>;

export function parseDomainLine(line: string): string | null {
  const trimmed = line.trim().toLowerCase();
  if (!trimmed || trimmed.startsWith('#')) return null;
  return trimmed;
}

async function streamLinesFromReadable(
  readable: NodeJS.ReadableStream,
  onLine: (line: string) => void | Promise<void>,
): Promise<void> {
  let buffer = '';
  for await (const chunk of readable) {
    buffer += chunk.toString('utf8');
    let idx: number;
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      await onLine(line);
    }
  }
  if (buffer.length) await onLine(buffer);
}

export async function streamUt1TarGzCategories(
  ut1Categories: Set<string>,
  onDomain: DomainLineHandler,
  tarUrl: string = UT1_TAR_URL,
): Promise<Set<string>> {
  const loaded = new Set<string>();
  const entryTasks: Promise<void>[] = [];

  await new Promise<void>((resolve, reject) => {
    const protocol = tarUrl.startsWith('https') ? https : http;
    const request = protocol.get(
      tarUrl,
      {
        headers: { 'User-Agent': 'FluxShield-CategoryLoader/1.0' },
        timeout: 600_000,
      },
      (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const loc = res.headers.location;
          if (loc) {
            streamUt1TarGzCategories(ut1Categories, onDomain, loc)
              .then((s) => {
                s.forEach((c) => loaded.add(c));
                resolve();
              })
              .catch(reject);
            return;
          }
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }

        const parser = tar.t({
          onentry: (entry) => {
            const parts = entry.path.split('/');
            if (parts.length < 3) {
              entry.resume();
              return;
            }
            const ut1Cat = parts[parts.length - 2];
            const fileName = parts[parts.length - 1];
            if (fileName !== 'domains' || !ut1Categories.has(ut1Cat)) {
              entry.resume();
              return;
            }

            loaded.add(ut1Cat);
            entryTasks.push(
              streamLinesFromReadable(
                entry as unknown as NodeJS.ReadableStream,
                async (line) => {
                const domain = parseDomainLine(line);
                if (domain) await onDomain(ut1Cat, domain);
              }),
            );
          },
        });

        parser.on('finish', () => {
          Promise.all(entryTasks).then(() => resolve()).catch(reject);
        });
        parser.on('error', reject);
        res.pipe(zlib.createGunzip()).pipe(parser);
      },
    );
    request.on('error', reject);
  });

  return loaded;
}

export async function streamOlbatUt1Category(
  ut1Category: string,
  onDomain: (domain: string) => void | Promise<void>,
): Promise<number> {
  let count = 0;
  let part = 0;
  while (true) {
    const suffix = part === 0 ? 'domains' : `domains.${part}`;
    const url = `${UT1_OLBAT_MIRROR_BASE}/${ut1Category}/${suffix}`;
    const status = await streamUrlLines(url, async (line) => {
      const domain = parseDomainLine(line);
      if (!domain) return;
      count++;
      await onDomain(domain);
    });
    if (status === 'missing') {
      if (part === 0) throw new Error(`Mirror missing ${ut1Category}`);
      break;
    }
    part++;
  }
  return count;
}

async function streamUrlLines(
  url: string,
  onLine: (line: string) => void | Promise<void>,
): Promise<'ok' | 'missing'> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(
      url,
      {
        headers: { 'User-Agent': 'FluxShield-CategoryLoader/1.0' },
        timeout: 600_000,
      },
      (res) => {
        if (res.statusCode === 404) {
          res.resume();
          resolve('missing');
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        streamLinesFromReadable(res, onLine)
          .then(() => resolve('ok'))
          .catch(reject);
      },
    );
    request.on('error', reject);
  });
}

export async function streamOlbatUt1CategoryMapped(
  ut1Category: string,
  onDomain: DomainLineHandler,
): Promise<number> {
  return streamOlbatUt1Category(ut1Category, (domain) =>
    onDomain(ut1Category, domain),
  );
}

export function olbatSplitUrls(ut1Category: string): string[] {
  return [olbatDomainsUrl(ut1Category)];
}

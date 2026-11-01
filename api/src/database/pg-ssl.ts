import fs from 'node:fs';

export type PostgresSslConfig =
  | false
  | { rejectUnauthorized: boolean; ca?: string };

function parseSslMode(connectionString: string): string | undefined {
  const match = connectionString.match(/(?:^|[?&])sslmode=([^&]+)/i);
  return match?.[1]?.toLowerCase();
}

/**
 * PostgreSQL SSL options for TypeORM / node-pg.
 * Prefer `sslmode=require` in DATABASE_URL (Neon). Optional PGSSLROOTCERT for custom CAs.
 */
export function getPostgresSslConfig(): PostgresSslConfig {
  const connectionString = process.env.DATABASE_URL ?? '';
  const sslMode =
    process.env.PGSSLMODE?.toLowerCase() ||
    parseSslMode(connectionString) ||
    (process.env.NODE_ENV === 'production' ? 'require' : 'disable');

  if (sslMode === 'disable') {
    return false;
  }

  if (sslMode === 'no-verify') {
    return { rejectUnauthorized: false };
  }

  const caPath = process.env.PGSSLROOTCERT || process.env.DATABASE_SSL_CA_PATH;
  if (caPath && fs.existsSync(caPath)) {
    return {
      rejectUnauthorized: true,
      ca: fs.readFileSync(caPath, 'utf8'),
    };
  }

  return { rejectUnauthorized: true };
}

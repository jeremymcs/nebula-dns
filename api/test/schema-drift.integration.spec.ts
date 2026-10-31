/**
 * Fails when TypeORM entities declare columns/tables missing after all migrations.
 */
import { execSync } from 'child_process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import * as path from 'path';

describe('Entity schema drift (integration)', () => {
  jest.setTimeout(180000);

  it('matches entities after migrations:run', async () => {
    const container = await new PostgreSqlContainer('postgres:16')
      .withDatabase('nebula_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    const databaseUrl = `postgresql://test:test@${container.getHost()}:${container.getMappedPort(5432)}/nebula_test?sslmode=disable`;

    try {
      execSync('npm run migration:run', {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NODE_ENV: 'development',
        },
        stdio: 'pipe',
      });

      execSync('npm run schema:audit', {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          NODE_ENV: 'development',
        },
        stdio: 'pipe',
      });
    } finally {
      await container.stop();
    }
  });
});

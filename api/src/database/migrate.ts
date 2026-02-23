// Nebula DNS - Standalone Migration Runner
// Copyright (c) 2026 Jeremy McSpadden <jeremy@fluxlabs.net>
//
// Runs TypeORM migrations and forces process exit when done.
// Used by the Kubernetes migration job instead of the TypeORM CLI to
// avoid the CLI's known issue of not exiting after completion.

import { AppDataSource } from './data-source';

async function runMigrations(): Promise<void> {
  console.log('[migrate] Initializing data source...');

  await AppDataSource.initialize();
  console.log('[migrate] Connected to database');

  const pending = await AppDataSource.showMigrations();
  if (!pending) {
    console.log('[migrate] No pending migrations — nothing to do');
  } else {
    console.log('[migrate] Running pending migrations...');
    const migrations = await AppDataSource.runMigrations({ transaction: 'all' });
    console.log(`[migrate] Applied ${migrations.length} migration(s):`);
    for (const m of migrations) {
      console.log(`  ✓ ${m.name}`);
    }
  }

  await AppDataSource.destroy();
  console.log('[migrate] Done');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate] FAILED:', err);
    process.exit(1);
  });

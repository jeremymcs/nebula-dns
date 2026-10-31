/**
 * Compare TypeORM entity metadata to the live database (after migrations).
 * Reports missing tables/columns required by entities. Ignores FK/index naming drift.
 */
import { AppDataSource } from '../database/data-source';
import type { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';

interface DriftItem {
  kind: 'missing_table' | 'missing_column';
  table: string;
  column?: string;
  expectedType?: string;
}

async function columnExists(
  queryRunner: ReturnType<typeof AppDataSource.createQueryRunner>,
  table: string,
  column: string,
): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column],
  );
  return rows.length > 0;
}

async function tableExists(
  queryRunner: ReturnType<typeof AppDataSource.createQueryRunner>,
  table: string,
): Promise<boolean> {
  const rows = await queryRunner.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = $1`,
    [table],
  );
  return rows.length > 0;
}

function describeColumn(column: ColumnMetadata): string {
  return `${column.type}${column.length ? `(${column.length})` : ''}${
    column.isNullable ? ' nullable' : ' not null'
  }`;
}

async function main(): Promise<void> {
  AppDataSource.setOptions({ logging: false });
  await AppDataSource.initialize();
  const queryRunner = AppDataSource.createQueryRunner();
  const drift: DriftItem[] = [];

  try {
    for (const meta of AppDataSource.entityMetadatas) {
      const table = meta.tableName;
      if (!(await tableExists(queryRunner, table))) {
        drift.push({ kind: 'missing_table', table });
        continue;
      }

      for (const column of meta.columns) {
        const dbName = column.databaseName;
        if (!(await columnExists(queryRunner, table, dbName))) {
          drift.push({
            kind: 'missing_column',
            table,
            column: dbName,
            expectedType: describeColumn(column),
          });
        }
      }
    }

    if (drift.length === 0) {
      console.log('OK: all entity tables and columns exist in the database');
      process.exit(0);
    }

    console.error(
      `ENTITY SCHEMA DRIFT: ${drift.length} issue(s) (missing tables/columns only)\n`,
    );
    for (const item of drift) {
      if (item.kind === 'missing_table') {
        console.error(`- MISSING TABLE: ${item.table}`);
      } else {
        console.error(
          `- MISSING COLUMN: ${item.table}.${item.column} (${item.expectedType})`,
        );
      }
    }
    process.exit(1);
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});

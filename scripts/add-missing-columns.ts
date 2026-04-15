/**
 * Migración quirúrgica: añade solo las columnas que faltan en Turso.
 * No toca tablas existentes ni borra datos.
 * Ejecutar: npx tsx scripts/add-missing-columns.ts
 */
import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const client = createClient({
  url:       process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

const MIGRATIONS = [
  {
    description: 'extracted_images.is_discarded',
    sql: `ALTER TABLE extracted_images ADD COLUMN is_discarded INTEGER DEFAULT 0`,
  },
  {
    description: 'documents.auditor_recommendations',
    sql: `ALTER TABLE documents ADD COLUMN auditor_recommendations TEXT`,
  },
];

async function run() {
  for (const m of MIGRATIONS) {
    try {
      await client.execute(m.sql);
      console.log(`  ✓  ${m.description}`);
    } catch (err: any) {
      if (err?.message?.includes('duplicate column name') || err?.message?.includes('already exists')) {
        console.log(`  –  ${m.description} (ya existe, omitida)`);
      } else {
        console.error(`  ✗  ${m.description}: ${err.message}`);
        process.exit(1);
      }
    }
  }
  console.log('\nMigración completada.');
  process.exit(0);
}

run();

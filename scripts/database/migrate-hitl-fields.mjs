import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

// Leer .env manualmente
const envFile = readFileSync('.env', 'utf-8');
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);

const client = createClient({
  url:       env.TURSO_URL_TESIS,
  authToken: env.TURSO_TOKEN_TESIS,
});

async function migrate() {
  try {
    await client.execute('ALTER TABLE extracted_images ADD COLUMN is_useful INTEGER DEFAULT 0');
    console.log('✅ is_useful column added');
  } catch(e) { console.log('⚠️  is_useful ya existe:', e.message); }

  try {
    await client.execute('ALTER TABLE extracted_images ADD COLUMN user_comment TEXT');
    console.log('✅ user_comment column added');
  } catch(e) { console.log('⚠️  user_comment ya existe:', e.message); }

  console.log('✅ Migración completada');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });

import { readFileSync } from 'fs';
import { resolve } from 'path';
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env not found */ }

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL_TESIS || process.env.TURSO_URL || 'libsql://dummy-url',
  authToken: process.env.TURSO_TOKEN_TESIS || process.env.TURSO_TOKEN,
});

async function main() {
  const res = await client.execute('SELECT * FROM ablation_configurations ORDER BY display_order');
  console.log(JSON.stringify(res.rows, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });

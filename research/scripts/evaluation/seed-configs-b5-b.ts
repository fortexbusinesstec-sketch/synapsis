import { createClient } from '@libsql/client';
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
} catch {}

const client = createClient({
  url: process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

const configs = [
  {
    id: 'B5',
    name: 'B5 - Pipeline completo',
    description: 'Full pipeline con Enrutador Semántico, Verificador y React Loop',
    clarifier_enabled: 1,
    bibliotecario_enabled: 1,
    analista_enabled: 1,
    planner_enabled: 1,
    selector_enabled: 1,
    images_enabled: 1,
    image_validator_enabled: 1,
    enrichments_enabled: 1,
    rag_enabled: 1,
    is_baseline: 0,
    display_order: 55,
  },
  {
    id: 'E',
    name: 'E - Sin router/verificador',
    description: 'Pipeline sin Enrutador Semántico ni Verificador, con React Loop',
    clarifier_enabled: 1,
    bibliotecario_enabled: 1,
    analista_enabled: 1,
    planner_enabled: 1,
    selector_enabled: 1,
    images_enabled: 1,
    image_validator_enabled: 1,
    enrichments_enabled: 1,
    rag_enabled: 1,
    is_baseline: 0,
    display_order: 50,
  },
];

async function run() {
  console.log('\n=== Seeding B5 and B configs ===\n');

  for (const c of configs) {
    const existing = await client.execute({
      sql: 'SELECT id FROM ablation_configurations WHERE id = ?',
      args: [c.id],
    });
    if (existing.rows.length > 0) {
      console.log(`Config "${c.id}" already exists — skipping.`);
      continue;
    }

      await client.execute({
        sql: `INSERT INTO ablation_configurations
          (id, name, description,
           clarifier_enabled, bibliotecario_enabled, analista_enabled,
           planner_enabled, selector_enabled, images_enabled,
           image_validator_enabled, enrichments_enabled, rag_enabled,
           is_baseline, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          c.id, c.name, c.description,
          c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
          c.planner_enabled, c.selector_enabled, c.images_enabled,
          c.image_validator_enabled, c.enrichments_enabled, c.rag_enabled,
          c.is_baseline, c.display_order,
        ],
      });
    console.log(`  ✓ Created config "${c.id}"`);
  }

  console.log('\n=== Done ===\n');
  await client.close();
}

run().catch((err) => { console.error(err); process.exit(1); });

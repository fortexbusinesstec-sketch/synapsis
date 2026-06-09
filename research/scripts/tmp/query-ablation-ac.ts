import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

// Load .env manually
const envPath = path.resolve(__dirname, '../../../.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  let val = trimmed.slice(eqIdx + 1);
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  env[trimmed.slice(0, eqIdx)] = val;
}

const client = createClient({
  url: env.TURSO_URL_TESIS || env.TURSO_URL || '',
  authToken: env.TURSO_TOKEN_TESIS || env.TURSO_TOKEN,
});

function printTable(rows: any[], title: string) {
  if (!rows.length) { console.log(`\n=== ${title} ===\n(no rows)\n`); return; }
  const cols = Object.keys(rows[0]);
  const pad = (s: any, w: number) => String(s ?? '').padEnd(w);
  const widths = cols.map(c => Math.max(c.length, ...rows.map(r => String(r[c] ?? '').length)));
  const sep = cols.map((c, i) => '-'.repeat(widths[i])).join(' | ');
  console.log(`\n=== ${title} ===\n`);
  console.log(cols.map((c, i) => pad(c, widths[i])).join(' | '));
  console.log(sep);
  for (const r of rows) {
    console.log(cols.map((c, i) => pad(r[c], widths[i])).join(' | '));
  }
  console.log(`\n(${rows.length} rows)\n`);
}

async function main() {
  // 1. All distinct config IDs
  const distinct = await client.execute('SELECT DISTINCT config_id FROM ablation_runs ORDER BY config_id');
  printTable(distinct.rows, 'ALL DISTINCT CONFIG_IDS IN ablation_runs');

  // 2. Config A and C - status counts
  const counts = await client.execute(`
    SELECT config_id, status, COUNT(*) as count
    FROM ablation_runs
    WHERE config_id IN ('A', 'C')
    GROUP BY config_id, status
  `);
  printTable(counts.rows, 'CONFIG A & C - STATUS COUNTS');

  // 3. All runs for A and C
  const runs = await client.execute(`
    SELECT r.id, r.config_id, r.question_id, r.status, r.total_ms, r.cost_usd, r.loop_count, r.chunks_retrieved, r.response_text, r.error_message, r.run_batch
    FROM ablation_runs r
    WHERE r.config_id IN ('A', 'C')
    ORDER BY r.config_id, r.question_id
    LIMIT 200
  `);
  printTable(runs.rows, 'ALL RUNS FOR CONFIG A & C');

  // 4. Scores joined with runs for A and C
  const scores = await client.execute(`
    SELECT s.run_id, r.config_id, r.question_id, r.status, s.score_total, s.score_factual, s.score_diagnostic, s.score_correctness, s.score_completeness, s.score_relevance, s.score_clarity, s.safe_decision_rate, s.judge_reasoning
    FROM ablation_scores s
    JOIN ablation_runs r ON s.run_id = r.id
    WHERE r.config_id IN ('A', 'C')
    ORDER BY r.config_id, r.question_id
  `);
  printTable(scores.rows, 'SCORES FOR CONFIG A & C');

  // 5. All ablation configurations
  const configs = await client.execute('SELECT * FROM ablation_configurations ORDER BY display_order');
  printTable(configs.rows, 'ALL ABLATION CONFIGURATIONS');
}

main().catch(console.error);

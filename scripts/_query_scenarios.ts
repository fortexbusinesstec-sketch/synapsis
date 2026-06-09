import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

const env = readFileSync('.env', 'utf8');
const vars: Record<string, string> = {};
for (const line of env.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const eq = t.indexOf('=');
  if (eq === -1) continue;
  vars[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
}

const client = createClient({
  url: vars.TURSO_URL_TESIS!,
  authToken: vars.TURSO_TOKEN_TESIS,
});

async function main() {
  // Check what tables exist
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%scenario%' ORDER BY name");
  console.log('=== SCENARIO TABLES ===');
  for (const r of tables.rows) console.log(JSON.stringify(r));

  // Try scenario runs
  try {
    const runs = await client.execute("SELECT * FROM ablation_scenario_runs ORDER BY config_id, scenario_id");
    console.log('\n=== SCENARIO RUNS ===');
    console.log(`Count: ${runs.rows.length}`);
    for (const r of runs.rows) console.log(JSON.stringify(r));
  } catch(e) { console.log('No ablation_scenario_runs:', (e as Error).message); }

  // Try scores
  try {
    const scores = await client.execute("SELECT * FROM ablation_scenario_scores ORDER BY run_id");
    console.log('\n=== SCENARIO SCORES ===');
    console.log(`Count: ${scores.rows.length}`);
    for (const r of scores.rows) console.log(JSON.stringify(r));
  } catch(e) { console.log('No ablation_scenario_scores:', (e as Error).message); }

  // Avg per config
  try {
    const avg = await client.execute(`
      SELECT sr.config_id, 
         COUNT(*) as num,
         ROUND(AVG(ss.score_total), 4) as avg_total,
         ROUND(AVG(ss.score_factual), 4) as avg_factual,
         ROUND(AVG(ss.score_diagnostic), 4) as avg_diag,
         ROUND(AVG(sr.total_cost_usd), 6) as avg_cost,
         ROUND(AVG(sr.total_duration_ms), 2) as avg_latency,
         ROUND(AVG(sr.total_tokens), 2) as avg_tokens,
         ROUND(AVG(sr.total_loops), 2) as avg_loops
      FROM ablation_scenario_runs sr
      JOIN ablation_scenario_scores ss ON ss.run_id = sr.id
      GROUP BY sr.config_id
      ORDER BY sr.config_id
    `);
    console.log('\n=== SCENARIO AVERAGES PER CONFIG ===');
    for (const r of avg.rows) console.log(JSON.stringify(r));
  } catch(e) { console.log('No avg query:', (e as Error).message); }
}
main().catch(console.error).then(() => process.exit(0));

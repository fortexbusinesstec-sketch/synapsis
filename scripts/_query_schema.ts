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
  // Schema
  const schema = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name LIKE '%scenario%' ORDER BY name");
  console.log('=== SCHEMA ===');
  for (const r of schema.rows) console.log((r as any).sql);
  
  // Counts per config in scenario_runs
  const cnt = await client.execute(`
    SELECT config_id, COUNT(*) as cnt, 
           ROUND(AVG(total_cost_usd), 6) as avg_cost,
           ROUND(AVG(total_latency_ms), 2) as avg_latency,
           ROUND(AVG(total_tokens), 2) as avg_tokens,
           ROUND(AVG(total_loops_fired), 2) as avg_loops,
           ROUND(AVG(turns_to_resolution), 2) as avg_turns_to_resolve,
           ROUND(CAST(SUM(resolution_reached) AS REAL) / COUNT(*) * 100, 1) as resolution_rate
    FROM ablation_scenario_runs 
    GROUP BY config_id
    ORDER BY config_id
  `);
  console.log('\n=== SCENARIO AVERAGES PER CONFIG ===');
  for (const r of cnt.rows) console.log(JSON.stringify(r));

  // Now check the scores table columns
  const scoreSchema = await client.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='ablation_scenario_scores'");
  console.log('\n=== SCORES SCHEMA ===');
  for (const r of scoreSchema.rows) console.log((r as any).sql);
  
  // Try to get scores
  try {
    const scores = await client.execute("SELECT * FROM ablation_scenario_scores LIMIT 10");
    console.log('\n=== SCORES SAMPLE ===');
    for (const r of scores.rows) console.log(JSON.stringify(r));
  } catch(e) { console.log('Error:', (e as Error).message); }
}
main().catch(console.error).then(() => process.exit(0));

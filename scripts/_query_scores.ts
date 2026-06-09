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
  // Avg scores per config from scenario tables
  const avg = await client.execute(`
    SELECT sr.config_id, 
       COUNT(*) as num,
       ROUND(AVG(ss.score_total), 4) as avg_total,
       ROUND(AVG(ss.score_diagnostic_progression), 4) as avg_diag,
       ROUND(AVG(ss.score_factual_consistency), 4) as avg_factual,
       ROUND(AVG(ss.score_hypothesis_refinement), 4) as avg_hypothesis,
       ROUND(AVG(ss.score_technician_effort), 4) as avg_effort,
       ROUND(AVG(CASE WHEN ss.resolution_reached THEN 1 ELSE 0 END) * 100, 1) as pct_resolution,
       ROUND(AVG(ss.critical_error_made) * 100, 1) as pct_errors,
       ROUND(AVG(sr.total_cost_usd), 6) as avg_cost,
       ROUND(AVG(sr.total_latency_ms), 2) as avg_latency,
       ROUND(AVG(sr.total_tokens), 2) as avg_tokens,
       ROUND(AVG(sr.total_loops_fired), 2) as avg_loops,
       ROUND(AVG(sr.turns_to_resolution), 2) as avg_turns_resolve
    FROM ablation_scenario_runs sr
    JOIN ablation_scenario_scores ss ON ss.scenario_run_id = sr.id
    GROUP BY sr.config_id
    ORDER BY sr.config_id
  `);
  console.log('=== SCENARIO SCORES PER CONFIG (all 50 scenarios each) ===');
  console.log('config_id | num | score_total | score_diag | score_factual | score_hypothesis | score_effort | %resolution | %errors | avg_cost | avg_latency | avg_tokens | avg_loops | avg_turns_resolve');
  for (const r of avg.rows) {
    const row = r as any;
    console.log(`${row.config_id} | ${row.num} | ${row.avg_total} | ${row.avg_diag} | ${row.avg_factual} | ${row.avg_hypothesis} | ${row.avg_effort} | ${row.pct_resolution} | ${row.pct_errors} | ${row.avg_cost} | ${row.avg_latency} | ${row.avg_tokens} | ${row.avg_loops} | ${row.avg_turns_resolve}`);
  }
}
main().catch(console.error).then(() => process.exit(0));

import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_URL_TESIS || process.env.TURSO_URL || '',
  authToken: process.env.TURSO_TOKEN_TESIS || process.env.TURSO_TOKEN,
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
  // 1. Configurations
  const configs = await client.execute('SELECT * FROM ablation_configurations ORDER BY display_order');
  printTable(configs.rows, 'ABLATION CONFIGURATIONS');

  // 2. Aggregated results per config_id
  const agg = await client.execute(`
    SELECT r.config_id,
           COUNT(*) as num_runs,
           ROUND(AVG(s.score_total), 4) as avg_score_total,
           ROUND(AVG(s.score_factual), 4) as avg_score_factual,
           ROUND(AVG(s.score_diagnostic), 4) as avg_score_diagnostic,
           ROUND(AVG(r.total_ms), 0) as avg_total_ms,
           ROUND(AVG(r.cost_usd), 6) as avg_cost_usd,
           ROUND(AVG(r.loop_count), 2) as avg_loops,
           ROUND(AVG(r.chunks_retrieved), 1) as avg_chunks
    FROM ablation_runs r
    LEFT JOIN ablation_scores s ON r.id = s.run_id
    WHERE r.status = 'done'
    GROUP BY r.config_id
    ORDER BY r.config_id
  `);
  printTable(agg.rows, 'AGGREGATED RESULTS PER CONFIG_ID');

  // 3. All done runs with scores
  const detailed = await client.execute(`
    SELECT s.run_id, r.config_id, r.question_id, 
           s.score_total, s.score_factual, s.score_diagnostic,
           r.total_ms, r.cost_usd, r.loop_count, r.chunks_retrieved
    FROM ablation_scores s
    JOIN ablation_runs r ON s.run_id = r.id
    WHERE r.status = 'done'
    ORDER BY r.config_id, r.question_id
  `);
  printTable(detailed.rows, 'DETAILED SCORES PER RUN (done)');

  // 4. Summary table (precomputed)
  const summaries = await client.execute(`
    SELECT s.*, c.name as config_name, c.display_order, c.is_baseline,
           c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
           c.image_validator_enabled, c.rag_enabled
    FROM ablation_summary s
    JOIN ablation_configurations c ON s.config_id = c.id
    ORDER BY s.question_category, c.display_order
  `);
  printTable(summaries.rows, 'PRECOMPUTED SUMMARY');

  // 5. Status counts
  const status = await client.execute(`
    SELECT config_id, status, COUNT(*) as cnt
    FROM ablation_runs
    GROUP BY config_id, status
    ORDER BY config_id, status
  `);
  printTable(status.rows, 'RUN STATUS COUNTS PER CONFIG');
}

main().catch(console.error);

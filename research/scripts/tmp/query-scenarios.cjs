// Run: node research/scripts/tmp/query-scenarios.cjs
const { createClient } = require('@libsql/client');

async function main() {
  const client = createClient({
    url: process.env.TURSO_URL_TESIS || 'libsql://htl-synapse-ia-fabrizioftx.aws-us-east-1.turso.io',
    authToken: process.env.TURSO_TOKEN_TESIS,
  });

  console.log('=== ablation_scenarios ===');
  const scenarios = await client.execute('SELECT * FROM ablation_scenarios');
  console.log(JSON.stringify(scenarios.rows, null, 2));
  console.log(`\nRows: ${scenarios.rows.length}\n`);

  console.log('=== ablation_scenario_turns ===');
  const turns = await client.execute('SELECT * FROM ablation_scenario_turns');
  console.log(JSON.stringify(turns.rows, null, 2));
  console.log(`\nRows: ${turns.rows.length}\n`);

  console.log('=== ablation_scenario_runs ===');
  const runs = await client.execute('SELECT * FROM ablation_scenario_runs ORDER BY config_id, scenario_id');
  console.log(JSON.stringify(runs.rows, null, 2));
  console.log(`\nRows: ${runs.rows.length}\n`);

  console.log('=== ablation_scenario_scores ===');
  const scores = await client.execute('SELECT * FROM ablation_scenario_scores ORDER BY scenario_run_id');
  console.log(JSON.stringify(scores.rows, null, 2));
  console.log(`\nRows: ${scores.rows.length}\n`);

  client.close();
}

main().catch(console.error);

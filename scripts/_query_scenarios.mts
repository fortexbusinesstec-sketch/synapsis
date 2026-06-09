import { createClient } from '@libsql/client';
import 'dotenv/config';

const client = createClient({
  url: process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN,
});

async function main() {
  const runs = await client.execute("SELECT * FROM ablation_scenario_runs ORDER BY config_id, scenario_id");
  console.log('=== SCENARIO RUNS ===');
  for (const r of runs.rows) console.log(JSON.stringify(r));
  
  const scores = await client.execute("SELECT * FROM ablation_scenario_scores ORDER BY run_id");
  console.log('\n=== SCENARIO SCORES ===');
  for (const r of scores.rows) console.log(JSON.stringify(r));
}
main().catch(console.error).then(() => process.exit(0));

import { client } from '../../lib/db';

async function main() {
  const query = `
    SELECT 
      sr.config_id,
      AVG(tr.latency_ms) / 1000.0 as avg_seconds,
      COUNT(*) as total_turns,
      MIN(tr.latency_ms) / 1000.0 as min_seconds,
      MAX(tr.latency_ms) / 1000.0 as max_seconds
    FROM ablation_scenario_turn_results tr
    JOIN ablation_scenario_runs sr ON tr.scenario_run_id = sr.id
    WHERE sr.config_id IN ('B', 'D') AND tr.latency_ms IS NOT NULL
    GROUP BY sr.config_id
    ORDER BY sr.config_id
  `;
  
  try {
    const res = await client.execute(query);
    console.log("=== Resultados Config B (Tiempo de Respuesta en Segundos) ===");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error executing query:", err);
  }
}

main();

import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_URL_TESIS,
    authToken: process.env.TURSO_TOKEN_TESIS,
});

async function run() {
    console.log("🔥 Eliminando columnas de Scenarios...");

    const queries = [
        "ALTER TABLE ablation_scenario_runs DROP COLUMN total_loops_fired",
        "ALTER TABLE ablation_scenario_runs DROP COLUMN avg_confidence_session",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN chunks_used",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN loops_fired",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN confidence",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN gap_type",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN latency_ms",
        "ALTER TABLE ablation_scenario_turn_results DROP COLUMN cost_usd",
        "ALTER TABLE ablation_scenario_summary DROP COLUMN avg_total_loops_fired"
    ];

    for (const sql of queries) {
        try {
            console.log(`Executing: ${sql}`);
            await client.execute(sql);
        } catch (e) {
            console.error(`Failed ${sql}:`, e.message);
        }
    }

    console.log("✅ Limpieza de Scenarios completada.");
}

run().catch(console.error);

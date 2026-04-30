import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_URL_TESIS,
    authToken: process.env.TURSO_TOKEN_TESIS,
});

async function run() {
    console.log("🔥 Eliminando columnas no utilizadas...");

    const queries = [
        "ALTER TABLE ablation_scores DROP COLUMN recall_at_3",
        "ALTER TABLE ablation_scores DROP COLUMN mrr",
        "ALTER TABLE ablation_runs DROP COLUMN final_confidence",
        "ALTER TABLE ablation_runs DROP COLUMN gap_resolved",
        "ALTER TABLE ablation_summary DROP COLUMN avg_recall_at_3",
        "ALTER TABLE ablation_summary DROP COLUMN avg_mrr",
        "ALTER TABLE ablation_summary DROP COLUMN avg_gap_resolved"
    ];

    for (const sql of queries) {
        try {
            console.log(`Executing: ${sql}`);
            await client.execute(sql);
        } catch (e) {
            console.error(`Failed ${sql}:`, e.message);
        }
    }

    console.log("✅ Limpieza completada.");
}

run().catch(console.error);

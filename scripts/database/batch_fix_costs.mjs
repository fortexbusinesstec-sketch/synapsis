import { createClient } from '@libsql/client';
import path from 'path';

const client = createClient({
    url: process.env.TURSO_URL_TESIS,
    authToken: process.env.TURSO_TOKEN_TESIS,
});

const VISION_COST_PER_IMAGE = 0.0002;
const OCR_COST_PER_PAGE = 0.001;

async function run() {
    console.log("🚀 Iniciando recalculo de costos Vision...");

    // 1. Obtener documentos con cost_vision 0
    const docsResult = await client.execute(`
    SELECT id, page_count, cost_orchestrator, cost_ocr, cost_chunker, cost_embedder 
    FROM documents 
    WHERE cost_vision = 0
  `);

    for (const doc of docsResult.rows) {
        const id = doc.id;

        // 2. Contar imágenes
        const imgResult = await client.execute({
            sql: "SELECT COUNT(*) as count FROM extracted_images WHERE document_id = ? AND is_discarded = 0",
            args: [id]
        });

        const imgCount = Number(imgResult.rows[0].count);
        const newCostVision = imgCount * VISION_COST_PER_IMAGE;
        const newCostOcr = (Number(doc.page_count) || 0) * OCR_COST_PER_PAGE;

        const totalCost =
            Number(doc.cost_orchestrator || 0) +
            newCostOcr +
            newCostVision +
            Number(doc.cost_chunker || 0) +
            Number(doc.cost_embedder || 0);

        console.log(`📄 Doc ${id}: ${imgCount} imágenes -> Vision: $${newCostVision.toFixed(5)}, OCR: $${newCostOcr.toFixed(5)}, Total: $${totalCost.toFixed(5)}`);

        // 3. Actualizar
        await client.execute({
            sql: "UPDATE documents SET cost_vision = ?, cost_ocr = ?, total_cost = ? WHERE id = ?",
            args: [newCostVision, newCostOcr, totalCost, id]
        });
    }

    console.log("✅ Proceso completado.");
}

run().catch(console.error);

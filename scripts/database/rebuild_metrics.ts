import { db } from '../lib/db';
import { documents, indexingMetrics, documentChunks } from '../lib/db/schema';
import { updateIndexingMetricsSnapshot } from '../lib/agents/curious';
import { eq, sql } from 'drizzle-orm';

async function rebuild() {
  console.log('--- Iniciando Reconstrucción de Métricas ---');
  
  // 1. Buscar todos los documentos
  const allDocs = await db.select({ id: documents.id, title: documents.title }).from(documents);
  console.log(`Encontrados ${allDocs.length} documentos en total.`);

  for (const doc of allDocs) {
    // Verificar si tiene métricas
    const [metrics] = await db.select().from(indexingMetrics).where(eq(indexingMetrics.documentId, doc.id)).limit(1);
    
    if (!metrics) {
      console.log(`[!] Documento "${doc.title}" (ID: ${doc.id}) no tiene métricas. Reconstruyendo...`);
      try {
        await updateIndexingMetricsSnapshot(doc.id);
        console.log(`[✓] Métricas reconstruidas para: ${doc.title}`);
      } catch (err) {
        console.error(`[X] Error reconstruyendo métricas para ${doc.id}:`, (err as Error).message);
      }
    } else {
      // Opcional: Forzar actualización para asegurar que el conteo es correcto con el nuevo código
      console.log(`[~] Actualizando métricas existentes para: ${doc.title}`);
      await updateIndexingMetricsSnapshot(doc.id);
    }
  }
  
  console.log('--- Proceso Finalizado ---');
}

rebuild().catch(console.error);

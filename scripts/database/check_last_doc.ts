import { db } from '../lib/db';
import { documents, indexingMetrics } from '../lib/db/schema';
import { desc, eq } from 'drizzle-orm';

async function check() {
  const [lastDoc] = await db.select().from(documents).orderBy(desc(documents.createdAt)).limit(1);
  if (!lastDoc) {
    console.log('No hay documentos.');
    return;
  }
  
  const [metrics] = await db.select().from(indexingMetrics).where(eq(indexingMetrics.documentId, lastDoc.id)).limit(1);
  
  console.log('ID:', lastDoc.id);
  console.log('Título:', lastDoc.title);
  console.log('Métricas presentes:', !!metrics);
  if (metrics) {
    console.log('Métricas:', JSON.stringify(metrics, null, 2));
  } else {
    console.log('⚠️ Las métricas no se pudieron generar por el error de SQL.');
  }
}

check().catch(console.error);

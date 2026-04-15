/**
 * Document Cleanup Utility — Anti-corrupción de data
 * 
 * Elimina rastro de un documento fallido o no deseado:
 * 1. Registros en Turso (Chunks, Imágenes, Logs, Documento).
 * 2. Archivos físicos en Vercel Blob (PDF e imágenes recortadas).
 */
import { eq }            from 'drizzle-orm';
import { db }            from '@/lib/db';
import { deleteBlobs }   from '@/lib/storage/blob';
import { 
  documents, 
  documentChunks, 
  extractedImages, 
  agentLogs,
  indexingMetrics,
  enrichments
} from '@/lib/db/schema';

export async function cleanupDocument(documentId: string) {
  console.log(`[cleanup] Iniciando limpieza de documento: ${documentId}`);

  try {
    // 1. Obtener URLs de los archivos en R2 antes de borrar los registros
    const [doc] = await db
      .select({ pdfUrl: documents.pdfUrl })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    const images = await db
      .select({ imageUrl: extractedImages.imageUrl })
      .from(extractedImages)
      .where(eq(extractedImages.documentId, documentId));

    // 2. Eliminar de Cloudflare R2
    const urlsToDelete: string[] = [];
    if (doc?.pdfUrl) urlsToDelete.push(doc.pdfUrl);
    images.forEach(img => urlsToDelete.push(img.imageUrl));

    if (urlsToDelete.length > 0) {
      console.log(`[cleanup] Eliminando ${urlsToDelete.length} archivos de Cloudflare R2...`);
      await deleteBlobs(urlsToDelete);
    }

    // 3. Eliminar de la base de datos (Orden de dependencias)
    // El esquema debería tener ON DELETE CASCADE, pero lo hacemos explícito por seguridad.
    console.log(`[cleanup] Eliminando registros de la base de datos...`);
    
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    await db.delete(extractedImages).where(eq(extractedImages.documentId, documentId));
    await db.delete(agentLogs).where(eq(agentLogs.documentId, documentId));
    await db.delete(indexingMetrics).where(eq(indexingMetrics.documentId, documentId));
    await db.delete(enrichments).where(eq(enrichments.documentId, documentId));
    await db.delete(documents).where(eq(documents.id, documentId));

    console.log(`[cleanup] Limpieza completada con éxito.`);
  } catch (error) {
    console.error(`[cleanup] Error crítico durante la limpieza de ${documentId}:`, error);
    throw error;
  }
}

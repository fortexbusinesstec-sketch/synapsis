import { sqliteTable, text, integer, real, index, customType } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

/**
 * Tipo personalizado para vectores FLOAT32 de Turso.
 * Mapea a FLOAT32(N) en libSQL y convierte entre number[] y Buffer en la app.
 */
const f32Blob = customType<{
  data: number[];
  driverData: ArrayBuffer;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `F32_BLOB(${config?.dimensions ?? 1536})`;
  },
  fromDriver(value: ArrayBuffer) {
    return Array.from(new Float32Array(value));
  },
  toDriver(value: number[]) {
    return Buffer.from(new Float32Array(value).buffer) as unknown as ArrayBuffer;
  },
});

/* ────────────────────────────────────────────────────────────────────────── */

// 1. Tabla Maestra de Documentos
export const documents = sqliteTable('documents', (table) => {
  return {
    id:             text('id').primaryKey().$defaultFn(() => createId()),
    title:          text('title').notNull(),
    
    // Taxonomía de equipo
    brand:          text('brand').default('Schindler'), // 'Schindler', etc.
    equipmentModel: text('equipment_model'),       // '3300', '5500', 'MRL'
    docType:        text('doc_type'),             // 'manual' | 'plano' | 'certificado'
    language:       text('language').default('es'),

    // Storage
    pdfUrl:         text('pdf_url').notNull(),
    pageCount:      integer('page_count'),
    fileSizeKb:     integer('file_size_kb'),

    // Pipeline de procesamiento
    status:         text('status').default('pending'),
    statusDetail:   text('status_detail'),
    ocrCompletedAt: text('ocr_completed_at'),
    embeddedAt:     text('embedded_at'),
    createdAt:      text('created_at')
                      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt:      text('updated_at')
                      .default(sql`CURRENT_TIMESTAMP`),

    // FinOps: Costos acumulados (USD)
    costOrchestrator: real('cost_orchestrator').default(0),
    costOcr:          real('cost_ocr').default(0),
    costVision:       real('cost_vision').default(0),
    costChunker:      real('cost_chunker').default(0),
    costEmbedder:     real('cost_embedder').default(0),
    totalCost:        real('total_cost').default(0),
  };
}, (table) => ({
  idxDocumentsModel:  index('idx_documents_model').on(table.equipmentModel),
  idxDocumentsStatus: index('idx_documents_status').on(table.status),
}));

// 2. Fragmentos de Texto (RAG)
export const documentChunks = sqliteTable('document_chunks', (table) => {
  return {
    id:           text('id').primaryKey().$defaultFn(() => createId()),
    documentId:   text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    content:      text('content').notNull(),
    pageNumber:   integer('page_number'),
    chunkIndex:   integer('chunk_index'),
    
    // Metadata semántica
    sectionTitle: text('section_title'),
    chunkType:    text('chunk_type'),
    hasWarning:   integer('has_warning').default(0),
    contentTokens: integer('content_tokens'),

    embedding:    f32Blob('embedding', { dimensions: 1536 }),
    createdAt:    text('created_at')
                    .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxChunksDocument: index('idx_chunks_document').on(table.documentId),
  idxChunksPage:     index('idx_chunks_page').on(table.documentId, table.pageNumber),
  idxChunksWarning:  index('idx_chunks_warning').on(table.hasWarning),
}));

// 3. Imágenes Extraídas (Multimodal)
export const extractedImages = sqliteTable('extracted_images', (table) => {
  return {
    id:           text('id').primaryKey().$defaultFn(() => createId()),
    documentId:   text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    pageNumber:   integer('page_number'),
    imageUrl:     text('image_url').notNull(),
    
    // Output de Pixtral
    imageType:    text('image_type'),
    confidence:   real('confidence'),
    description:  text('description'),
    
    // Contexto cruzado
    relatedChunkId: text('related_chunk_id').references(() => documentChunks.id),
    isCritical:     integer('is_critical').default(0),

    embedding:    f32Blob('embedding', { dimensions: 1536 }),
    createdAt:    text('created_at')
                    .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxImagesDocument: index('idx_images_document').on(table.documentId),
  idxImagesCritical: index('idx_images_critical').on(table.isCritical),
  idxImagesType:     index('idx_images_type').on(table.imageType),
}));

// 4. Sesiones RAG (Feedback loop)
export const ragQueries = sqliteTable('rag_queries', (table) => {
  return {
    id:             text('id').primaryKey().$defaultFn(() => createId()),
    queryText:      text('query_text').notNull(),
    equipmentModel: text('equipment_model'),
    
    topChunkIds:    text('top_chunk_ids'), // JSON array de IDs
    topImageIds:    text('top_image_ids'), // JSON array de IDs
    answerText:     text('answer_text'),
    
    wasHelpful:     integer('was_helpful'),
    responseMs:     integer('response_ms'),
    
    createdAt:      text('created_at')
                      .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxQueriesModel:   index('idx_queries_model').on(table.equipmentModel),
  idxQueriesHelpful: index('idx_queries_helpful').on(table.wasHelpful),
}));

// 5. Logs de actividad por agente (Observabilidad RAG)
export const agentLogs = sqliteTable('agent_logs', (table) => ({
  id:            text('id').primaryKey().$defaultFn(() => createId()),
  documentId:    text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  agentName:     text('agent_name').notNull(),
  status:        text('status').notNull().default('running'),
  startedAt:     text('started_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt:       text('ended_at'),
  durationMs:    integer('duration_ms'),
  inputTokens:   integer('input_tokens').default(0),
  outputTokens:  integer('output_tokens').default(0),
  inputSummary:  text('input_summary'),
  outputSummary: text('output_summary'),
  errorMessage:  text('error_message'),
  errorStack:    text('error_stack'),
  metadata:      text('metadata'),
}), (table) => ({
  idxAgentLogsDocument: index('idx_agent_logs_document').on(table.documentId),
  idxAgentLogsStatus:   index('idx_agent_logs_status').on(table.status),
}));

// 6. Enrichments — Conocimiento experto (Human-in-the-Loop)
export const enrichments = sqliteTable(
  'enrichments',
  {
    id:               text('id').primaryKey().$defaultFn(() => createId()),
    documentId:       text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

    // Referencia al vector original que tiene la laguna
    // reference_type: 'chunk' → document_chunks.id | 'image' → extracted_images.id
    referenceId:      text('reference_id').notNull(),
    referenceType:    text('reference_type').notNull(), // 'chunk' | 'image'

    // El contenido original que generó la duda (para mostrar en UI)
    originalExcerpt:  text('original_excerpt').notNull(),

    // La laguna detectada por el Agente Curioso
    generatedQuestion: text('generated_question').notNull(),
    questionContext:   text('question_context'),

    // La respuesta del experto humano
    expertAnswer:     text('expert_answer'),       // NULL hasta que se responda
    answerSource:     text('answer_source').default('pending'),
    // 'pending' | 'expert' | 'manual_ref' | 'inferred'

    // Control de calidad
    confidence:       real('confidence').default(0.0),
    isVerified:       integer('is_verified').default(0), // 1 cuando se confirma

    // Página del documento donde está el fragmento origen
    pageNumber:       integer('page_number'),

    // Cuántas veces el RAG sirvió esta respuesta en consultas reales
    timesRetrieved:   integer('times_retrieved').default(0),

    // Tokens estimados de la respuesta del experto (para control del contexto RAG)
    answerLengthTokens: integer('answer_length_tokens'),

    // Vector de la respuesta para búsqueda semántica
    embedding:        f32Blob('embedding', { dimensions: 1536 }),

    createdAt:        text('created_at').default(sql`CURRENT_TIMESTAMP`),
    reviewedAt:       text('reviewed_at'),
  },
  (table) => ({
    idxEnrichmentsDocument:  index('idx_enrichments_document').on(table.documentId),
    idxEnrichmentsReference: index('idx_enrichments_reference').on(table.referenceId),
    idxEnrichmentsPending:   index('idx_enrichments_pending').on(table.answerSource),
  }),
);

/* ── Tipos inferidos (útiles para el resto de la app) ──────────────────── */

export type Document             = typeof documents.$inferSelect;
export type NewDocument          = typeof documents.$inferInsert;
export type DocumentChunk        = typeof documentChunks.$inferSelect;
export type NewDocumentChunk     = typeof documentChunks.$inferInsert;
export type ExtractedImage       = typeof extractedImages.$inferSelect;
export type NewExtractedImage    = typeof extractedImages.$inferInsert;
export type RagQuery             = typeof ragQueries.$inferSelect;
export type NewRagQuery          = typeof ragQueries.$inferInsert;
export type AgentLog             = typeof agentLogs.$inferSelect;
export type NewAgentLog          = typeof agentLogs.$inferInsert;
export type Enrichment           = typeof enrichments.$inferSelect;
export type NewEnrichment        = typeof enrichments.$inferInsert;

/** Subconjunto seguro para exponer en la API (sin campos internos de BD). */
export interface AgentLogSummary {
  id:            string;
  agentName:     string;
  status:        string;
  startedAt:     string | null;
  endedAt:       string | null;
  durationMs:    number | null;
  inputTokens:   number | null;
  outputTokens:  number | null;
  inputSummary:  string | null;
  outputSummary: string | null;
  errorMessage:  string | null;
}

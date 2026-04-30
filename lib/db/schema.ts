import { sqliteTable, text, integer, real, index, customType, uniqueIndex } from 'drizzle-orm/sqlite-core';
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
    id: text('id').primaryKey().$defaultFn(() => createId()),
    title: text('title').notNull(),

    // Taxonomía de equipo
    brand: text('brand').default('Schindler'), // 'Schindler', etc.
    equipmentModel: text('equipment_model'),       // '3300', '5500', 'MRL'
    docType: text('doc_type'),             // 'manual' | 'plano' | 'certificado'
    language: text('language').default('es'),

    // Storage
    pdfUrl: text('pdf_url').notNull(),
    pageCount: integer('page_count'),
    fileSizeKb: integer('file_size_kb'),

    // Pipeline de procesamiento
    status: text('status').default('pending'),
    statusDetail: text('status_detail'),
    ocrCompletedAt: text('ocr_completed_at'),
    embeddedAt: text('embedded_at'),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
      .default(sql`CURRENT_TIMESTAMP`),

    // FinOps: Costos acumulados (USD)
    costOrchestrator: real('cost_orchestrator').default(0),
    costOcr: real('cost_ocr').default(0),
    costVision: real('cost_vision').default(0),
    costChunker: real('cost_chunker').default(0),
    costEmbedder: real('cost_embedder').default(0),
    totalCost: real('total_cost').default(0),

    // Auditor (Agente 2.5) feedback
    auditorRecommendations: text('auditor_recommendations'), // JSON Array de recomendaciones
    auditorRecommendation: text('auditor_recommendation'),  // Marca de auditor ("AUDITOR")
    createdBy: text('created_by'), // ID del usuario que lo creó
  };
}, (table) => ({
  idxDocumentsModel: index('idx_documents_model').on(table.equipmentModel),
  idxDocumentsStatus: index('idx_documents_status').on(table.status),
}));

// 2. Fragmentos de Texto (RAG)
export const documentChunks = sqliteTable('document_chunks', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    pageNumber: integer('page_number'),
    chunkIndex: integer('chunk_index'),

    // Metadata semántica
    sectionTitle: text('section_title'),
    chunkType: text('chunk_type'),
    hasWarning: integer('has_warning').default(0),
    contentTokens: integer('content_tokens'),

    embedding: f32Blob('embedding', { dimensions: 1536 }),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxChunksDocument: index('idx_chunks_document').on(table.documentId),
  idxChunksPage: index('idx_chunks_page').on(table.documentId, table.pageNumber),
  idxChunksWarning: index('idx_chunks_warning').on(table.hasWarning),
}));

// 3. Imágenes Extraídas (Multimodal)
export const extractedImages = sqliteTable('extracted_images', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number'),
    imageUrl: text('image_url').notNull(),

    // Output de Pixtral
    imageType: text('image_type'),
    confidence: real('confidence'),
    description: text('description'),

    // Contexto cruzado
    relatedChunkId: text('related_chunk_id').references(() => documentChunks.id),
    isCritical: integer('is_critical').default(0),
    isDiscarded: integer('is_discarded').default(0), // Human-In-The-Loop descarte manual

    // HITL — Revisión humana de utilidad
    // 0 = pendiente de revisión | 1 = Útil | -1 = No útil (descartar)
    isUseful: integer('is_useful').default(0),
    userComment: text('user_comment'),              // Comentario del humano ("es el diagrama SCIC que controla X")

    embedding: f32Blob('embedding', { dimensions: 1536 }),
    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxImagesDocument: index('idx_images_document').on(table.documentId),
  idxImagesCritical: index('idx_images_critical').on(table.isCritical),
  idxImagesType: index('idx_images_type').on(table.imageType),
}));

// 4. Sesiones RAG (Feedback loop)
export const ragQueries = sqliteTable('rag_queries', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    queryText: text('query_text').notNull(),
    equipmentModel: text('equipment_model'),

    topChunkIds: text('top_chunk_ids'), // JSON array de IDs
    topImageIds: text('top_image_ids'), // JSON array de IDs
    answerText: text('answer_text'),

    wasHelpful: integer('was_helpful'),
    responseMs: integer('response_ms'),

    createdAt: text('created_at')
      .default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxQueriesModel: index('idx_queries_model').on(table.equipmentModel),
  idxQueriesHelpful: index('idx_queries_helpful').on(table.wasHelpful),
}));

// 5. Logs de actividad por agente (Observabilidad RAG)
export const agentLogs = sqliteTable('agent_logs', (table) => ({
  id: text('id').primaryKey().$defaultFn(() => createId()),
  documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  agentName: text('agent_name').notNull(),
  status: text('status').notNull().default('running'),
  startedAt: text('started_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt: text('ended_at'),
  durationMs: integer('duration_ms'),
  inputTokens: integer('input_tokens').default(0),
  outputTokens: integer('output_tokens').default(0),
  inputSummary: text('input_summary'),
  outputSummary: text('output_summary'),
  errorMessage: text('error_message'),
  errorStack: text('error_stack'),
  metadata: text('metadata'),
}), (table) => ({
  idxAgentLogsDocument: index('idx_agent_logs_document').on(table.documentId),
  idxAgentLogsStatus: index('idx_agent_logs_status').on(table.status),
}));

// 6. Enrichments — Conocimiento experto (Human-in-the-Loop)
export const enrichments = sqliteTable(
  'enrichments',
  {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

    // Referencia al vector original que tiene la laguna
    // reference_type: 'chunk' → document_chunks.id | 'image' → extracted_images.id
    referenceId: text('reference_id').notNull(),
    referenceType: text('reference_type').notNull(), // 'chunk' | 'image'

    // El contenido original que generó la duda (para mostrar en UI)
    originalExcerpt: text('original_excerpt').notNull(),

    // La laguna detectada por el Agente Curioso
    generatedQuestion: text('generated_question').notNull(),
    questionContext: text('question_context'),

    // La respuesta del experto humano
    expertAnswer: text('expert_answer'),       // NULL hasta que se responda
    answerSource: text('answer_source').default('pending'),
    // 'pending' | 'expert' | 'manual_ref' | 'inherited'

    // Nivel de herencia (para Paper Q1): 1=Exacto, 2=Meta/Modelo, 3=Semántico
    inheritanceLevel: integer('inheritance_level'),

    // Control de calidad
    confidence: real('confidence').default(0.0),
    isVerified: integer('is_verified').default(0), // 1 cuando se confirma

    // Página del documento donde está el fragmento origen
    pageNumber: integer('page_number'),

    // Cuántas veces el RAG sirvió esta respuesta en consultas reales
    timesRetrieved: integer('times_retrieved').default(0),

    // Tokens estimados de la respuesta del experto (para control del contexto RAG)
    answerLengthTokens: integer('answer_length_tokens'),

    // Vector de la respuesta para búsqueda semántica
    embedding: f32Blob('embedding', { dimensions: 1536 }),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    reviewedAt: text('reviewed_at'),
  },
  (table) => ({
    idxEnrichmentsDocument: index('idx_enrichments_document').on(table.documentId),
    idxEnrichmentsReference: index('idx_enrichments_reference').on(table.referenceId),
    idxEnrichmentsPending: index('idx_enrichments_pending').on(table.answerSource),
  }),
);

// 7. Métricas de Indexación (Para Paper Q1 / Analytics)
export const indexingMetrics = sqliteTable('indexing_metrics', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    documentId: text('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),

    // Contéo Estructural
    totalChunks: integer('total_chunks').default(0),
    hitlImages: integer('hitl_images').default(0),

    // Resiliencia & Agent Mismatch
    agentMismatchCount: integer('agent_mismatch_count').default(0),

    // Lagunas & Conocimiento
    detectedGaps: integer('detected_gaps').default(0),
    inheritedL1: integer('inherited_l1').default(0),
    inheritedL2: integer('inherited_l2').default(0),
    inheritedL3: integer('inherited_l3').default(0),

    // Eficiencia & FinOps
    totalInputTokens: integer('total_input_tokens').default(0),
    totalOutputTokens: integer('total_output_tokens').default(0),
    processingTimeMs: integer('processing_time_ms').default(0),

    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxMetricsDocument: index('idx_metrics_document').on(table.documentId),
}));


// ─── Chat Pipeline ───────────────────────────────────────────────────────────

// 8. Sesiones de chat
export const chatSessions = sqliteTable('chat_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id'),                         // ID del usuario que inició la sesión
  mode: text('mode').notNull().default('test'),    // 'test' | 'record'
  equipmentModel: text('equipment_model'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  endedAt: text('ended_at'),
  messageCount: integer('message_count').default(0),
  totalTokens: integer('total_tokens').default(0),
  totalCostUsd: real('total_cost_usd').default(0),
});

// 9. Mensajes de chat
export const chatMessages = sqliteTable('chat_messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => chatSessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),              // 'user' | 'assistant' | 'clarification'
  content: text('content').notNull(),
  clarificationData: text('clarification_data'),          // JSON si role = 'clarification'
  retrievedChunkIds: text('retrieved_chunk_ids'),          // JSON array de chunk IDs
  retrievedImageIds: text('retrieved_image_ids'),          // JSON array de image IDs
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  idxMessagesSession: index('idx_messages_session').on(table.sessionId),
}));

// ─── Ablation Study ─────────────────────────────────────────────────────────

// 11. Banco de preguntas del piloto / experimento completo
export const ablationQuestions = sqliteTable('ablation_questions', {
  id: text('id').primaryKey(),                      // 'P01'..'P10' | 'Q001'..'Q100'
  category: text('category').notNull(),                   // 'diagnostico_tecnico' | 'ambigua' | 'secuencial' | 'enriquecimiento' | 'visual'
  categoryNumber: integer('category_number').notNull(),         // 1..5
  questionText: text('question_text').notNull(),
  expectedAgentCritical: text('expected_agent_critical'),              // 'clarifier' | 'image_validator' | 'enrichment' | 'analista'
  difficulty: text('difficulty').notNull().default('medium'),         // 'easy' | 'medium' | 'hard'
  groundTruth: text('ground_truth').notNull(),
  reasoningIndicators: text('reasoning_indicators'),                // JSON array de indicadores
  requiresVisual: integer('requires_visual').default(0),
  requiresEnrichment: integer('requires_enrichment').default(0),
  requiresOrdering: integer('requires_ordering').default(0),
  isAmbiguous: integer('is_ambiguous').default(0),
  equipmentModel: text('equipment_model'),                      // '3300' | '5500' | 'general'
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// 12. Configuraciones de ablación
export const ablationConfigurations = sqliteTable('ablation_configurations', {
  id: text('id').primaryKey(),                       // 'A'..'F'
  name: text('name').notNull(),
  description: text('description'),
  clarifierEnabled: integer('clarifier_enabled').default(1),
  bibliotecarioEnabled: integer('bibliotecario_enabled').default(1),
  analistaEnabled: integer('analista_enabled').default(1),
  plannerEnabled: integer('planner_enabled').default(1),
  selectorEnabled: integer('selector_enabled').default(1),
  imagesEnabled: integer('images_enabled').default(1),
  imageValidatorEnabled: integer('image_validator_enabled').default(1),
  enrichmentsEnabled: integer('enrichments_enabled').default(1),
  ragEnabled: integer('rag_enabled').default(1),             // 0 = Config F (LLM base sin RAG)
  isBaseline: integer('is_baseline').default(0),             // 1 = Config A (techo) o F (piso)
  displayOrder: integer('display_order').default(0),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// 13. Ejecuciones — núcleo del experimento (una fila por pregunta × config × batch)
export const ablationRuns = sqliteTable('ablation_runs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  questionId: text('question_id').notNull().references(() => ablationQuestions.id),
  configId: text('config_id').notNull().references(() => ablationConfigurations.id),
  sessionId: text('session_id').references(() => chatSessions.id),  // sesión real creada por el runner

  runBatch: text('run_batch').notNull(),                           // 'pilot_2025_04_09' | 'full_2025_04_15'
  runIndex: integer('run_index').notNull(),
  status: text('status').default('pending'),                     // 'pending' | 'running' | 'done' | 'error'

  // Output Clarificador (Agente 0)
  enrichedQuery: text('enriched_query'),
  detectedIntent: text('detected_intent'),

  // Output Bibliotecario (Agente 1)
  chunksRetrieved: integer('chunks_retrieved').default(0),
  imagesRetrieved: integer('images_retrieved').default(0),
  imagesShown: integer('images_shown').default(0),
  enrichmentsUsed: integer('enrichments_used').default(0),

  // Output Analista (Agente 2)
  detectedUrgency: text('detected_urgency'),
  responseMode: text('response_mode'),

  // Latencias (ms)
  phase1Ms: integer('phase1_ms'),
  phase2Ms: integer('phase2_ms'),
  phase3Ms: integer('phase3_ms'),
  totalMs: integer('total_ms'),

  // Costos
  costUsd: real('cost_usd').default(0),
  phase2Tokens: integer('phase2_tokens'),
  phase3InputTokens: integer('phase3_input_tokens'),
  phase3OutputTokens: integer('phase3_output_tokens'),

  // Respuesta final
  responseText: text('response_text'),
  errorMessage: text('error_message'),

  // Métricas de Loop & Gap Engine (Agregadas)
  loopCount: integer('loop_count'),
  plannerQueries: text('planner_queries'),         // JSON Array
  selectorKept: integer('selector_kept'),
  redundantChunksAvoided: integer('redundant_chunks_avoided'),
  gapTypesSeen: text('gap_types_seen'),          // JSON Array
  loopStoppedReason: text('loop_stopped_reason'),      // 'resolved', 'max_loops', etc.
  gapResolved: real('gap_resolved'),
  finalConfidence: real('final_confidence').default(0),

  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  uniqueRunPerBatch: index('unique_run_per_batch').on(table.questionId, table.configId, table.runBatch),
  idxRunsConfig: index('idx_runs_config').on(table.configId),
  idxRunsQuestion: index('idx_runs_question').on(table.questionId),
  idxRunsSession: index('idx_runs_session').on(table.sessionId),
  idxRunsStatus: index('idx_runs_status').on(table.status),
  idxRunsBatch: index('idx_runs_batch').on(table.runBatch),
}));

// 14. Scores del juez LLM (GPT-4o, temperature = 0)
export const ablationScores = sqliteTable('ablation_scores', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  runId: text('run_id').notNull().unique().references(() => ablationRuns.id),
  scoreCorrectness: real('score_correctness').notNull(),           // peso 30 %
  scoreCompleteness: real('score_completeness').notNull(),          // peso 20 %
  scoreRelevance: real('score_relevance').notNull(),             // peso 20 %
  scoreClarity: real('score_clarity').notNull(),               // peso 15 %
  scoreAblationImpact: real('score_ablation_impact').notNull(),       // peso 15 %
  scoreTotal: real('score_total').notNull(),                 // promedio ponderado (0.0 – 2.0)

  // Rúbrica Dual
  scoreFactual: real('score_factual'),
  scoreDiagnostic: real('score_diagnostic'),
  factualErrors: text('factual_errors'),      // JSON array
  diagnosticValue: text('diagnostic_value'),    // Texto explicativo

  judgeReasoning: text('judge_reasoning'),
  judgeModel: text('judge_model').default('gpt-4o'),
  judgeTokensUsed: integer('judge_tokens_used'),
  judgeCostUsd: real('judge_cost_usd'),

  // Métricas de IR y Seguridad
  safeDecisionRate: integer('safe_decision_rate').default(0), // 1 si fue seguro o preguntó
  recallAt3: real('recall_at_3'),
  mrr: real('mrr'),

  evaluatedAt: integer('evaluated_at').default(sql`(unixepoch())`),
}, (table) => ({
  idxScoresTotal: index('idx_scores_total').on(table.scoreTotal),
}));

// 15. Chunks usados por ejecución (trazabilidad RAG completa)
//     chunk_id es FK lógica a document_chunks de producción
export const ablationRunChunks = sqliteTable('ablation_run_chunks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  runId: text('run_id').notNull().references(() => ablationRuns.id),
  chunkId: text('chunk_id').notNull(),                               // FK lógica a document_chunks.id
  source: text('source').notNull(),                                 // 'manual' | 'enrichment' | 'image'
  distance: real('distance'),
  chunkType: text('chunk_type'),
  position: integer('position'),
}, (table) => ({
  idxChunksRun: index('idx_ablation_chunks_run').on(table.runId),
}));

// 16. Resultados agregados — alimenta la vista /resultados
export const ablationSummary = sqliteTable('ablation_summary', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  runBatch: text('run_batch').notNull(),
  configId: text('config_id').notNull().references(() => ablationConfigurations.id),
  questionCategory: text('question_category').notNull(),         // 'all' | categoría específica
  avgScoreTotal: real('avg_score_total'),
  avgScoreCorrectness: real('avg_score_correctness'),
  avgScoreCompleteness: real('avg_score_completeness'),
  avgScoreRelevance: real('avg_score_relevance'),
  avgScoreClarity: real('avg_score_clarity'),
  avgScoreAblationImpact: real('avg_score_ablation_impact'),

  // Rúbrica Dual (Promedios)
  avgScoreFactual: real('avg_score_factual'),
  avgScoreDiagnostic: real('avg_score_diagnostic'),

  avgPhase1Ms: real('avg_phase1_ms'),
  avgTotalMs: real('avg_total_ms'),
  avgCostUsd: real('avg_cost_usd'),
  avgLoopCount: real('avg_loop_count'),

  // Promedios de Seguridad
  avgSdr: real('avg_sdr'),
  avgGapResolved: real('avg_gap_resolved'),
  avgRecallAt3: real('avg_recall_at_3'),
  avgMrr: real('avg_mrr'),
  avgFinalConfidence: real('avg_final_confidence'),

  nRuns: integer('n_runs'),
  computedAt: integer('computed_at').default(sql`(unixepoch())`),
}, (table) => ({
  uniqueSummaryBatch: index('unique_summary_batch').on(table.runBatch, table.configId, table.questionCategory),
}));

// ─── Ablation Multi-turn Scenarios ───────────────────────────────────────────

// 17. ESCENARIO: el guión completo de una sesión multi-turno
export const ablationScenarios = sqliteTable('ablation_scenarios', {
  id: text('id').primaryKey(),       // 'SC01'..'SC10'
  title: text('title').notNull(),
  description: text('description'),
  category: text('category').notNull(),     // 'diagnostico_tecnico' | 'ambigua' | ...
  equipmentModel: text('equipment_model'),       // '3300' | '5500' | 'general'
  difficulty: text('difficulty').default('medium'),
  maxTurns: integer('max_turns').default(5),
  resolutionCriteria: text('resolution_criteria').notNull(),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
});

// 18. TURNOS DEL ESCENARIO: el script fijo del técnico
export const ablationScenarioTurns = sqliteTable('ablation_scenario_turns', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull().references(() => ablationScenarios.id),
  turnNumber: integer('turn_number').notNull(),
  technicianMessage: text('technician_message').notNull(),
  turnIntent: text('turn_intent'),
  expectedBehavior: text('expected_behavior'),
  isAmbiguous: integer('is_ambiguous').default(0),
  introducesNewData: integer('introduces_new_data').default(0),
}, (table) => ({
  uniqueTurn: uniqueIndex('idx_scen_turns_unique').on(table.scenarioId, table.turnNumber),
}));

// 19. EJECUCIÓN DE ESCENARIO: una corrida completa de un escenario
export const ablationScenarioRuns = sqliteTable('ablation_scenario_runs', {
  id: text('id').primaryKey(),
  scenarioId: text('scenario_id').notNull().references(() => ablationScenarios.id),
  configId: text('config_id').notNull().references(() => ablationConfigurations.id),
  sessionId: text('session_id').references(() => chatSessions.id),
  runBatch: text('run_batch').notNull(),
  status: text('status').default('pending'),

  turnsCompleted: integer('turns_completed').default(0),
  turnsPlanned: integer('turns_planned').notNull(),
  resolutionReached: integer('resolution_reached').default(0),
  turnsToResolution: integer('turns_to_resolution'),

  contextReuseRate: real('context_reuse_rate'),
  unnecessaryClarifications: integer('unnecessary_clarifications').default(0),

  totalCostUsd: real('total_cost_usd').default(0),
  totalTokens: integer('total_tokens').default(0),
  totalLatencyMs: integer('total_latency_ms').default(0),
  totalLoopsFired: integer('total_loops_fired').default(0),
  avgConfidenceSession: real('avg_confidence_session'),

  errorMessage: text('error_message'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  uniqueRun: uniqueIndex('idx_scen_runs_unique').on(table.scenarioId, table.configId, table.runBatch),
  idxScenRunsConfig: index('idx_scen_runs_config').on(table.configId),
  idxScenRunsScenario: index('idx_scen_runs_scenario').on(table.scenarioId),
  idxScenRunsSession: index('idx_scen_runs_session').on(table.sessionId),
  idxScenRunsStatus: index('idx_scen_runs_status').on(table.status),
}));

// 20. TURNOS EJECUTADOS: respuesta del sistema por cada turno
export const ablationScenarioTurnResults = sqliteTable('ablation_scenario_turn_results', {
  id: text('id').primaryKey(),
  scenarioRunId: text('scenario_run_id').notNull().references(() => ablationScenarioRuns.id),
  scenarioTurnId: text('scenario_turn_id').notNull().references(() => ablationScenarioTurns.id),
  turnNumber: integer('turn_number').notNull(),
  messageId: text('message_id').references(() => chatMessages.id),

  systemResponse: text('system_response'),
  responseMode: text('response_mode'),
  detectedIntent: text('detected_intent'),
  turnScore: real('turn_score'),
  confidence: real('confidence'),
  createdAt: integer('created_at').default(sql`(unixepoch())`),
}, (table) => ({
  idxScenTurnResultsRun: index('idx_scen_turn_results_run').on(table.scenarioRunId),
}));

// 21. SCORES DE ESCENARIO: el juez evalúa la sesión completa
export const ablationScenarioScores = sqliteTable('ablation_scenario_scores', {
  id: text('id').primaryKey(),
  scenarioRunId: text('scenario_run_id').notNull().unique().references(() => ablationScenarioRuns.id),

  scoreDiagnosticProgression: real('score_diagnostic_progression').notNull(),
  scoreFactualConsistency: real('score_factual_consistency').notNull(),
  scoreHypothesisRefinement: real('score_hypothesis_refinement').notNull(),
  scoreTechnicianEffort: real('score_technician_effort').notNull(),
  scoreTotal: real('score_total').notNull(),

  resolutionReached: integer('resolution_reached'),
  criticalErrorMade: integer('critical_error_made'),
  contradictedItself: integer('contradicted_itself'),
  repeatedQuestion: integer('repeated_question'),

  judgeNarrative: text('judge_narrative'),
  judgeModel: text('judge_model').default('gpt-4o'),
  judgeTokensUsed: integer('judge_tokens_used'),
  judgeCostUsd: real('judge_cost_usd'),
  evaluatedAt: integer('evaluated_at').default(sql`(unixepoch())`),
}, (table) => ({
  idxScenScoresTotal: index('idx_scen_scores_total').on(table.scoreTotal),
}));

// 22. RESUMEN DE ESCENARIOS: equivalente a ablation_summary
export const ablationScenarioSummary = sqliteTable('ablation_scenario_summary', {
  id: text('id').primaryKey(),
  configId: text('config_id').notNull().references(() => ablationConfigurations.id),
  scenarioCategory: text('scenario_category').notNull(),
  avgScoreTotal: real('avg_score_total'),
  avgScoreDiagnosticProg: real('avg_score_diagnostic_prog'),
  avgScoreFactualConsistency: real('avg_score_factual_consistency'),
  avgScoreHypothesisRef: real('avg_score_hypothesis_ref'),
  avgScoreTechnicianEffort: real('avg_score_technician_effort'),
  pctResolutionReached: real('pct_resolution_reached'),
  avgTurnsToResolution: real('avg_turns_to_resolution'),
  avgSessionLatencyMs: real('avg_session_latency_ms'),
  avgSessionCostUsd: real('avg_session_cost_usd'),
  nRuns: integer('n_runs'),
  computedAt: integer('computed_at').default(sql`(unixepoch())`),
}, (table) => ({
  uniqueScenSummary: uniqueIndex('idx_scen_summary_unique').on(table.configId, table.scenarioCategory),
}));

// ─── Judge Mode (Independent Evaluation) ─────────────────────────────────────

// 23. Perfiles de Juez
export const judgeProfiles = sqliteTable('judge_profiles', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    fullName: text('full_name').notNull(),
    company: text('company'),
    yearsExperience: integer('years_experience'),
    modelsWorked: text('models_worked'),                   // JSON: '["3300","5500","6200"]'
    primaryRole: text('primary_role'),                    // "tecnico_campo" | "supervisor" | "jefe_taller"
    phone: text('phone'),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxJudgeProfilesName: index('idx_judge_profiles_name').on(table.fullName),
}));

// 24. Casos creados por el Juez
export const judgeCases = sqliteTable('judge_cases', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    judgeProfileId: text('judge_profile_id').notNull().references(() => judgeProfiles.id, { onDelete: 'cascade' }),
    
    caseNumber: integer('case_number').notNull(),         // 1, 2, 3, 4, 5 (auto-asignado)
    title: text('title').notNull(),
    equipmentModel: text('equipment_model'),
    
    caseDescription: text('case_description').notNull(),
    realExperience: text('real_experience').notNull(),
    actualOutcome: text('actual_outcome'),
    
    maxMessages: integer('max_messages').notNull().default(10),
    messagesUsed: integer('messages_used').notNull().default(0),
    
    status: text('status').notNull().default('draft'),    // 'draft' | 'in_progress' | 'completed' | 'abandoned'
    
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    completedAt: text('completed_at'),
  };
}, (table) => ({
  idxJudgeCasesProfile: index('idx_judge_cases_profile').on(table.judgeProfileId),
  idxJudgeCasesStatus: index('idx_judge_cases_status').on(table.status),
  uniqueCaseNumber: uniqueIndex('idx_judge_cases_unique_number').on(table.judgeProfileId, table.caseNumber),
}));

// 25. Sesiones de chat en modo jurado
export const judgeSessions = sqliteTable('judge_sessions', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    judgeProfileId: text('judge_profile_id').notNull().references(() => judgeProfiles.id, { onDelete: 'cascade' }),
    judgeCaseId: text('judge_case_id').notNull().references(() => judgeCases.id, { onDelete: 'cascade' }),
    
    equipmentModel: text('equipment_model'),
    
    messageCount: integer('message_count').default(0),
    totalTokens: integer('total_tokens').default(0),
    totalCostUsd: real('total_cost_usd').default(0),
    
    loopsUsed: integer('loops_used').default(0),
    phase1Ms: integer('phase1_ms').default(0),
    phase2Ms: integer('phase2_ms').default(0),
    phase3Ms: integer('phase3_ms').default(0),
    finalConfidence: real('final_confidence').default(0),
    stoppedReason: text('stopped_reason'),
    
    status: text('status').default('active'),             // 'active' | 'ended'
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
    endedAt: text('ended_at'),
  };
}, (table) => ({
  idxJudgeSessionsProfile: index('idx_judge_sessions_profile').on(table.judgeProfileId),
  idxJudgeSessionsCase: index('idx_judge_sessions_case').on(table.judgeCaseId),
}));

// 26. Mensajes del chat jurado
export const judgeMessages = sqliteTable('judge_messages', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    sessionId: text('session_id').notNull().references(() => judgeSessions.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),                          // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxJudgeMessagesSession: index('idx_judge_messages_session').on(table.sessionId),
}));

// 27. Evaluación post-sesión
export const judgeEvaluations = sqliteTable('judge_evaluations', (table) => {
  return {
    id: text('id').primaryKey().$defaultFn(() => createId()),
    judgeCaseId: text('judge_case_id').notNull().unique().references(() => judgeCases.id, { onDelete: 'cascade' }),
    judgeSessionId: text('judge_session_id').notNull().references(() => judgeSessions.id, { onDelete: 'cascade' }),
    judgeProfileId: text('judge_profile_id').notNull().references(() => judgeProfiles.id, { onDelete: 'cascade' }),
    
    q1Resolved: text('q1_resolved'),                      // 'si' | 'no' | 'parcialmente'
    q2Helpful: integer('q2_helpful'),                     // 1-5
    q3WouldUse: integer('q3_would_use'),                   // 1-5
    q4WouldRecommend: integer('q4_would_recommend'),       // 1-5
    q5Clarity: integer('q5_clarity'),                     // 1-5
    q6TimeSave: integer('q6_time_save'),                   // 1-5
    
    missingInfo: text('missing_info'),
    
    loopCount: integer('loop_count'),
    totalMs: integer('total_ms'),
    finalConfidence: real('final_confidence'),
    stoppedReason: text('stopped_reason'),
    
    createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  };
}, (table) => ({
  idxJudgeEvalCase: index('idx_judge_eval_case').on(table.judgeCaseId),
}));

/* ── Tipos inferidos (útiles para el resto de la app) ──────────────────── */

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type ExtractedImage = typeof extractedImages.$inferSelect;
export type NewExtractedImage = typeof extractedImages.$inferInsert;
export type RagQuery = typeof ragQueries.$inferSelect;
export type NewRagQuery = typeof ragQueries.$inferInsert;
export type AgentLog = typeof agentLogs.$inferSelect;
export type NewAgentLog = typeof agentLogs.$inferInsert;
export type Enrichment = typeof enrichments.$inferSelect;
export type NewEnrichment = typeof enrichments.$inferInsert;
export type IndexingMetric = typeof indexingMetrics.$inferSelect;
export type NewIndexingMetric = typeof indexingMetrics.$inferInsert;

// Chat pipeline
export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;

// Ablation study
export type AblationQuestion = typeof ablationQuestions.$inferSelect;
export type NewAblationQuestion = typeof ablationQuestions.$inferInsert;
export type AblationConfiguration = typeof ablationConfigurations.$inferSelect;
export type NewAblationConfiguration = typeof ablationConfigurations.$inferInsert;
export type AblationRun = typeof ablationRuns.$inferSelect;
export type NewAblationRun = typeof ablationRuns.$inferInsert;
export type AblationScore = typeof ablationScores.$inferSelect;
export type NewAblationScore = typeof ablationScores.$inferInsert;
export type AblationRunChunk = typeof ablationRunChunks.$inferSelect;
export type NewAblationRunChunk = typeof ablationRunChunks.$inferInsert;
export type AblationSummaryRow = typeof ablationSummary.$inferSelect;
export type NewAblationSummaryRow = typeof ablationSummary.$inferInsert;

// Ablation scenarios
export type AblationScenario = typeof ablationScenarios.$inferSelect;
export type NewAblationScenario = typeof ablationScenarios.$inferInsert;
export type AblationScenarioTurn = typeof ablationScenarioTurns.$inferSelect;
export type NewAblationScenarioTurn = typeof ablationScenarioTurns.$inferInsert;
export type AblationScenarioRun = typeof ablationScenarioRuns.$inferSelect;
export type NewAblationScenarioRun = typeof ablationScenarioRuns.$inferInsert;
export type AblationScenarioTurnResult = typeof ablationScenarioTurnResults.$inferSelect;
export type NewAblationScenarioTurnResult = typeof ablationScenarioTurnResults.$inferInsert;
export type AblationScenarioScore = typeof ablationScenarioScores.$inferSelect;
export type NewAblationScenarioScore = typeof ablationScenarioScores.$inferInsert;
export type AblationScenarioSummaryRow = typeof ablationScenarioSummary.$inferSelect;
export type NewAblationScenarioSummaryRow = typeof ablationScenarioSummary.$inferInsert;

// Judge Mode
export type JudgeProfile = typeof judgeProfiles.$inferSelect;
export type NewJudgeProfile = typeof judgeProfiles.$inferInsert;
export type JudgeCase = typeof judgeCases.$inferSelect;
export type NewJudgeCase = typeof judgeCases.$inferInsert;
export type JudgeSession = typeof judgeSessions.$inferSelect;
export type NewJudgeSession = typeof judgeSessions.$inferInsert;
export type JudgeMessage = typeof judgeMessages.$inferSelect;
export type NewJudgeMessage = typeof judgeMessages.$inferInsert;
export type JudgeEvaluation = typeof judgeEvaluations.$inferSelect;
export type NewJudgeEvaluation = typeof judgeEvaluations.$inferInsert;

/** Subconjunto seguro para exponer en la API (sin campos internos de BD). */
export interface AgentLogSummary {
  id: string;
  agentName: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  inputSummary: string | null;
  outputSummary: string | null;
  errorMessage: string | null;
}

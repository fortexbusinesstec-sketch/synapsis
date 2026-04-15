/**
 * GET /api/ablation/indexing-metrics
 * Devuelve métricas agregadas del pipeline de indexación (Enjambre A)
 * basadas en indexing_metrics + documents.
 */
import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

export async function GET() {
  const [aggRes, docsRes, tokenPhaseRes] = await Promise.all([
    // Aggregados globales
    client.execute(`
      SELECT
        COUNT(m.id)                           AS n_docs,
        ROUND(AVG(m.total_chunks), 1)         AS avg_chunks,
        ROUND(AVG(m.hitl_images), 1)          AS avg_hitl_images,
        ROUND(AVG(m.agent_mismatch_count), 2) AS avg_mismatch,
        ROUND(AVG(m.detected_gaps), 1)        AS avg_detected_gaps,
        ROUND(AVG(m.inherited_l1), 1)         AS avg_l1,
        ROUND(AVG(m.inherited_l2), 1)         AS avg_l2,
        ROUND(AVG(m.inherited_l3), 1)         AS avg_l3,
        ROUND(AVG(m.total_input_tokens), 0)   AS avg_input_tokens,
        ROUND(AVG(m.total_output_tokens), 0)  AS avg_output_tokens,
        ROUND(AVG(m.processing_time_ms), 0)   AS avg_processing_ms,
        MAX(m.processing_time_ms)             AS max_processing_ms,
        MIN(m.processing_time_ms)             AS min_processing_ms,
        ROUND(AVG(d.page_count), 1)           AS avg_pages,
        ROUND(AVG(d.total_cost), 5)           AS avg_total_cost,
        ROUND(AVG(d.cost_orchestrator), 5)    AS avg_cost_orchestrator,
        ROUND(AVG(d.cost_ocr), 5)             AS avg_cost_ocr,
        ROUND(AVG(d.cost_vision), 5)          AS avg_cost_vision,
        ROUND(AVG(d.cost_chunker), 5)         AS avg_cost_chunker,
        ROUND(AVG(d.cost_embedder), 5)        AS avg_cost_embedder,
        SUM(d.total_cost)                     AS total_cost_all,
        SUM(d.cost_ocr)                       AS total_cost_ocr,
        SUM(d.cost_vision)                    AS total_cost_vision,
        SUM(d.cost_chunker)                   AS total_cost_chunker,
        SUM(d.cost_orchestrator)              AS total_cost_orchestrator,
        SUM(d.cost_embedder)                  AS total_cost_embedder
      FROM indexing_metrics m
      JOIN documents d ON m.document_id = d.id
      WHERE d.status = 'ready'
    `),

    // Por documento — para scatter/distribución
    client.execute(`
      SELECT
        d.id              AS doc_id,
        d.title,
        d.page_count,
        d.equipment_model,
        d.doc_type,
        d.total_cost,
        d.cost_orchestrator,
        d.cost_ocr,
        d.cost_vision,
        d.cost_chunker,
        d.cost_embedder,
        m.total_chunks,
        m.hitl_images,
        m.agent_mismatch_count,
        m.detected_gaps,
        m.inherited_l1,
        m.inherited_l2,
        m.inherited_l3,
        m.total_input_tokens,
        m.total_output_tokens,
        m.processing_time_ms
      FROM indexing_metrics m
      JOIN documents d ON m.document_id = d.id
      WHERE d.status = 'ready'
      ORDER BY m.created_at DESC
      LIMIT 60
    `),

    // Tokens por fase (usando agent_logs agrupados)
    client.execute(`
      SELECT
        agent_name,
        COUNT(*)                                   AS n_calls,
        ROUND(AVG(input_tokens), 0)                AS avg_input,
        ROUND(AVG(output_tokens), 0)               AS avg_output,
        ROUND(AVG(duration_ms), 0)                 AS avg_duration_ms,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM agent_logs
      WHERE agent_name IN (
        'orchestrator','ocr','vision','diagram-reasoner',
        'chunker','embedder','vector-scanner','curious',
        'clarifier','planner','bibliotecario','selector','analista','verifier'
      )
      GROUP BY agent_name
      ORDER BY avg_input DESC
    `),
  ]);

  const agg       = aggRes.rows[0]     ?? {};
  const docs      = docsRes.rows       ?? [];
  const agentLogs = tokenPhaseRes.rows ?? [];

  return NextResponse.json({ agg, docs, agentLogs });
}

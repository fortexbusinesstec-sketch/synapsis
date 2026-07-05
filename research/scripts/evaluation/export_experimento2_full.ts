#!/usr/bin/env tsx
/**
 * Exporta el Experimento 2 (Benchmarking single-turn) desde Turso a JSON.
 *
 * 100 preguntas × 4 configs (B, D, BM25+BERT, GOMS) = 400 runs.
 * 
 * Uso:
 *   npx tsx research/scripts/evaluation/export_experimento2_full.ts
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const l of readFileSync(envPath, 'utf8').split('\n')) {
    const t = l.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const DB_URL = process.env.TURSO_URL_TESIS || '';
const DB_TOKEN = process.env.TURSO_TOKEN_TESIS || '';
if (!DB_URL || !DB_TOKEN) { console.error('Missing env'); process.exit(1); }

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

interface Row { [k: string]: unknown }

async function main() {
  const start = Date.now();

  // ── Configs ────────────────────────────────────────────────────────────
  const cfgR = await db.execute(
    `SELECT id, name, description FROM ablation_configurations WHERE id IN ('B','D','config_bm25_bert','config_goms')`
  );
  const configs: Record<string, Row> = {};
  for (const r of cfgR.rows) configs[r.id as string] = r as Row;

  // ── Preguntas ──────────────────────────────────────────────────────────
  const qR = await db.execute(
    `SELECT id, category, category_number, question_text, difficulty, equipment_model
     FROM ablation_questions WHERE is_active = 1 ORDER BY id`
  );
  const catR = await db.execute(
    `SELECT category, COUNT(*) as count FROM ablation_questions WHERE is_active = 1 GROUP BY category`
  );
  const cats: Record<string, Row> = {};
  for (const r of catR.rows) cats[r.category as string] = r as Row;

  // ── Todas las runs + scores ────────────────────────────────────────────
  const dataR = await db.execute(`
    SELECT ar.id as run_id, ar.question_id, ar.config_id,
      ar.total_ms, ar.cost_usd, ar.loop_count, ar.status,
      ar.phase1_ms, ar.phase2_ms, ar.phase3_ms,
      ar.chunks_retrieved, ar.images_retrieved, ar.enrichments_used,
      ar.final_confidence, ar.gap_resolved, ar.loop_stopped_reason,
      ar.selector_kept, ar.redundant_chunks_avoided,
      ar.response_text,
      s.score_total, s.score_factual, s.score_diagnostic,
      s.score_correctness, s.score_completeness, s.score_relevance,
      s.score_clarity, s.score_ablation_impact,
      s.safe_decision_rate, s.factual_errors, s.judge_reasoning,
      s.recall_at_3, s.mrr,
      s.judge_tokens_used, s.judge_cost_usd
    FROM ablation_runs ar
    LEFT JOIN ablation_scores s ON s.run_id = ar.id
    WHERE ar.run_batch = 'piloto_01'
      AND ar.status = 'done'
      AND ar.config_id IN ('B','D','config_bm25_bert','config_goms')
    ORDER BY ar.config_id, ar.question_id
  `);
  const runs = dataR.rows as Row[];
  console.log(`Runs extraídas: ${runs.length}`);

  // ── Indexar ────────────────────────────────────────────────────────────
  const byConfig: Record<string, Row[]> = {};
  const byQuestion: Record<string, Row[]> = {};
  for (const r of runs) {
    const cfg = r.config_id as string;
    if (!byConfig[cfg]) byConfig[cfg] = [];
    byConfig[cfg].push(r);
    const qid = r.question_id as string;
    if (!byQuestion[qid]) byQuestion[qid] = [];
    byQuestion[qid].push(r);
  }

  // ── Helper: mean + sd from SQL aggregate query ─────────────────────────
  async function sqlAgg(configId: string) {
    const r = await db.execute({
      sql: `SELECT
        COUNT(*) AS n,
        ROUND(AVG(s.score_total), 4) AS avg_total,
        ROUND(AVG(s.score_total*s.score_total) - AVG(s.score_total)*AVG(s.score_total), 6) AS var_total,
        ROUND(AVG(s.score_factual), 4) AS avg_factual,
        ROUND(AVG(s.score_factual*s.score_factual) - AVG(s.score_factual)*AVG(s.score_factual), 6) AS var_factual,
        ROUND(AVG(s.score_diagnostic), 4) AS avg_diag,
        ROUND(AVG(s.score_diagnostic*s.score_diagnostic) - AVG(s.score_diagnostic)*AVG(s.score_diagnostic), 6) AS var_diag,
        ROUND(SUM(CASE WHEN s.score_total > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS useful_rate,
        ROUND(SUM(s.safe_decision_rate) * 100.0 / COUNT(*), 1) AS sdr,
        ROUND(AVG(ar.total_ms), 0) AS avg_latency,
        ROUND(AVG(ar.total_ms*ar.total_ms) - AVG(ar.total_ms)*AVG(ar.total_ms), 0) AS var_latency,
        ROUND(AVG(ar.cost_usd), 6) AS avg_cost,
        ROUND(AVG(ar.cost_usd*ar.cost_usd) - AVG(ar.cost_usd)*AVG(ar.cost_usd), 10) AS var_cost
      FROM ablation_scores s
      JOIN ablation_runs ar ON s.run_id = ar.id
      WHERE ar.run_batch = 'piloto_01' AND ar.status = 'done'
        AND ar.config_id = ?
      `,
      args: [configId],
    });
    return r.rows[0] as Row;
  }

  async function sqlCatAgg(configId: string, category: string) {
    const r = await db.execute({
      sql: `SELECT
        COUNT(*) AS n,
        ROUND(AVG(s.score_total), 4) AS avg_total,
        ROUND(AVG(s.score_total*s.score_total) - AVG(s.score_total)*AVG(s.score_total), 6) AS var_total,
        ROUND(AVG(s.score_factual), 4) AS avg_factual,
        ROUND(AVG(s.score_diagnostic), 4) AS avg_diag,
        ROUND(SUM(CASE WHEN s.score_total > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS useful_rate,
        ROUND(SUM(s.safe_decision_rate) * 100.0 / COUNT(*), 1) AS sdr,
        ROUND(AVG(ar.total_ms), 0) AS avg_latency,
        ROUND(AVG(ar.total_ms*ar.total_ms) - AVG(ar.total_ms)*AVG(ar.total_ms), 0) AS var_latency
      FROM ablation_scores s
      JOIN ablation_runs ar ON s.run_id = ar.id
      JOIN ablation_questions q ON ar.question_id = q.id
      WHERE ar.run_batch = 'piloto_01' AND ar.status = 'done'
        AND ar.config_id = ? AND q.category = ?
      `,
      args: [configId, category],
    });
    return r.rows[0] as Row;
  }

  // ── Resultados por configuración ──────────────────────────────────────
  const LABELS: Record<string, string> = {
    B: 'Sin Planificador',
    D: 'Solo RAG + LLM base',
    config_bm25_bert: 'Baseline Léxico/Denso (BM25+BERT)',
    config_goms: 'Baseline Operativo (Humano simulado)',
  };

  const resultados: Row[] = [];
  for (const cfgId of ['B', 'D', 'config_bm25_bert', 'config_goms']) {
    const agg = await sqlAgg(cfgId);

    // Desglose por categoría
    const catBD: Row[] = [];
    for (const cat of Object.keys(cats)) {
      const ca = await sqlCatAgg(cfgId, cat);
      if (Number(ca.n) > 0) {
        const sd_total = Math.sqrt(Math.max(0, Number(ca.var_total) || 0));
        const sd_lat = Math.sqrt(Math.max(0, Number(ca.var_latency) || 0));
        catBD.push({
          categoria: cat,
          n: ca.n,
          score_total: { mean: Number(ca.avg_total), sd: Number(sd_total.toFixed(4)) },
          factual: { mean: Number(ca.avg_factual), sd: 0 },
          diagnostic: { mean: Number(ca.avg_diag), sd: 0 },
          useful_rate: ca.useful_rate,
          sdr: ca.sdr,
          latency_s: { mean: Number((Number(ca.avg_latency) / 1000).toFixed(1)), sd: Number((sd_lat / 1000).toFixed(1)) },
        });
      }
    }

    // Per-run cost efficiency
    const arr = byConfig[cfgId] || [];
    let avgCE = 0;
    if (arr.length > 0) {
      const ceArr = arr.map(r => {
        const c = Number(r.cost_usd) || 0;
        return c > 0 ? (Number(r.score_total) || 0) / c : 0;
      });
      avgCE = ceArr.reduce((a, b) => a + b, 0) / ceArr.length;
    }

    const n = Number(agg.n);
    const sd_total = Math.sqrt(Math.max(0, Number(agg.var_total) || 0));
    const sd_factual = Math.sqrt(Math.max(0, Number(agg.var_factual) || 0));
    const sd_diag = Math.sqrt(Math.max(0, Number(agg.var_diag) || 0));
    const sd_lat = Math.sqrt(Math.max(0, Number(agg.var_latency) || 0));
    const sd_cost = Math.sqrt(Math.max(0, Number(agg.var_cost) || 0));

    resultados.push({
      config_id: cfgId,
      nombre: LABELS[cfgId] || cfgId,
      pipeline: cfgId === 'config_bm25_bert' ? 'bm25_bert' : cfgId === 'config_goms' ? 'goms' : 'synapsis',
      n,
      scores: {
        score_total: { mean: Number(agg.avg_total), sd: Number(sd_total.toFixed(4)) },
        factual: { mean: Number(agg.avg_factual), sd: Number(sd_factual.toFixed(4)) },
        diagnostic: { mean: Number(agg.avg_diag), sd: Number(sd_diag.toFixed(4)) },
      },
      flags: {
        useful_rate: Number(agg.useful_rate),
        safe_decision_rate: Number(agg.sdr),
        zero_score_rate: Number((100 - Number(agg.useful_rate)).toFixed(1)),
      },
      eficiencia: {
        latency_ms: { mean: Number(agg.avg_latency), sd: Number(sd_lat.toFixed(0)) },
        latency_s: { mean: Number((Number(agg.avg_latency) / 1000).toFixed(1)), sd: Number((sd_lat / 1000).toFixed(1)) },
        cost_usd: { mean: Number(agg.avg_cost), sd: Number(sd_cost.toFixed(8)) },
        cost_efficiency: Number(avgCE.toFixed(1)),
      },
      desglose_por_categoria: catBD,
    });
  }

  // ── Output ────────────────────────────────────────────────────────────
  const output = {
    experimento: {
      id: 'exp2_benchmarking_singleturn',
      descripcion: 'Benchmarking single-turn: 100 preguntas individuales × 4 configuraciones (B, D, BM25+BERT, GOMS). Score_total = (factual × 0.5 + diagnostic × 0.5). GOMS usa rúbrica de 5 dimensiones (score_correctness, completeness, relevance, clarity, ablation_impact) con escala 0–1.',
      fecha_extraccion: new Date().toISOString(),
      total_preguntas: qR.rows.length,
      total_configs: 4,
      total_runs: runs.length,
      configuraciones: configs,
      categorias: cats,
      nota_score_goms: 'GOMS no tiene score_factual ni score_diagnostic. Su score_total = score_correctness×0.30 + completeness×0.20 + relevance×0.20 + clarity×0.15 + ablation_impact×0.15 (escala 0–1). Para B/D/BM25 se usa la rúbrica dual (0–2).',
    },
    preguntas: qR.rows.map((q: Row) => ({
      id: q.id,
      category: q.category,
      category_number: q.category_number,
      question_text: q.question_text,
      difficulty: q.difficulty,
      equipment_model: q.equipment_model,
    })),
    resultados_por_config: resultados,
  };

  const path = resolve(process.cwd(), 'research/experimento2_resultados.json');
  writeFileSync(path, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const sizeKB = (Buffer.byteLength(JSON.stringify(output), 'utf-8') / 1024).toFixed(0);
  console.log(`✅ Exportado en ${elapsed}s → experimento2_resultados.json (${sizeKB} KB)`);
  console.log(`   Preguntas: ${qR.rows.length}, Runs: ${runs.length}`);
  console.log('');
  console.log('📊 Resumen final:');
  for (const r of resultados) {
    const c = (r.config_id as string).padEnd(18).slice(0, 18);
    const s = r.scores as Row;
    const f = r.flags as Row;
    const e = r.eficiencia as Row;
    const cs = e.cost_usd as Row;
    console.log(`${c} | n=${String(r.n).padEnd(3)} score=${(s.score_total as Row).mean}±${(s.score_total as Row).sd} factual=${(s.factual as Row).mean} diag=${(s.diagnostic as Row).mean} useful=${f.useful_rate}% sdr=${f.safe_decision_rate}% lat=${(e.latency_s as Row).mean}s cost=$${cs.mean} eff=${e.cost_efficiency}`);
  }
}

main().catch(console.error);

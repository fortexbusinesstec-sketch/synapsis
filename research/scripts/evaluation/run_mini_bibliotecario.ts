#!/usr/bin/env tsx
/**
 * Evaluación del MiniBibliotecario contra las 100 preguntas del experimento 2.
 *
 * Para cada pregunta:
 *   1. Ejecuta MiniBibliotecario (recupera top-10 fragmentos)
 *   2. Anota is_relevant comparando cada fragmento con el ground_truth
 *      (vía similitud coseno entre embeddings)
 *   3. Calcula métricas: Precision@k, Recall@k, MRR, F1@k
 *
 * Output:
 *   research/evaluations/mini_bibliotecario_resultados.json
 *   research/evaluations/mini_bibliotecario_metricas.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

/* ── Cargar .env ANTES de cualquier import dinámico que necesite API keys ── */
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

import { pipeline } from '@xenova/transformers';
import type { MiniChunk } from '../../../lib/agents/mini-bibliotecario';

/* ── Interfaces ───────────────────────────────────────────────────────────── */

interface QueryItem {
  id: string;
  category: string;
  question_text: string;
  ground_truth: string;
  difficulty: string;
  equipment_model: string;
}

interface AnnotatedChunk extends MiniChunk {
  is_relevant: number;
}

interface QuestionResult {
  query_id: string;
  category: string;
  question_text: string;
  ground_truth: string;
  retrieved_chunks: AnnotatedChunk[];
  metrics: {
    precision_at_3: number;
    precision_at_5: number;
    precision_at_10: number;
    recall_at_3: number;
    recall_at_5: number;
    recall_at_10: number;
    mrr: number;
    f1_at_3: number;
    f1_at_5: number;
    f1_at_10: number;
    first_relevant_rank: number | null;
  };
}

interface CategoryMetrics {
  category: string;
  n: number;
  precision_at_3: number;
  precision_at_5: number;
  precision_at_10: number;
  recall_at_3: number;
  recall_at_5: number;
  recall_at_10: number;
  mrr: number;
  f1_at_3: number;
  f1_at_5: number;
  f1_at_10: number;
}

interface GlobalMetrics {
  total: number;
  precision_at_3: { mean: number; sd: number };
  precision_at_5: { mean: number; sd: number };
  precision_at_10: { mean: number; sd: number };
  recall_at_3: number;
  recall_at_5: number;
  recall_at_10: number;
  mrr: { mean: number; sd: number };
  f1_at_3: { mean: number; sd: number };
  f1_at_5: { mean: number; sd: number };
  f1_at_10: { mean: number; sd: number };
  por_categoria: CategoryMetrics[];
  por_fuente: { source: string; n: number; relevant_rate: number; avg_score: number }[];
  warning_analysis: { with_warning: { n: number; relevant_rate: number }; without_warning: { n: number; relevant_rate: number } };
  spearman_score_relevance: number;
}

/* ── Anotación: embedding similarity vs ground_truth ──────────────────────── */

const RELEVANCE_THRESHOLD = 0.45;

const pipelinePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function embedTextLocal(text: string): Promise<number[]> {
  const extractor = await pipelinePromise;
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data) as number[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function annotateChunks(
  chunks: MiniChunk[],
  groundTruth: string,
): Promise<AnnotatedChunk[]> {
  const gtEmbedding = await embedTextLocal(groundTruth);

  return Promise.all(chunks.map(async (chunk) => {
    const textToCompare = chunk.text || '';
    if (!textToCompare || textToCompare.length < 10) return { ...chunk, is_relevant: 0 };

    const chunkEmb = await embedTextLocal(textToCompare.substring(0, 2000));
    const sim = cosineSimilarity(gtEmbedding, chunkEmb);

    return {
      ...chunk,
      is_relevant: sim >= RELEVANCE_THRESHOLD ? 1 : 0,
    };
  }));
}

/* ── Métricas ─────────────────────────────────────────────────────────────── */

function computeMetrics(chunks: AnnotatedChunk[]): QuestionResult['metrics'] {
  const relevantRanks = chunks
    .map((c, i) => ({ rank: i + 1, relevant: c.is_relevant }))
    .filter(c => c.relevant === 1);

  const firstRelevantRank = relevantRanks.length > 0 ? relevantRanks[0].rank : null;

  function precision(k: number): number {
    const topK = chunks.slice(0, k);
    const rel = topK.filter(c => c.is_relevant === 1).length;
    return rel / k;
  }

  function recall(k: number): number {
    return firstRelevantRank !== null && firstRelevantRank <= k ? 1 : 0;
  }

  const mrr = firstRelevantRank !== null ? 1 / firstRelevantRank : 0;

  function f1(k: number): number {
    const p = precision(k);
    const r = recall(k);
    return p + r > 0 ? 2 * (p * r) / (p + r) : 0;
  }

  return {
    precision_at_3: precision(3),
    precision_at_5: precision(5),
    precision_at_10: precision(10),
    recall_at_3: recall(3),
    recall_at_5: recall(5),
    recall_at_10: recall(10),
    mrr,
    f1_at_3: f1(3),
    f1_at_5: f1(5),
    f1_at_10: f1(10),
    first_relevant_rank: firstRelevantRank,
  };
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function sd(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1));
}

function computeGlobalMetrics(results: QuestionResult[]): GlobalMetrics {
  const p3 = results.map(r => r.metrics.precision_at_3);
  const p5 = results.map(r => r.metrics.precision_at_5);
  const p10 = results.map(r => r.metrics.precision_at_10);
  const r3 = results.map(r => r.metrics.recall_at_3);
  const r5 = results.map(r => r.metrics.recall_at_5);
  const r10 = results.map(r => r.metrics.recall_at_10);
  const mrrs = results.map(r => r.metrics.mrr);
  const f3 = results.map(r => r.metrics.f1_at_3);
  const f5 = results.map(r => r.metrics.f1_at_5);
  const f10 = results.map(r => r.metrics.f1_at_10);

  // Por categoría
  const catMap = new Map<string, QuestionResult[]>();
  for (const r of results) {
    const arr = catMap.get(r.category) || [];
    arr.push(r);
    catMap.set(r.category, arr);
  }

  const porCategoria: CategoryMetrics[] = [];
  for (const [category, items] of catMap) {
    porCategoria.push({
      category,
      n: items.length,
      precision_at_3: mean(items.map(i => i.metrics.precision_at_3)),
      precision_at_5: mean(items.map(i => i.metrics.precision_at_5)),
      precision_at_10: mean(items.map(i => i.metrics.precision_at_10)),
      recall_at_3: mean(items.map(i => i.metrics.recall_at_3)),
      recall_at_5: mean(items.map(i => i.metrics.recall_at_5)),
      recall_at_10: mean(items.map(i => i.metrics.recall_at_10)),
      mrr: mean(items.map(i => i.metrics.mrr)),
      f1_at_3: mean(items.map(i => i.metrics.f1_at_3)),
      f1_at_5: mean(items.map(i => i.metrics.f1_at_5)),
      f1_at_10: mean(items.map(i => i.metrics.f1_at_10)),
    });
  }

  // Por fuente
  const sourceMap = new Map<string, { count: number; relevant: number; scores: number[] }>();
  for (const r of results) {
    for (const c of r.retrieved_chunks) {
      const entry = sourceMap.get(c.source) || { count: 0, relevant: 0, scores: [] };
      entry.count++;
      entry.relevant += c.is_relevant;
      entry.scores.push(c.score);
      sourceMap.set(c.source, entry);
    }
  }
  const porFuente = [...sourceMap.entries()].map(([source, data]) => ({
    source,
    n: data.count,
    relevant_rate: data.count > 0 ? data.relevant / data.count : 0,
    avg_score: data.scores.length > 0 ? mean(data.scores) : 0,
  }));

  // Warning analysis
  let wWarn = { count: 0, relevant: 0 };
  let woWarn = { count: 0, relevant: 0 };
  for (const r of results) {
    for (const c of r.retrieved_chunks) {
      if (c.warning_flag) {
        wWarn.count++;
        wWarn.relevant += c.is_relevant;
      } else {
        woWarn.count++;
        woWarn.relevant += c.is_relevant;
      }
    }
  }

  // Spearman correlation between score and is_relevant
  const pairs: { score: number; relevant: number }[] = [];
  for (const r of results) {
    for (const c of r.retrieved_chunks) {
      pairs.push({ score: c.score, relevant: c.is_relevant });
    }
  }
  const spearmanScore = computeSpearman(pairs);

  return {
    total: results.length,
    precision_at_3: { mean: mean(p3), sd: sd(p3) },
    precision_at_5: { mean: mean(p5), sd: sd(p5) },
    precision_at_10: { mean: mean(p10), sd: sd(p10) },
    recall_at_3: mean(r3),
    recall_at_5: mean(r5),
    recall_at_10: mean(r10),
    mrr: { mean: mean(mrrs), sd: sd(mrrs) },
    f1_at_3: { mean: mean(f3), sd: sd(f3) },
    f1_at_5: { mean: mean(f5), sd: sd(f5) },
    f1_at_10: { mean: mean(f10), sd: sd(f10) },
    por_categoria: porCategoria,
    por_fuente: porFuente,
    warning_analysis: {
      with_warning: { n: wWarn.count, relevant_rate: wWarn.count > 0 ? wWarn.relevant / wWarn.count : 0 },
      without_warning: { n: woWarn.count, relevant_rate: woWarn.count > 0 ? woWarn.relevant / woWarn.count : 0 },
    },
    spearman_score_relevance: spearmanScore,
  };
}

function computeSpearman(pairs: { score: number; relevant: number }[]): number {
  if (pairs.length < 3) return 0;
  const ranked = pairs.map((p, i) => ({
    ...p,
    scoreRank: 0,
    relevantRank: 0,
  }));

  const byScore = [...ranked].sort((a, b) => a.score - b.score);
  byScore.forEach((p, i) => { p.scoreRank = i + 1; });

  const byRelevant = [...ranked].sort((a, b) => a.relevant - b.relevant);
  byRelevant.forEach((p, i) => { p.relevantRank = i + 1; });

  const n = ranked.length;
  const dSq = ranked.reduce((sum, p) => sum + (p.scoreRank - p.relevantRank) ** 2, 0);
  return 1 - (6 * dSq) / (n * (n * n - 1));
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

async function main() {
  const { runMiniBibliotecario } = await import('../../../lib/agents/mini-bibliotecario');
  const start = Date.now();
  console.log('📚 MiniBibliotecario — Evaluación de 100 preguntas');
  console.log('');

  // Cargar preguntas
  const queriesPath = resolve(process.cwd(), 'research/queries_exp5.json');
  const queriesFile = JSON.parse(readFileSync(queriesPath, 'utf-8'));
  const preguntas: QueryItem[] = queriesFile.preguntas;
  console.log(`✅ Cargadas ${preguntas.length} preguntas desde queries_exp5.json`);
  console.log('');

  const results: QuestionResult[] = [];

  for (let i = 0; i < preguntas.length; i++) {
    const q = preguntas[i];
    const pct = ((i + 1) / preguntas.length * 100).toFixed(0);
    process.stdout.write(`  [${pct}%] Q${i + 1}/${preguntas.length} — ${q.id} (${q.category})... `);

    try {
      const output = await runMiniBibliotecario({
        query_text: q.question_text,
        top_k: 10,
      });

      // Anotar relevancia vs ground_truth
      const annotated = await annotateChunks(output.chunks, q.ground_truth);
      const metrics = computeMetrics(annotated);

      results.push({
        query_id: q.id,
        category: q.category,
        question_text: q.question_text,
        ground_truth: q.ground_truth,
        retrieved_chunks: annotated,
        metrics,
      });

      console.log(`MRR=${metrics.mrr.toFixed(3)} P@5=${metrics.precision_at_5.toFixed(3)}`);
    } catch (err) {
      console.log(`❌ Error: ${(err as Error).message}`);
      results.push({
        query_id: q.id,
        category: q.category,
        question_text: q.question_text,
        ground_truth: q.ground_truth,
        retrieved_chunks: [],
        metrics: {
          precision_at_3: 0, precision_at_5: 0, precision_at_10: 0,
          recall_at_3: 0, recall_at_5: 0, recall_at_10: 0,
          mrr: 0,
          f1_at_3: 0, f1_at_5: 0, f1_at_10: 0,
          first_relevant_rank: null,
        },
      });
    }
  }

  // Métricas globales
  const globalMetrics = computeGlobalMetrics(results);

  // Guardar resultados
  const outDir = resolve(process.cwd(), 'research/evaluations');
  mkdirSync(outDir, { recursive: true });

  const output = {
    experimento: {
      id: 'mini_bibliotecario_eval',
      descripcion: 'Evaluación del agente MiniBibliotecario contra 100 preguntas con ground_truth',
      fecha: new Date().toISOString(),
      total_preguntas: preguntas.length,
      threshold_relevance: RELEVANCE_THRESHOLD,
    },
    metricas_globales: globalMetrics,
    resultados: results,
  };

  const outPath = resolve(outDir, 'mini_bibliotecario_resultados.json');
  writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  // También guardar métricas planas como CSV-friendly JSON
  const metricsOnly = {
    experimento: output.experimento,
    metricas_globales: globalMetrics,
  };
  const metricsPath = resolve(outDir, 'mini_bibliotecario_metricas.json');
  writeFileSync(metricsPath, JSON.stringify(metricsOnly, null, 2), 'utf-8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log('');
  console.log('═'.repeat(60));
  console.log('📊 MÉTRICAS GLOBALES');
  console.log('═'.repeat(60));
  console.log(`  Total preguntas:    ${globalMetrics.total}`);
  console.log(`  Threshold relevancia: ${RELEVANCE_THRESHOLD}`);
  console.log('');
  console.log(`  Precision@3:  ${globalMetrics.precision_at_3.mean.toFixed(4)} ±${globalMetrics.precision_at_3.sd.toFixed(4)}`);
  console.log(`  Precision@5:  ${globalMetrics.precision_at_5.mean.toFixed(4)} ±${globalMetrics.precision_at_5.sd.toFixed(4)}`);
  console.log(`  Precision@10: ${globalMetrics.precision_at_10.mean.toFixed(4)} ±${globalMetrics.precision_at_10.sd.toFixed(4)}`);
  console.log('');
  console.log(`  Recall@3:  ${globalMetrics.recall_at_3.toFixed(4)}`);
  console.log(`  Recall@5:  ${globalMetrics.recall_at_5.toFixed(4)}`);
  console.log(`  Recall@10: ${globalMetrics.recall_at_10.toFixed(4)}`);
  console.log('');
  console.log(`  MRR:          ${globalMetrics.mrr.mean.toFixed(4)} ±${globalMetrics.mrr.sd.toFixed(4)}`);
  console.log('');
  console.log(`  F1@3:  ${globalMetrics.f1_at_3.mean.toFixed(4)} ±${globalMetrics.f1_at_3.sd.toFixed(4)}`);
  console.log(`  F1@5:  ${globalMetrics.f1_at_5.mean.toFixed(4)} ±${globalMetrics.f1_at_5.sd.toFixed(4)}`);
  console.log(`  F1@10: ${globalMetrics.f1_at_10.mean.toFixed(4)} ±${globalMetrics.f1_at_10.sd.toFixed(4)}`);
  console.log('');
  console.log('─'.repeat(60));
  console.log('POR CATEGORÍA');
  console.log('─'.repeat(60));
  for (const cat of globalMetrics.por_categoria) {
    console.log(`  ${cat.category.padEnd(22)} n=${cat.n} P@5=${cat.precision_at_5.toFixed(3)} R@5=${cat.recall_at_5.toFixed(3)} MRR=${cat.mrr.toFixed(3)}`);
  }
  console.log('');
  console.log('─'.repeat(60));
  console.log('POR FUENTE');
  console.log('─'.repeat(60));
  for (const src of globalMetrics.por_fuente) {
    console.log(`  ${src.source.padEnd(18)} n=${src.n} relevant_rate=${(src.relevant_rate * 100).toFixed(1)}% avg_score=${src.avg_score.toFixed(4)}`);
  }
  console.log('');
  console.log('─'.repeat(60));
  console.log('WARNING FLAG');
  console.log('─'.repeat(60));
  const w = globalMetrics.warning_analysis;
  console.log(`  Con warning:    n=${w.with_warning.n} relevant=${(w.with_warning.relevant_rate * 100).toFixed(1)}%`);
  console.log(`  Sin warning:    n=${w.without_warning.n} relevant=${(w.without_warning.relevant_rate * 100).toFixed(1)}%`);
  console.log('');
  console.log(`  Spearman (score vs relevancia): ${globalMetrics.spearman_score_relevance.toFixed(4)}`);
  console.log('');
  console.log(`✅ Completado en ${elapsed}s`);
  console.log(`   → ${outPath}`);
  console.log(`   → ${metricsPath}`);
}

main().catch(console.error);

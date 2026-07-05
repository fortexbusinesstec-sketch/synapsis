#!/usr/bin/env tsx
/**
 * Exporta el Experimento 1 completo desde Turso a JSON jerárquico.
 * 
 * Uso:
 *   npx tsx research/scripts/evaluation/export_experimento1_full.ts
 * 
 * Salida: research/experimento1_completo.json (~ 10–20 MB)
 * 
 * Estructura:
 *   { experimento, escenarios: [{ id, title, ..., turnos, runs: [{ configId, ..., turnResults, score }] }] }
 */

import { createClient } from '@libsql/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv();

const DB_URL = process.env.TURSO_URL_TESIS || process.env.TURSO_URL || '';
const DB_TOKEN = process.env.TURSO_TOKEN_TESIS || process.env.TURSO_TOKEN || '';

if (!DB_URL || !DB_TOKEN) {
  console.error('ERROR: TURSO_URL_TESIS y TURSO_TOKEN_TESIS requeridos en .env');
  process.exit(1);
}

const db = createClient({ url: DB_URL, authToken: DB_TOKEN });

// ─── Tipos ───────────────────────────────────────────────────────────────────
interface RawScenario {
  id: string; title: string; description: string | null;
  category: string; equipment_model: string | null;
  difficulty: string; max_turns: number;
  resolution_criteria: string; is_active: number; created_at: number;
}

interface RawTurn {
  id: string; scenario_id: string; turn_number: number;
  technician_message: string; turn_intent: string | null;
  expected_behavior: string | null; is_ambiguous: number;
  introduces_new_data: number;
}

interface RawRun {
  id: string; scenario_id: string; config_id: string;
  session_id: string | null; run_batch: string; status: string;
  turns_completed: number | null; turns_planned: number;
  resolution_reached: number | null; turns_to_resolution: number | null;
  context_reuse_rate: number | null;
  unnecessary_clarifications: number | null;
  total_cost_usd: number | null; total_tokens: number | null;
  total_latency_ms: number | null; total_loops_fired: number | null;
  avg_confidence_session: number | null;
  error_message: string | null; created_at: number | null;
}

interface RawTurnResult {
  id: string; scenario_run_id: string;
  turn_number: number; system_response: string | null;
  response_mode: string | null; detected_intent: string | null;
  turn_score: number | null; confidence: number | null;
}

interface RawScore {
  scenario_run_id: string;
  score_diagnostic_progression: number;
  score_factual_consistency: number;
  score_hypothesis_refinement: number;
  score_technician_effort: number;
  score_total: number;
  resolution_reached: number;
  critical_error_made: number;
  contradicted_itself: number;
  repeated_question: number;
  judge_narrative: string | null;
  judge_tokens_used: number | null;
  judge_cost_usd: number | null;
  evaluated_at: number | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('📡 Conectando a Turso...');
  const start = Date.now();

  // 1. Configuraciones
  const configsRaw = await db.execute('SELECT id, name, description FROM ablation_configurations WHERE id IN (\'A\',\'B\',\'C\',\'D\')');
  const configs: Record<string, { id: string; name: string; description: string }> = {};
  for (const r of configsRaw.rows) {
    const row = r as Record<string, unknown>;
    configs[row.id as string] = {
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
    };
  }
  console.log(`  → ${Object.keys(configs).length} configs`);

  // 2. Categorías
  const catsRaw = await db.execute('SELECT category, COUNT(*) as count FROM ablation_scenarios GROUP BY category ORDER BY category');
  const categorias: Record<string, { id: string; label: string; n_escenarios: number }> = {};
  for (const r of catsRaw.rows) {
    const row = r as Record<string, unknown>;
    categorias[row.category as string] = {
      id: row.category as string,
      label: row.category as string,
      n_escenarios: row.count as number,
    };
  }

  // 3. Escenarios (todos los 50)
  const scenRaw = await db.execute('SELECT * FROM ablation_scenarios ORDER BY id');
  const scenRows = scenRaw.rows as unknown as RawScenario[];
  console.log(`  → ${scenRows.length} escenarios`);

  // 4. Turnos definidos (todos, ~250)
  const turnsRaw = await db.execute('SELECT * FROM ablation_scenario_turns ORDER BY scenario_id, turn_number');
  const turnRows = turnsRaw.rows as unknown as RawTurn[];
  console.log(`  → ${turnRows.length} turnos definidos`);

  // 5. Runs (todos, ~200)
  const runsRaw = await db.execute(`
    SELECT * FROM ablation_scenario_runs 
    WHERE status = 'done' 
    ORDER BY scenario_id, config_id
  `);
  const runRows = runsRaw.rows as unknown as RawRun[];
  console.log(`  → ${runRows.length} runs`);

  // 6. Turn results (todos, ~1000)
  const trRaw = await db.execute(`
    SELECT tr.id, tr.scenario_run_id, tr.turn_number, 
           tr.system_response, tr.response_mode, tr.detected_intent,
           tr.turn_score, tr.confidence
    FROM ablation_scenario_turn_results tr
    ORDER BY tr.scenario_run_id, tr.turn_number
  `);
  const trRows = trRaw.rows as unknown as RawTurnResult[];
  console.log(`  → ${trRows.length} turn results`);

  // 7. Scores (todos, ~200)
  const scRaw = await db.execute(`
    SELECT sc.*
    FROM ablation_scenario_scores sc
    ORDER BY sc.scenario_run_id
  `);
  const scRows = scRaw.rows as unknown as RawScore[];
  console.log(`  → ${scRows.length} scores`);

  // ─── Assembler ──────────────────────────────────────────────────────────
  console.log('\n🔨 Ensamblando estructura jerárquica...');

  // Indexar turnos por scenario_id
  const turnsByScenario = new Map<string, RawTurn[]>();
  for (const t of turnRows) {
    if (!turnsByScenario.has(t.scenario_id)) turnsByScenario.set(t.scenario_id, []);
    turnsByScenario.get(t.scenario_id)!.push(t);
  }

  // Indexar runs por scenario_id
  const runsByScenario = new Map<string, RawRun[]>();
  for (const r of runRows) {
    if (!runsByScenario.has(r.scenario_id)) runsByScenario.set(r.scenario_id, []);
    runsByScenario.get(r.scenario_id)!.push(r);
  }

  // Indexar turn_results por scenario_run_id
  const trByRun = new Map<string, RawTurnResult[]>();
  for (const tr of trRows) {
    if (!trByRun.has(tr.scenario_run_id)) trByRun.set(tr.scenario_run_id, []);
    trByRun.get(tr.scenario_run_id)!.push(tr);
  }

  // Indexar scores por scenario_run_id
  const scoreByRun = new Map<string, RawScore>();
  for (const s of scRows) {
    scoreByRun.set(s.scenario_run_id, s);
  }

  // Ensamblar
  const escenarios = scenRows.map((sc) => {
    const turns = (turnsByScenario.get(sc.id) || []).map((t) => ({
      turnNumber: t.turn_number,
      technicianMessage: t.technician_message,
      turnIntent: t.turn_intent,
      expectedBehavior: t.expected_behavior,
      isAmbiguous: t.is_ambiguous === 1,
      introducesNewData: t.introduces_new_data === 1,
    }));

    const runs = (runsByScenario.get(sc.id) || []).map((r) => {
      const turnResults = (trByRun.get(r.id) || []).map((tr) => ({
        turnNumber: tr.turn_number,
        turnResultId: tr.id,
        systemResponse: tr.system_response,
        responseMode: tr.response_mode,
        detectedIntent: tr.detected_intent,
        confidence: tr.confidence,
      }));

      const score = scoreByRun.get(r.id);
      const scoreData = score ? {
        scoreDiagnosticProgression: score.score_diagnostic_progression,
        scoreFactualConsistency: score.score_factual_consistency,
        scoreHypothesisRefinement: score.score_hypothesis_refinement,
        scoreTechnicianEffort: score.score_technician_effort,
        scoreTotal: score.score_total,
        resolutionReached: score.resolution_reached === 1,
        criticalErrorMade: score.critical_error_made === 1,
        contradictedItself: score.contradicted_itself === 1,
        repeatedQuestion: score.repeated_question === 1,
        judgeNarrative: score.judge_narrative,
        judgeTokensUsed: score.judge_tokens_used ?? 0,
        judgeCostUsd: score.judge_cost_usd ?? 0,
        evaluatedAt: score.evaluated_at,
      } : null;

      return {
        configId: r.config_id,
        runId: r.id,
        sessionId: r.session_id,
        status: r.status,
        turnsCompleted: r.turns_completed ?? 0,
        turnsPlanned: r.turns_planned,
        resolutionReached: r.resolution_reached === 1,
        turnsToResolution: r.turns_to_resolution,
        contextReuseRate: r.context_reuse_rate,
        unnecessaryClarifications: r.unnecessary_clarifications ?? 0,
        totalLoopsFired: r.total_loops_fired ?? 0,
        totalCostUsd: r.total_cost_usd ?? 0,
        totalTokens: r.total_tokens ?? 0,
        totalLatencyMs: r.total_latency_ms ?? 0,
        avgConfidenceSession: r.avg_confidence_session,
        errorMessage: r.error_message,
        createdAt: r.created_at ?? 0,
        turnResults,
        score: scoreData,
      };
    });

    return {
      id: sc.id,
      title: sc.title,
      description: sc.description,
      category: sc.category,
      equipmentModel: sc.equipment_model,
      difficulty: sc.difficulty,
      maxTurns: sc.max_turns,
      resolutionCriteria: sc.resolution_criteria,
      createdAt: sc.created_at,
      turnos: turns,
      runs,
    };
  });

  // ─── Calcular cardinalidades reales ─────────────────────────────────────
  let totalRuns = 0;
  let totalTurnResults = 0;
  let totalScores = 0;
  for (const e of escenarios) {
    totalRuns += e.runs.length;
    for (const r of e.runs) {
      totalTurnResults += r.turnResults.length;
      if (r.score) totalScores++;
    }
  }

  // ─── Output ─────────────────────────────────────────────────────────────
  const output = {
    experimento: {
      id: 'exp1_ablacion_multiturno',
      descripcion: 'Estudio de ablación multi-turno: 50 escenarios × 5 turnos × 4 configuraciones (A, B, C, D)',
      fecha_extraccion: new Date().toISOString(),
      db: DB_URL,
      total_escenarios: escenarios.length,
      total_configs: 4,
      total_runs: totalRuns,
      total_turnos_ejecutados: totalTurnResults,
      total_scores: totalScores,
      configuraciones: configs,
      categorias,
    },
    escenarios,
  };

  const jsonPath = resolve(process.cwd(), 'research/experimento1_completo.json');
  writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf-8');

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const sizeMB = (Buffer.byteLength(JSON.stringify(output), 'utf-8') / 1024 / 1024).toFixed(1);

  console.log(`\n✅ Exportación completada en ${elapsed}s`);
  console.log(`   Archivo: ${jsonPath}`);
  console.log(`   Tamaño:  ${sizeMB} MB`);
  console.log(`   Escenarios:  ${escenarios.length}`);
  console.log(`   Runs:        ${totalRuns}`);
  console.log(`   TurnResults: ${totalTurnResults}`);
  console.log(`   Scores:      ${totalScores}`);
  console.log('\n📊 Verificación:');
  console.log(`   Esperado: 50 escenarios, 200 runs, 1000 turn_results, 200 scores`);
  const ok = escenarios.length === 50 && totalRuns === 200 && totalScores >= 180;
  console.log(`   Estado:    ${ok ? '✅ OK' : '⚠️  Discrepancia detectada'}`);
}

main().catch(console.error);

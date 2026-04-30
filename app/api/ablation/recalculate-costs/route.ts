/**
 * POST /api/ablation/recalculate-costs
 *
 * Reconstruye estimaciones de cost_usd y total_tokens para
 * ablation_scenario_runs donde esos campos están en 0.
 *
 * Fórmula basada en:
 *  - chunks_used / loops_fired / turn_number  (de ablation_scenario_turn_results)
 *  - agentes activos según ablation_configurations
 *
 * Modelos y precios (tarifa OpenAI):
 *  - gpt-4o-mini : $0.15/M input  · $0.60/M output   (Clarifier, Planner, Selector)
 *  - gpt-4o      : $2.50/M input  · $10.00/M output   (Analista, Ingeniero Jefe)
 */

import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

/* ── Precios (USD por token) ─────────────────────────────────────────────── */
const MINI_IN  = 0.15   / 1_000_000;
const MINI_OUT = 0.60   / 1_000_000;
const GPT4_IN  = 2.50   / 1_000_000;
const GPT4_OUT = 10.00  / 1_000_000;

/**
 * Tokens y costo estimados para UN turno.
 *
 * @param cfg        Flags de la configuración
 * @param chunks     chunks_used en ese turno
 * @param loops      loops_fired en ese turno
 * @param turnNumber posición del turno en la sesión (1-based)
 */
function estimateTurn(
  cfg: {
    clarifier_enabled: number;
    planner_enabled:   number;
    selector_enabled:  number;
    analista_enabled:  number;
  },
  chunks:     number,
  loops:      number,
  turnNumber: number,
): { tokens: number; cost: number } {
  let tokens = 0;
  let cost   = 0;

  /* ── Clarificador (gpt-4o-mini) ─────────────────────── */
  if (cfg.clarifier_enabled) {
    const inp = 520, out = 120;
    tokens += inp + out;
    cost   += inp * MINI_IN + out * MINI_OUT;
  }

  /* ── Planificador (gpt-4o-mini, sólo en loops adicionales) ── */
  if (cfg.planner_enabled) {
    const extraLoops = Math.max(0, loops - 1);
    if (extraLoops > 0) {
      const inp = 880, out = 210;
      tokens += (inp + out) * extraLoops;
      cost   += (inp * MINI_IN + out * MINI_OUT) * extraLoops;
    }
  }

  /* ── Selector de Contexto (gpt-4o-mini) ─────────────── */
  if (cfg.selector_enabled) {
    const inp = 1200 + chunks * 155;
    const out = 75;
    tokens += inp + out;
    cost   += inp * MINI_IN + out * MINI_OUT;
  }

  /* ── Analista (gpt-4o, × loops) ─────────────────────── */
  if (cfg.analista_enabled) {
    const inp = 620 + chunks * 180;
    const out = 175;
    tokens += (inp + out) * loops;
    cost   += (inp * GPT4_IN + out * GPT4_OUT) * loops;
  }

  /* ── Ingeniero Jefe (gpt-4o, siempre) ───────────────── */
  // El contexto crece con el historial acumulado de turnos anteriores
  const priorTurns = Math.max(0, turnNumber - 1);
  const ijIn  = 1000 + chunks * 200 + priorTurns * 360;
  const ijOut = 650;
  tokens += ijIn + ijOut;
  cost   += ijIn * GPT4_IN + ijOut * GPT4_OUT;

  return { tokens, cost };
}

/* ── Handler ─────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as {
    batch?:     string;  // si se omite, recalcula todos los que tengan cost=0
    force?:     boolean; // si true, recalcula incluso los que tengan cost>0
    dryRun?:    boolean; // si true, sólo devuelve estimaciones sin escribir
  };

  const { batch, force = false, dryRun = false } = body;

  /* 1. Cargar scenario_runs afectados ─────────────────────────────────────── */
  const runsRes = await client.execute({
    sql: `
      SELECT sr.id, sr.config_id, sr.run_batch, sr.turns_completed,
             sr.session_id,
             c.clarifier_enabled, c.planner_enabled,
             c.selector_enabled,  c.analista_enabled
      FROM ablation_scenario_runs sr
      JOIN ablation_configurations c ON sr.config_id = c.id
      WHERE sr.status = 'done'
        ${!force     ? 'AND (sr.total_cost_usd IS NULL OR sr.total_cost_usd = 0)' : ''}
        ${batch      ? 'AND sr.run_batch = ?'                                     : ''}
    `,
    args: batch ? [batch] : [],
  });

  if (!runsRes.rows.length) {
    return NextResponse.json({ message: 'No hay runs que recalcular', updated: 0 });
  }

  /* 2. Cargar todos los turn_results en un solo query ─────────────────────── */
  const runIds = (runsRes.rows as Record<string, unknown>[]).map(r => r.id as string);

  // SQLite no soporta IN con parámetros dinámicos en libsql, usamos placeholders
  const placeholders = runIds.map(() => '?').join(',');
  const turnsRes = await client.execute({
    sql: `
      SELECT scenario_run_id, turn_number, chunks_used, loops_fired
      FROM ablation_scenario_turn_results
      WHERE scenario_run_id IN (${placeholders})
      ORDER BY scenario_run_id, turn_number
    `,
    args: runIds,
  });

  /* 3. Agrupar turn_results por run_id ────────────────────────────────────── */
  const turnsByRun: Record<string, { turn_number: number; chunks_used: number; loops_fired: number }[]> = {};
  for (const t of turnsRes.rows as Record<string, unknown>[]) {
    const rid = t.scenario_run_id as string;
    if (!turnsByRun[rid]) turnsByRun[rid] = [];
    turnsByRun[rid].push({
      turn_number: (t.turn_number  as number) || 1,
      chunks_used: (t.chunks_used  as number) || 3,
      loops_fired: (t.loops_fired  as number) || 1,
    });
  }

  /* 4. Calcular y escribir ─────────────────────────────────────────────────── */
  let updated = 0;
  const preview: { run_id: string; config_id: string; estimated_cost: number; estimated_tokens: number }[] = [];

  for (const row of runsRes.rows as Record<string, unknown>[]) {
    const runId    = row.id        as string;
    const cfgId    = row.config_id as string;
    const sessionId = row.session_id as string | null;
    const cfg = {
      clarifier_enabled: (row.clarifier_enabled as number) ?? 1,
      planner_enabled:   (row.planner_enabled   as number) ?? 1,
      selector_enabled:  (row.selector_enabled  as number) ?? 1,
      analista_enabled:  (row.analista_enabled  as number) ?? 1,
    };

    const turns = turnsByRun[runId] ?? [];

    // Si no hay turn_results, usar fallback de turns_completed × avg típico
    let runCost   = 0;
    let runTokens = 0;

    if (turns.length > 0) {
      for (const t of turns) {
        const { tokens, cost } = estimateTurn(cfg, t.chunks_used, t.loops_fired, t.turn_number);
        runCost   += cost;
        runTokens += tokens;

        // Actualizar cost_usd en cada turn_result
        if (!dryRun) {
          await client.execute({
            sql:  `UPDATE ablation_scenario_turn_results
                   SET cost_usd = ?
                   WHERE scenario_run_id = ? AND turn_number = ?`,
            args: [Number(cost.toFixed(6)), runId, t.turn_number],
          });
        }
      }
    } else {
      // Fallback: 5 turnos con 3 chunks, 1 loop
      const completedTurns = (row.turns_completed as number) || 5;
      for (let tn = 1; tn <= completedTurns; tn++) {
        const { tokens, cost } = estimateTurn(cfg, 3, 1, tn);
        runCost   += cost;
        runTokens += tokens;
      }
    }

    preview.push({ run_id: runId, config_id: cfgId, estimated_cost: runCost, estimated_tokens: runTokens });

    if (!dryRun) {
      // Actualizar scenario_run
      await client.execute({
        sql:  `UPDATE ablation_scenario_runs
               SET total_cost_usd = ?, total_tokens = ?
               WHERE id = ?`,
        args: [Number(runCost.toFixed(6)), runTokens, runId],
      });

      // Actualizar chat_session vinculada
      if (sessionId) {
        await client.execute({
          sql:  `UPDATE chat_sessions
                 SET total_cost_usd = ?, total_tokens = ?
                 WHERE id = ?`,
          args: [Number(runCost.toFixed(6)), runTokens, sessionId],
        });
      }

      updated++;
    }
  }

  /* 5. Calcular estadísticas de resumen ───────────────────────────────────── */
  const costByConfig: Record<string, { n: number; totalCost: number; avgCost: number }> = {};
  for (const p of preview) {
    if (!costByConfig[p.config_id]) costByConfig[p.config_id] = { n: 0, totalCost: 0, avgCost: 0 };
    costByConfig[p.config_id].n++;
    costByConfig[p.config_id].totalCost += p.estimated_cost;
  }
  for (const cid of Object.keys(costByConfig)) {
    const g = costByConfig[cid];
    g.avgCost = g.totalCost / g.n;
  }

  const grandTotal = preview.reduce((s, p) => s + p.estimated_cost, 0);
  const grandTokens = preview.reduce((s, p) => s + p.estimated_tokens, 0);

  return NextResponse.json({
    dryRun,
    updated: dryRun ? 0 : updated,
    total_runs_processed: preview.length,
    grand_total_cost_usd: Number(grandTotal.toFixed(4)),
    grand_total_tokens:   grandTokens,
    cost_by_config:       Object.fromEntries(
      Object.entries(costByConfig).map(([k, v]) => [k, {
        n:          v.n,
        total_cost: Number(v.totalCost.toFixed(4)),
        avg_cost:   Number(v.avgCost.toFixed(4)),
      }])
    ),
    model_assumptions: {
      clarifier:  'gpt-4o-mini  ~520 in + 120 out / turno',
      planner:    'gpt-4o-mini  ~880 in + 210 out / loop adicional',
      selector:   'gpt-4o-mini  ~(1200+chunks×155) in + 75 out / turno',
      analista:   'gpt-4o       ~(620+chunks×180) in + 175 out / loop × loops_fired',
      ij:         'gpt-4o       ~(1000+chunks×200+priorTurns×360) in + 650 out / turno',
    },
  });
}

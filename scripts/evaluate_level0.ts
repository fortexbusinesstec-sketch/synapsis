/**
 * SYNAPSE — Motor de Evaluación Nivel 0: Operador Humano
 * ============================================================
 * Simula a un técnico junior en un entorno real (celular + Google Drive)
 * usando el Modelo Cognitivo GOMS y reglas de fatiga / sobrecarga de información.
 *
 * Modelo GOMS aplicado:
 *   M = 1.2s  (Mental / preparación cognitiva)
 *   K = 0.2s  (Keystroke / pulsación de tecla, estimado por letra)
 *   S = 5.0s  (System response / desplazamiento y búsqueda visual)
 *   P = 1.5s  (Pointing / apuntar o tocar pantalla táctil)
 *
 * Regla de Fatiga (límite de usabilidad móvil):
 *   0 resultados  → Término desconocido, cambio de búsqueda
 *   1–15 resultados → Zona óptima, lectura profunda hasta el resultado medio
 *   >15 resultados  → Sobrecarga cognitiva, lectura superficial de 3 y abandono
 *
 * Telemetría persistida en:
 *   ablation_runs  → latencia, costo, contexto de ejecución
 *   ablation_scores → success_score como score_total, MRR, recall@3
 *
 * @author   Fabrizio — Tesis de Maestría (Proyecto Synapsis)
 * @version  2.0.0  (Persistencia BD + banco de preguntas integrado)
 */

import { createId } from '@paralleldrive/cuid2';
import { client } from '../lib/db';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';

// ─── Constantes GOMS (en segundos) ────────────────────────────────────────────

/** Tiempo de preparación mental antes de cada acción */
const M_TIME = 1.2;
/** Tiempo por pulsación de tecla (por carácter) */
const K_TIME = 0.2;
/** Tiempo de desplazamiento / búsqueda visual en pantalla táctil */
const S_TIME = 5.0;
/** Tiempo de apuntado / touchdown en pantalla táctil */
const P_TIME = 1.5;

/** Tiempo de lectura profunda por resultado útil (segundos) */
const READ_DEEP_TIME = 15.0;
/** Tiempo de lectura rápida por resultado en sobrecarga (segundos) */
const READ_SKIM_TIME = 8.0;
/** Penalización por rendición total — el humano desiste (segundos) */
const PENALTY_GIVEUP = 600.0;

/** Tarifa horaria aproximada de un técnico junior en Perú (USD/hr) */
const HOURLY_RATE_USD = 1.35;

/** Batch por defecto para el banco de preguntas de tesis */
const DEFAULT_BATCH = 'pilot_2025_04_14';
/** ID de configuración para el baseline humano (Nivel 0) */
const LEVEL0_CONFIG_ID = 'config_goms';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Level0Options {
  /** ID de la configuración (ej: 'config_goms') */
  configId?: string;
  /** ID de la pregunta ablation (ej: 'P01') */
  questionId: string;
  /** Texto de la consulta técnica */
  query: string;
  /** Modelo de equipo (ej: '3300', '5500') */
  equipmentModel: string;
  /** Índice de ejecución dentro del batch */
  runIndex?: number;
  /** Batch de experimentación */
  runBatch?: string;
  /** Ground truth para calcular recall@3 */
  groundTruth?: string;
}

export interface Level0Telemetry {
  /** ID del ablation_run insertado en BD */
  runId: string;
  /** Duración total de la simulación en milisegundos */
  totalMs: number;
  /** Costo estimado del tiempo del operador en USD */
  costUsd: number;
  /** Número promedio de manuales revisados (fórmula: (N+1)/2) */
  manualesRevisados: number;
  /** Número de términos que no generaron resultados */
  unknownTermsCount: number;
  /** Número de cambios de término (saltos cognitivos) */
  saltosContexto: number;
  /**
   * Puntaje de éxito:
   *   1.0 → Éxito en primer término (búsqueda directa)
   *   0.5 → Éxito pero requirió múltiples intentos (multi-hop)
   *   0.0 → Fallo total, el operador se rindió
   */
  successScore: number;
  /** Términos de búsqueda generados por el LLM */
  termsGenerated: string[];
  /** Detalle de coincidencias por término (para debugging) */
  matchDetails: Array<{ term: string; matches: number; outcome: string }>;
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Ejecuta la simulación completa del Operador Humano (Nivel 0) y persiste
 * los resultados en `ablation_runs` y `ablation_scores`.
 */
export async function runLevel0Simulation(
  opts: Level0Options
): Promise<Level0Telemetry> {
  const {
    questionId,
    query,
    equipmentModel,
    runIndex = 1,
    runBatch = DEFAULT_BATCH,
    groundTruth,
    configId = LEVEL0_CONFIG_ID,
  } = opts;

  const runId = createId();
  const startWall = Date.now();

  let totalMs = 0;
  let unknownTermsCount = 0;
  let saltosContexto = 0;
  let successScore = 0.0;
  const matchDetails: Array<{ term: string; matches: number; outcome: string }> = [];

  // ── Insertar run con estado 'running' ─────────────────────────────────────
  await client.execute({
    sql: `
      INSERT INTO ablation_runs
        (id, question_id, config_id, run_batch, run_index, status,
         detected_intent, created_at)
      VALUES
        (?, ?, ?, ?, ?, 'running', ?, unixepoch())
    `,
    args: [runId, questionId, configId, runBatch, runIndex,
      `human_simulation:${equipmentModel}`],
  });

  // ── FASE 0: Sacar el celular y abrir Google Drive ─────────────────────────
  // M (recordar abrir Drive) + P (touch en app) + S (esperar la carga)
  totalMs += (M_TIME + P_TIME + S_TIME) * 1000;

  // ── FASE 1: Generación Cognitiva de Términos de Búsqueda ──────────────────
  console.log(`[L0] Generando términos de búsqueda para: "${query}"`);
  const llmStart = Date.now();
  let termsGenerated: string[] = [];

  try {
    const { text: termText } = await generateText({
      model: openai('gpt-4o-mini'),
      temperature: 0.3,
      system:
        'Eres un técnico de ascensores junior. Dado el problema descrito, extrae ' +
        'estrictamente 3 términos de búsqueda cortos (1-3 palabras) que buscarías ' +
        'en el PDF del manual técnico con Ctrl+F. Responde SOLO los 3 términos ' +
        'separados por comas, sin explicación. Ejemplo: "código error, placa CPU, reset".',
      prompt: query,
    });

    termsGenerated = termText
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 3);

    // Tiempo del LLM = tiempo real de la API (ya incluye la latencia cognitiva
    // de formular la búsqueda mental)
    const llmMs = Date.now() - llmStart;
    totalMs += llmMs;
    console.log(`[L0] Términos generados en ${llmMs}ms: ${termsGenerated.join(' | ')}`);
  } catch (err) {
    console.error('[L0] Error en fase cognitiva LLM:', err);
    termsGenerated = [query.split(' ').slice(0, 2).join(' ')];
  }

  // ── FASE 2: Selección Probabilística de Manual ────────────────────────────
  const docsRes = await client.execute({
    sql: `SELECT COUNT(*) as count FROM documents WHERE equipment_model = ?`,
    args: [equipmentModel],
  });
  const nManuals = Number(docsRes.rows[0]?.count ?? 0);
  // Fórmula de valor esperado: técnico no sabe en qué manual está la info
  // E[manuales_revisados] = (N+1)/2 (exploración uniforme sin reposición)
  const manualesRevisados = nManuals > 0 ? (nManuals + 1) / 2 : 0;

  // Tiempo de navegación para localizar el manual en Drive
  // Por manual revisado: M (recordar) + S (scroll carpetas) + P (touch)
  totalMs += manualesRevisados * (M_TIME + S_TIME + P_TIME) * 1000;
  console.log(`[L0] Manuales en BD para "${equipmentModel}": ${nManuals} → revisados estimados: ${manualesRevisados}`);

  // ── FASE 3: Bucle de Búsqueda Orgánica (Ctrl+F simulado) ─────────────────
  let foundSuccess = false;
  let successTermIndex = -1;

  for (let i = 0; i < termsGenerated.length; i++) {
    const term = termsGenerated[i];
    saltosContexto++; // Cada término nuevo = salto cognitivo (cambio de foco)

    // Tiempo de tipear el término en el buscador del PDF viewer
    // M (preparar) + K_TIME*len (escritura) + P (confirmar/Enter)
    totalMs += (M_TIME + term.length * K_TIME + P_TIME) * 1000;
    console.log(`[L0]   Término ${i + 1}/3: "${term}"`);

    // Buscar coincidencias en los text_chunks reales de Turso
    const hitsRes = await client.execute({
      sql: `
        SELECT COUNT(*) as matches
        FROM document_chunks c
        JOIN documents d ON c.document_id = d.id
        WHERE d.equipment_model = ?
          AND c.content LIKE ?
      `,
      args: [equipmentModel, `%${term}%`],
    });

    const matches = Number(hitsRes.rows[0]?.matches ?? 0);
    console.log(`[L0]     → ${matches} coincidencias`);

    if (matches === 0) {
      // ── Caso A: Sin resultados — término desconocido ──────────────────────
      unknownTermsCount++;
      // S (mirar "sin resultados") + K (borrar y preparar siguiente)
      totalMs += (S_TIME + K_TIME) * 1000;
      matchDetails.push({ term, matches, outcome: 'unknown_term' });

    } else if (matches > 15) {
      // ── Caso B: Sobrecarga cognitiva (>15 hits) ───────────────────────────
      // Lee 3 fragmentos superficialmente (skim), se frustra y cambia
      totalMs += 3 * READ_SKIM_TIME * 1000;
      matchDetails.push({ term, matches, outcome: 'overload_skimmed' });

    } else {
      // ── Caso C: Éxito (1–15 hits) — zona óptima de usabilidad ────────────
      // El técnico lee hasta la mitad de los resultados (lectura profunda)
      const resultadosLeidos = Math.ceil(matches / 2);
      totalMs += resultadosLeidos * READ_DEEP_TIME * 1000;

      foundSuccess = true;
      successTermIndex = i;
      // Primer intento = 1.0 (búsqueda directa); posterior = 0.5 (multi-hop)
      successScore = i === 0 ? 1.0 : 0.5;
      matchDetails.push({ term, matches, outcome: `success_read_${resultadosLeidos}` });
      console.log(`[L0]     ✓ ÉXITO en término ${i + 1} — score: ${successScore}`);
      break;
    }
  }

  // ── FALLO TOTAL: El operador se rinde ────────────────────────────────────
  if (!foundSuccess) {
    totalMs += PENALTY_GIVEUP * 1000;
    successScore = 0.0;
    console.log(`[L0]   ✗ FALLO TOTAL — penalización ${PENALTY_GIVEUP}s aplicada`);
  }

  // ── CÁLCULO DE COSTO OPERATIVO ────────────────────────────────────────────
  const totalSeconds = totalMs / 1000;
  const costUsd = (totalSeconds / 3600) * HOURLY_RATE_USD;

  // ── MÉTRICAS DE IR (para ablation_scores) ────────────────────────────────
  // Recall@3: ¿alguno de los términos generados aparece en el ground truth?
  let recallAt3 = 0;
  let mrr = 0.0;
  if (groundTruth && foundSuccess) {
    const gtLower = groundTruth.toLowerCase();
    for (let i = 0; i < termsGenerated.length; i++) {
      if (gtLower.includes(termsGenerated[i].toLowerCase())) {
        recallAt3 = 1;
        mrr = 1 / (i + 1);
        break;
      }
    }
  }

  // ── PERSISTENCIA: Actualizar ablation_run con resultados ──────────────────
  const wallMs = Date.now() - startWall;
  const responsePayload = JSON.stringify({
    level: 0,
    mode: 'human_simulation',
    equipmentModel,
    nManuals,
    manualesRevisados,
    termsGenerated,
    matchDetails,
    successTermIndex,
    saltosContexto,
    unknownTermsCount,
  });

  await client.execute({
    sql: `
      UPDATE ablation_runs SET
        status              = ?,
        total_ms            = ?,
        cost_usd            = ?,
        loop_count          = ?,
        response_text       = ?,
        loop_stopped_reason  = ?
      WHERE id = ?
    `,
    args: [
      foundSuccess ? 'done' : 'done',
      Math.round(totalMs),
      Number(costUsd.toFixed(6)),
      saltosContexto,
      responsePayload,
      foundSuccess ? 'found' : 'giveup',
      runId,
    ],
  });

  // ── PERSISTENCIA: Insertar ablation_score ────────────────────────────────
  const scoreId = createId();
  await client.execute({
    sql: `
      INSERT INTO ablation_scores
        (id, run_id,
         score_correctness, score_completeness, score_relevance,
         score_clarity, score_ablation_impact, score_total,
         judge_model, judge_reasoning,
         recall_at_3, mrr, safe_decision_rate,
         evaluated_at)
      VALUES
        (?, ?,
         ?, ?, ?,
         ?, ?, ?,
         'goms_simulation_v2', ?,
         ?, ?, ?,
         unixepoch())
    `,
    args: [
      scoreId, runId,
      // Para el Nivel 0, todos los sub-scores collapsan en successScore
      successScore,  // correctness  — éxito o no
      successScore,  // completeness — sin gradación en L0
      successScore,  // relevance
      successScore,  // clarity
      successScore,  // ablation_impact (comparativo)
      successScore,  // score_total
      // reasoning compacto
      JSON.stringify({
        unknownTermsCount,
        saltosContexto,
        manualesRevisados,
        totalSec: totalSeconds.toFixed(1),
        costUsd: costUsd.toFixed(6),
        termIndex: successTermIndex,
      }),
      recallAt3,
      Number(mrr.toFixed(4)),
      foundSuccess ? 1 : 0, // safe_decision_rate: llegó a una respuesta válida
    ],
  });

  console.log(`[L0] ✅ Persistido — run_id: ${runId} | score_id: ${scoreId}`);
  console.log(`[L0]    totalMs: ${Math.round(totalMs)} | costUsd: $${costUsd.toFixed(4)} | successScore: ${successScore}`);

  return {
    runId,
    totalMs: Math.round(totalMs),
    costUsd: Number(costUsd.toFixed(6)),
    manualesRevisados,
    unknownTermsCount,
    saltosContexto,
    successScore,
    termsGenerated,
    matchDetails,
  };
}

// ─── Ejecución directa (modo CLI) ─────────────────────────────────────────────

if (require.main === module) {
  const questionId   = process.argv[2] || 'P01';
  const query        = process.argv[3] || 'Error Lado de Cabina en ascensor Schindler';
  const equipModel   = process.argv[4] || '3300';
  const groundTruth  = process.argv[5] || '';

  console.log('═══════════════════════════════════════════════════════');
  console.log(' SYNAPSE — Simulación Nivel 0: Operador Humano (GOMS)  ');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Pregunta ID  : ${questionId}`);
  console.log(`  Query        : "${query}"`);
  console.log(`  Modelo Equipo: ${equipModel}`);
  console.log('───────────────────────────────────────────────────────\n');

  runLevel0Simulation({
    questionId,
    query,
    equipmentModel: equipModel,
    groundTruth: groundTruth || undefined,
  })
    .then((result) => {
      console.log('\n═══ TELEMETRÍA FINAL ═══════════════════════════════════');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch((err) => {
      console.error('\n[L0] ERROR FATAL:', err);
      process.exit(1);
    });
}

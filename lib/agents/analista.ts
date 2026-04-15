/**
 * Agente 2 — Analista v3 (Evaluador Estratégico con Gap Engine)
 * Modelo: gpt-4o-mini | temperature: 0.2
 *
 * Output tipado con GapDescriptor estructurado en lugar de missing_info libre.
 * shouldLoop verifica progreso real del gap entre iteraciones.
 */
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';
import type { GapDescriptor, AnalistaOutput, LoopState, ResponseMode } from '@/lib/types/agents';

/* ── Re-exportar tipos para compatibilidad con imports existentes ─────────── */
export type { ResponseMode, GapDescriptor, AnalistaOutput, LoopState };

/* ── Input ────────────────────────────────────────────────────────────────── */
export interface AnalistaInput {
  userQuery:      string;
  groundTruth:    string;
  imageContext:   string;
  intent:         string;
  historyContext: string;
  loopIndex:      number;
  entities?:      string[];   // del Clarificador — para failsafe de gap
  isAmbiguous?:   boolean;    // del Clarificador — cortocircuita el análisis
}

/* ── Failsafe ─────────────────────────────────────────────────────────────── */
export const ANALISTA_FAILSAFE: AnalistaOutput = {
  root_cause_hypothesis: 'No se pudo analizar — continuar con información disponible.',
  confidence:            0.5,
  requires_verification: true,
  next_step:             'Describe más síntomas al técnico para precisar el diagnóstico.',
  response_mode:         'TROUBLESHOOTING',
  needs_more_info:       false,
  gap:                   null,
};

/* ── shouldLoop ───────────────────────────────────────────────────────────── */

/**
 * Decide si se debe ejecutar un re-loop.
 * Reglas (primera coincidente detiene):
 *   1. Nunca más de 2 re-planificaciones (loopIndex = índice del loop recién completado)
 *   2. Si la confianza no mejora respecto al loop anterior → stop
 *   3. Si el gap no cambió entre loops → stop (sistema atascado)
 *
 * NOTA: no muta el objeto analista — los efectos secundarios (forzar DEEP_ANALYSIS)
 *       se aplican en route.ts al detectar la razón de parada.
 */
export function shouldLoop(
  analista:    AnalistaOutput,
  loopIndex:   number,       // índice del loop recién completado (0-based)
  loopHistory: LoopState[],  // historial de loops ANTERIORES (sin el actual)
): boolean {
  // Regla 1: máximo 2 re-planificaciones (loops 0, 1, 2)
  if (loopIndex >= 2) return false;

  // Regla 2: parar si la confianza no mejoró
  if (loopIndex >= 1) {
    const prevConf = loopHistory[loopIndex - 1]?.confidence ?? 0;
    if (analista.confidence <= prevConf) return false;
  }

  // Regla 3: verificar progreso real del gap
  if (loopIndex >= 1 && analista.gap !== null) {
    const prevGap = loopHistory[loopIndex - 1]?.gap ?? null;
    if (prevGap !== null) {
      const gapChanged = (
        prevGap.target !== analista.gap.target ||
        prevGap.type   !== analista.gap.type
      );
      if (!gapChanged) return false;   // gap sin cambio → atascado
    }
  }

  return analista.needs_more_info === true;
}

/* ── Helpers internos ─────────────────────────────────────────────────────── */

const VALID_MODES = new Set<string>([
  'EMERGENCY', 'TROUBLESHOOTING', 'LEARNING', 'QUICK_CONFIRM', 'PROCEDURAL', 'AMBIGUOUS', 'DEEP_ANALYSIS',
]);

const VALID_GAP_TYPES = new Set<string>([
  'component', 'error_code', 'measurement', 'procedure', 'location',
]);

function deriveResponseMode(intent: string, confidence: number): ResponseMode {
  if (intent === 'emergency_protocol') return 'EMERGENCY';
  if (intent === 'education_info')     return 'LEARNING';
  if (confidence < 0.6)               return 'DEEP_ANALYSIS';
  return 'TROUBLESHOOTING';
}

function parseGap(raw: unknown): GapDescriptor | null {
  if (!raw || typeof raw !== 'object') return null;
  const g = raw as Record<string, unknown>;
  if (!g.type || !VALID_GAP_TYPES.has(g.type as string)) return null;
  if (!g.target || typeof g.target !== 'string' || !g.target.trim()) return null;
  if (!g.search_hint || typeof g.search_hint !== 'string') return null;
  return {
    type:        g.type        as GapDescriptor['type'],
    target:      (g.target      as string).trim(),
    reason:      typeof g.reason === 'string' ? g.reason : '',
    search_hint: (g.search_hint as string).trim(),
  };
}

/* ── Agente principal ─────────────────────────────────────────────────────── */

export async function runAnalista(
  input: AnalistaInput,
): Promise<{ output: AnalistaOutput; totalTokens: number }> {

  /* ── CORTOCIRCUITO: query ambigua — sin LLM, sin hipótesis ──────────────── */
  if (input.isAmbiguous) {
    return {
      output: {
        root_cause_hypothesis: 'Faltan datos iniciales para diagnosticar.',
        confidence:            0,
        requires_verification: true,
        next_step:             'Solicitar síntomas concretos, estado visual o código de error al técnico.',
        response_mode:         'AMBIGUOUS',
        needs_more_info:       false,   // no loops: el Ingeniero Jefe pregunta al técnico
        gap: {
          type:        'error_code',
          target:      'síntomas o código de falla',
          reason:      'La consulta no especifica síntomas concretos, estado visual ni código de error.',
          search_hint: 'síntoma visual código falla',
        },
      },
      totalTokens: 0,
    };
  }

  const isLastIteration = input.loopIndex + 1 >= 3;
  const hasHistory      = input.historyContext.trim().length > 10;

  const systemPrompt =
    'Eres el Analista Estratégico de Synapsis Go. Evalúas la suficiencia de la ' +
    'documentación recuperada y generas una hipótesis de causa raíz con alta consistencia.\n\n' +
    
    // ── REGLA: EVOLUCIÓN DE HIPÓTESIS (Fix Anchoring Bias) ──────────────────
    'EVOLUCIÓN DE HIPÓTESIS: Eres un diagnosticador dinámico. Si en el historial\n' +
    'de la conversación el técnico reporta que un paso ya se realizó, una medida\n' +
    'es correcta, o un componente fue reparado, TIENES ESTRICTAMENTE PROHIBIDO\n' +
    'volver a pedir que se revise ese componente. Debes descartar esa hipótesis\n' +
    'inmediatamente y avanzar a la SIGUIENTE causa probable según el manual.\n\n' +

    // ── REGLA DE RAZONAMIENTO ESTRUCTURADO (Chain of Thought) ──────────────
    'REGLA ESTRATÉGICA (CoT): Antes de generar tu diagnóstico final, DEBES generar\n' +
    'un razonamiento interno en el campo "thought_process". En él debes listar:\n' +
    '1) Síntoma_Actual: qué reporta el técnico exactamente ahora.\n' +
    '2) Componentes_Descartados y Cambios de Estado: qué se ha medido/reparado y\n' +
    '   cómo ha cambiado el equipo. REGLA DE PIVOTE: Si tras una reparación un indicador\n' +
    '   cambia su estado (ej: un LED pasa de fijo a parpadear), ASUME que el problema\n' +
    '   eléctrico fue resuelto. Cambia inmediatamente el vector de diagnóstico hacia\n' +
    '   causas MECÁNICAS (alineación, limpieza, ajuste físico).\n' +
    '3) Error_Code_Activo: el código que persiste en el equipo.\n' +
    '4) Flash Rule: En sensores ópticos (ej. RPHT), el parpadeo (flashing) suele indicar\n' +
    '   desalineación física o suciedad, NO un fallo de voltaje. Prioriza alineación.\n' +
    'REGLA DE NO-CONTAMINACIÓN: Tienes estrictamente PROHIBIDO basar tu diagnóstico\n' +
    'en componentes que ya estén en la lista de Componentes_Descartados.\n\n' +

    // ── REGLA MULTI-TURNO (Fix de Amnesia) ──────────────────────────────────
    'USO OBLIGATORIO DEL HISTORIAL DE CONVERSACIÓN:\n' +
    '• LEE el historial completo antes de analizar. Cada turno del técnico aporta datos nuevos.\n' +
    '• Basa tu hipótesis en el síntoma INICIAL combinado con TODOS los datos de los turnos previos.\n' +
    '• Si el técnico ya respondió una pregunta en el historial, ESA RESPUESTA cuenta como dato conocido.\n' +
    '• NUNCA indiques needs_more_info = true para información que el técnico ya proveyó en el historial.\n' +
    '• Si el historial contiene mediciones, valores o estados (ej: "450 Ω", "LED apagado"),\n' +
    '  incorpóralos directamente en root_cause_hypothesis — no los pierdas entre iteraciones.\n' +
    (hasHistory
      ? '• SESIÓN MULTI-TURNO ACTIVA: el técnico está en medio de un diagnóstico. Incrementa tu\n' +
        '  confianza con cada nuevo dato que el historial confirme. No reinicies el análisis desde cero.\n'
      : '') +
    '\n' +

    'REGLAS DE ANÁLISIS:\n' +
    '• ANALIZA la documentación recuperada para identificar la causa raíz más probable.\n' +
    '• REGLA DE DECISIÓN: Si el contexto actual permite formular una hipótesis sólida y coherente,\n' +
    '  DEBES asignar un confidence de 0.8 o superior y poner needs_more_info = false.\n' +
    '• Solo pide info adicional si es IMPOSIBLE dar un paso técnico seguro sin ella.\n' +
    '• confidence refleja qué tan bien cubre la documentación el síntoma reportado.\n' +
    '• Si confidence < 0.6: usa response_mode = "DEEP_ANALYSIS" y explora más.\n' +
    '• Si confidence < 0.4: establece needs_more_info = true y describe el gap.\n' +
    (isLastIteration
      ? '• ITERACIÓN FINAL: needs_more_info DEBE ser false — gap DEBE ser null — ' +
        'responde con lo mejor disponible.\n'
      : '') +

    '\nDESCRIPCIÓN DEL GAP (solo si needs_more_info = true):\n' +
    '  Usa el campo "gap" para describir con precisión técnica lo que falta:\n' +
    '  • type: categoría de información faltante:\n' +
    '    - component   → falta info de un componente físico específico\n' +
    '    - error_code  → falta definición o causa de un código de error\n' +
    '    - measurement → falta un valor técnico (voltaje, resistencia, torque)\n' +
    '    - procedure   → falta un procedimiento paso a paso\n' +
    '    - location    → falta ubicación física de un elemento\n' +
    '  • target: objeto técnico específico SIN texto adicional\n' +
    '    BIEN: "CN3 pin 5", "E07 SCIC", "bobina KM1", "freno 5500"\n' +
    '    MAL: "más información sobre el sistema de puertas"\n' +
    '  • reason: por qué ese dato es necesario para el diagnóstico\n' +
    '  • search_hint: 2-4 palabras técnicas para buscar en el manual\n' +
    '  Si gap es null → needs_more_info DEBE ser false.\n' +
    '  Si needs_more_info es true → gap NO puede ser null.\n\n' +

    'MODOS DE RESPUESTA (primera regla que aplica):\n' +
    '• EMERGENCY     → intent = emergency_protocol O síntoma menciona: atrapado, ' +
    'accidente, rescate, peligro\n' +
    '• PROCEDURAL    → intent = procedure O query contiene: pasos, cómo hacer, procedimiento. ' +
    'PROHIBIDO usar DEEP_ANALYSIS en este caso.\n' +
    '• QUICK_CONFIRM → pregunta binaria o validación\n' +
    '• LEARNING      → intent = education_info O query empieza con: cómo funciona, qué es\n' +
    '• DEEP_ANALYSIS → confidence < 0.6, múltiples síntomas, análisis de causa raíz\n' +
    '• TROUBLESHOOTING → cualquier otro caso de fallo activo\n\n' +

    'Responde ÚNICAMENTE con este JSON válido:\n' +
    '{\n' +
    '  "thought_process": "Razonamiento CoT siguiendo las reglas de descarte...",\n' +
    '  "root_cause_hypothesis": "string",\n' +
    '  "confidence": 0.0–1.0,\n' +
    '  "requires_verification": boolean,\n' +
    '  "next_step": "string",\n' +
    '  "response_mode": "EMERGENCY"|"TROUBLESHOOTING"|"LEARNING"|"QUICK_CONFIRM"|"PROCEDURAL"|"DEEP_ANALYSIS",\n' +
    '  "needs_more_info": boolean,\n' +
    '  "gap": {\n' +
    '    "type": "component|error_code|measurement|procedure|location",\n' +
    '    "target": "string",\n' +
    '    "reason": "string",\n' +
    '    "search_hint": "string"\n' +
    '  } | null\n' +
    '}';

  const userContent =
    `INTENT: ${input.intent}\n` +
    `SÍNTOMA: ${input.userQuery}\n` +
    `HISTORIAL: ${input.historyContext}\n` +
    `ITERACIÓN: ${input.loopIndex + 1}/3\n\n` +
    `DOCUMENTACIÓN RECUPERADA:\n${input.groundTruth.slice(0, 8000)}\n\n` +
    (input.imageContext
      ? `EVIDENCIA VISUAL:\n${input.imageContext.slice(0, 1500)}\n\n`
      : 'EVIDENCIA VISUAL: Sin imágenes relevantes.\n\n') +
    '¿Cuál es la hipótesis de causa raíz y es suficiente la documentación?';

  try {
    const { text, usage } = await generateText({
      model:       openai('gpt-4o-mini'),
      temperature: 0.2,
      maxTokens:   1000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
    });

    const totalTokens = usage.promptTokens + usage.completionTokens;

    const stripped  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON en respuesta');

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.5;

    let mode: ResponseMode = (parsed.response_mode && VALID_MODES.has(parsed.response_mode as string))
      ? parsed.response_mode as ResponseMode
      : deriveResponseMode(input.intent, confidence);

    // BYPASS ESTRICTO: intent procedural → PROCEDURAL, nunca DEEP_ANALYSIS
    const isProcedural = input.intent === 'procedure' ||
      /\b(pasos|cómo hacer|procedimiento)\b/i.test(input.userQuery);
    if (isProcedural && mode !== 'EMERGENCY') {
      mode = 'PROCEDURAL';
    } else if (input.intent === 'education_info') {
      // No degradar LEARNING a DEEP_ANALYSIS
      mode = 'LEARNING';
    } else if (confidence < 0.6 && mode !== 'EMERGENCY') {
      mode = 'DEEP_ANALYSIS';
    }

    // ── BYPASS DE CONFIANZA: LEARNING y PROCEDURAL no penalizan causa raíz ──
    // Si hay documentación RAG disponible y el modo no es TROUBLESHOOTING/DEEP_ANALYSIS,
    // la penalización de "falta causa raíz" no aplica — el técnico solo necesita
    // información concreta del manual, no un diagnóstico de falla.
    const isNonTroubleshooting = mode === 'LEARNING' || mode === 'PROCEDURAL';
    const hasContext            = input.groundTruth.trim().length > 100;  // hay chunks reales

    let finalConfidence = confidence;
    let needsMoreInfo: boolean;
    let gap: GapDescriptor | null;

    if (isNonTroubleshooting && hasContext) {
      // Forzar confianza alta: el RAG tiene la info, no hay causa raíz que buscar
      finalConfidence = Math.max(confidence, 0.85);
      needsMoreInfo   = false;
      gap             = null;
    } else {
      // Modo TROUBLESHOOTING / DEEP_ANALYSIS — penalización normal
      needsMoreInfo = isLastIteration
        ? false
        : (typeof parsed.needs_more_info === 'boolean'
            ? parsed.needs_more_info
            : confidence < 0.4);

      // Parsear gap — solo si needs_more_info es true
      gap = needsMoreInfo ? parseGap(parsed.gap) : null;

      // Failsafe: si needs_more_info=true pero gap no se pudo parsear, construir gap mínimo
      if (needsMoreInfo && gap === null) {
        const fallbackTarget = (
          typeof parsed.root_cause_hypothesis === 'string'
            ? parsed.root_cause_hypothesis.split(' ').slice(0, 3).join(' ')
            : 'componente desconocido'
        );
        const fallbackHint = (input.entities && input.entities.length > 0)
          ? input.entities[0]
          : 'manual tecnico';
        gap = {
          type:        'component',
          target:      fallbackTarget,
          reason:      'Información insuficiente para confirmar hipótesis',
          search_hint: fallbackHint,
        };
      }
    }

    return {
      output: {
        root_cause_hypothesis: typeof parsed.root_cause_hypothesis === 'string'
          ? parsed.root_cause_hypothesis
          : 'Análisis pendiente de más contexto.',
        confidence:            finalConfidence,
        requires_verification: isNonTroubleshooting ? false : parsed.requires_verification !== false,
        next_step:             typeof parsed.next_step === 'string' ? parsed.next_step : '',
        response_mode:         mode,
        needs_more_info:       needsMoreInfo,
        gap,
        thought_process:       typeof parsed.thought_process === 'string' ? parsed.thought_process : undefined,
      },
      totalTokens,
    };
  } catch (err) {
    console.error('[analista] Parse falló, usando failsafe:', (err as Error).message);
    return { output: ANALISTA_FAILSAFE, totalTokens: 0 };
  }
}

/**
 * Agente 2 — Analista v3 (Evaluador Estratégico con Gap Engine)
 * Modelo: gpt-4o-mini | temperature: 0.1
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
  modo:           'teorico' | 'procedimental' | 'diagnostico';
  componentMismatch?: boolean;
  rescueUsed?:       boolean;
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
  'EMERGENCY', 'TROUBLESHOOTING', 'LEARNING', 'QUICK_CONFIRM', 'AMBIGUOUS', 'DEEP_ANALYSIS',
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
): Promise<{ output: AnalistaOutput; totalTokens: number; usage?: { promptTokens: number; completionTokens: number } }> {

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

  const systemPrompt =
    `Eres el Agente Analista de Synapsis Go. Tu trabajo es interpretar el Ground Truth recuperado del RAG y producir un diagnóstico estructurado para el Ingeniero Jefe.

REGLA CRÍTICA — ANTI-REDIRECCIÓN:
NUNCA indiques que el técnico "consulte el capítulo X", "revise el menú Y" o "busque en la sección Z". Si el Ground Truth contiene una referencia cruzada, tú debes haberla resuelto internamente. Si el contenido no está disponible, declara una laguna real en 'missing_info'.

REGLA DE INTERPRETACIÓN DIRECTA:
- Si hay códigos de error (ej: 3 destellos rojos, E07, 0301): interpreta su significado técnico exacto.
- Si hay valores nominales (voltajes, resistencias, tiempos): extrae los números con unidades.
- Si hay procedimientos: enumera los pasos concretos, no digas "siga el procedimiento".
- Si hay múltiples hipótesis: ordénalas por probabilidad y justifica brevemente.

REGLA DE DOCUMENTOS BASE:
Si el Ground Truth contiene [DOCUMENTO BASE: ...]:
- La documentación específica del componente NO está disponible. Solo hay documentos genéricos.
- NO generes hipótesis específicas del componente que mencionó el usuario.
- NO menciones componentes que no estén en los documentos base.
- SÍ genera una hipótesis genérica de "alimentación" o "circuito de seguridad" basada en los documentos base.
- SÍ indica que se está aplicando protocolo de verificación base.

REGLA DE COBERTURA FACTUAL:
Antes de asignar confidence > 0.5, verifica internamente:
- ¿El groundTruth recuperado explica explícitamente lo que el usuario preguntó?
- ¿O solo menciona palabras relacionadas sin dar la respuesta?

Ejemplo de NO cobertura:
Pregunta: "¿Qué diferencia hay entre tracción 1:1 y 2:1?"
GroundTruth: ["Lubricar poleas de tracción cada 6 meses", "Verificar desgaste de cables en sistema de tracción"]
→ Esto NO explica 1:1 vs 2:1. Confidence debe ser < 0.4, needs_more_info: true.

Ejemplo de SÍ cobertura:
Pregunta: "¿Qué diferencia hay entre tracción 1:1 y 2:1?"
GroundTruth: ["En suspensión 1:1 el cable se une directamente a la cabina...", "En 2:1 la carga se divide por dos poleas..."]
→ Esto SÍ cubre. Confidence puede ser > 0.7.

OUTPUT JSON ESTRICTO:
{
  "root_cause_hypothesis": "string — interpretación directa del problema, con componente y valor anómalo",
  "confidence": 0.0-1.0,
  "requires_verification": boolean,
  "next_step": "string — acción inmediata específica",
  "response_mode": "EMERGENCY|TROUBLESHOOTING|LEARNING|QUICK_CONFIRM|DEEP_ANALYSIS",
  "needs_more_info": boolean,
  "gap": {
    "type": "component|error_code|measurement|procedure|location",
    "target": "string",
    "reason": "string",
    "search_hint": "string"
  } | null
}

RESTRICCIONES:
- 'root_cause_hypothesis' debe ser una sola oración con la causa raíz.
- Si 'needs_more_info' es true, 'gap' NO puede ser null.
- Si 'gap' es null, 'needs_more_info' debe ser false.`;

  const fallbackNote = (input.componentMismatch || input.rescueUsed)
    ? '⚠️ NOTA: La documentación recuperada NO corresponde al componente exacto del técnico. Se usan documentos base genéricos. NO generes hipótesis de componentes específicos (placas, códigos) que no aparezcan en los [DOCUMENTO BASE: ...].\n\n'
    : '';

  const userContent =
    `INTENT: ${input.intent}\n` +
    `SÍNTOMA: ${input.userQuery}\n` +
    `HISTORIAL: ${input.historyContext}\n` +
    `ITERACIÓN: ${input.loopIndex + 1}/3\n\n` +
    `${fallbackNote}` +
    `DOCUMENTACIÓN RECUPERADA:\n${input.groundTruth.slice(0, 8000)}\n\n` +
    (input.imageContext
      ? `EVIDENCIA VISUAL:\n${input.imageContext.slice(0, 1500)}\n\n`
      : 'EVIDENCIA VISUAL: Sin imágenes relevantes.\n\n') +
    '¿Cuál es la hipótesis de causa raíz y es suficiente la documentación?';

  try {
    const { text, usage } = await generateText({
      model:       openai('gpt-4o-mini'),
      temperature: 0.1,
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

    // BYPAS: el modo explícito de la UI determina el modo de respuesta
    if (input.modo === 'teorico' || input.modo === 'procedimental') {
      mode = 'LEARNING';
    } else if (input.modo === 'diagnostico') {
      // education_info → LEARNING (nunca DEEP_ANALYSIS)
      if (input.intent === 'education_info') {
        mode = 'LEARNING';
      } else if (confidence < 0.6 && mode !== 'EMERGENCY') {
        mode = 'DEEP_ANALYSIS';
      }
    }

    // ── BYPASS DE CONFIANZA: modo no-diagnóstico no penaliza confianza baja ──
    const isLearning = mode === 'LEARNING';
    const hasRelevantContext = input.entities && input.entities.length > 0
      ? input.entities.some(e => input.groundTruth.toLowerCase().includes(e.toLowerCase()))
      : input.groundTruth.trim().length > 800; // fallback: solo si hay texto sustancial

    let finalConfidence = confidence;
    let needsMoreInfo: boolean;
    let gap: GapDescriptor | null;

    if (isLearning && hasRelevantContext) {
      if (input.modo === 'teorico' || input.modo === 'procedimental') {
        // No penalizar confianza baja en modo teórico/procedimental
        // Si hay chunks relevantes, responder con lo que haya
        finalConfidence = Math.max(confidence, 0.7);
        needsMoreInfo   = !hasRelevantContext && confidence < 0.4;
        gap             = null;
      } else if (confidence >= 0.6) {
        finalConfidence = Math.max(confidence, 0.85);
        needsMoreInfo   = false;
        gap             = null;
      } else {
        // Respetar la incertidumbre del modelo
        finalConfidence = confidence;
        needsMoreInfo   = true;
        gap             = parseGap(parsed.gap) ?? {
          type: 'component',
          target: input.entities?.[0] ?? 'concepto técnico',
          reason: 'El LLM reportó baja confianza a pesar de chunks recuperados',
          search_hint: input.entities?.join(' ') ?? 'manual técnico específico',
        };
      }
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

    // [ELIMINADO] Heurística de términos exactos — demasiado rígida, genera falsos positivos masivos
    // La cobertura factual se evalúa ahora SOLO por el LLM vía prompt de sistema (REGLA DE COBERTURA FACTUAL)

    // ── SAFETY NET: solo para casos extremos de "no hay nada" ──
    {
      const groundTruthEmpty = input.groundTruth.trim().length < 150;
      const llmVeryUnsure = confidence < 0.3;

      if (groundTruthEmpty || llmVeryUnsure) {
        // CAMBIO: No forzar needs_more_info si hay contexto de entidades o modelo
        const hasSomeContext = input.entities && input.entities.length > 0;
        const isGenericSymptom = /detenido|intermitente|falla|no\s+funciona/i.test(input.userQuery);
        
        if (groundTruthEmpty && !hasSomeContext) {
          // Solo si NO hay nada y NO hay entidades, pedir más info
          finalConfidence = 0.2;
          needsMoreInfo = true;
          gap = {
            type: 'procedure',
            target: input.entities?.[0] ?? 'información técnica',
            reason: 'No se recuperó documentación sustancial del RAG',
            search_hint: input.entities?.join(' ') ?? 'manual técnico',
          };
        } else if (groundTruthEmpty && hasSomeContext) {
          // Hay entidades pero no chunks: responder con principios generales, NO pedir más info
          finalConfidence = 0.4;
          needsMoreInfo = false;  // ← CAMBIO CLAVE
          gap = null;
          // El Ingeniero Jefe usará root_cause_hypothesis + next_step con tono de "información limitada"
        } else {
          // llmVeryUnsure pero hay groundTruth: respetar la incertidumbre del modelo
          finalConfidence = confidence;
          needsMoreInfo = true;
          gap = parseGap(parsed.gap) ?? {
            type: 'component',
            target: input.entities?.[0] ?? 'componente desconocido',
            reason: 'El modelo reportó confianza extremadamente baja',
            search_hint: input.entities?.join(' ') ?? 'manual técnico',
          };
        }
      }
    }

    return {
      output: {
        root_cause_hypothesis: typeof parsed.root_cause_hypothesis === 'string'
          ? parsed.root_cause_hypothesis
          : 'Análisis pendiente de más contexto.',
        confidence:            finalConfidence,
        requires_verification: isLearning ? false : parsed.requires_verification !== false,
        next_step:             typeof parsed.next_step === 'string' ? parsed.next_step : '',
        response_mode:         mode,
        needs_more_info:       needsMoreInfo,
        gap,

      },
      totalTokens,
      usage: { promptTokens: usage.promptTokens ?? 0, completionTokens: usage.completionTokens ?? 0 },
    };
  } catch (err) {
    console.error('[analista] Parse falló, usando failsafe:', (err as Error).message);
    return { output: ANALISTA_FAILSAFE, totalTokens: 0 };
  }
}

/**
 * Agente 0 — Clarificador v2 (Analizador Semántico)
 * Modelo: gpt-4o-mini
 *
 * Filosofía nueva: NUNCA reescribe la query. Solo analiza.
 * La query original siempre llega intacta al Planificador.
 */
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export interface ClarifierOutput {
  is_ambiguous:       boolean;
  intent:             'troubleshooting' | 'education_info' | 'procedure' | 'emergency_protocol';
  entities:           string[];   // CN7, E07, SCIC, puerta, freno, 3300, etc.
  confidence:         number;     // 0.0–1.0 sobre el intent detectado
  use_original_query: boolean;    // siempre true si is_ambiguous = false
}

/* ── Failsafe ─────────────────────────────────────────────────────────────── */

const CLARIFIER_FAILSAFE: ClarifierOutput = {
  is_ambiguous:       false,
  intent:             'troubleshooting',
  entities:           [],
  confidence:         0.5,
  use_original_query: true,
};

/* ── Prompt ───────────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT =
  'Eres un analizador semántico para consultas de técnicos de ascensores.\n' +
  'Tu única función es analizar, NO reescribir ni mejorar la consulta.\n\n' +

  'REGLA MULTI-TURNO (prioridad ABSOLUTA — se evalúa antes que cualquier otra regla):\n' +
  'Si el campo "Historial reciente" contiene mensajes previos, el técnico está en el medio\n' +
  'de un diagnóstico en curso. En este caso:\n' +
  '  • is_ambiguous = false SIEMPRE, sin excepción.\n' +
  '  • El contexto del historial completa cualquier información que falte en el mensaje actual.\n' +
  '  • Infiere el intent a partir del historial (si el historial es troubleshooting, mantén troubleshooting).\n' +
  '  • Extrae entidades del mensaje ACTUAL más cualquier entidad clave que aparezca en el historial.\n\n' +

  'REGLA CRÍTICA — FALSOS POSITIVOS DE AMBIGÜEDAD (prioridad máxima):\n' +
  'Las siguientes consultas son SIEMPRE is_ambiguous = false, sin excepción:\n' +
  '  A) Extracción de valor nominal o especificación técnica:\n' +
  '     "¿cuál es la resistencia de...?", "¿qué voltaje tiene...?", "¿qué rango de...?"\n' +
  '  B) Ubicación física de un elemento:\n' +
  '     "¿dónde están las baterías?", "¿dónde se encuentra la HMI?", "¿dónde está el fusible?"\n' +
  '  C) Significado de código, abreviatura o estado:\n' +
  '     "¿qué significa E07?", "¿qué indica BatFlt?", "¿qué es KTC?"\n' +
  '  D) Pasos de un procedimiento del manual:\n' +
  '     "¿cómo se registran las LOP?", "¿cómo evacuo manualmente?", "pasos para calibrar..."\n' +
  '  E) Definición o concepto técnico:\n' +
  '     "¿qué es el SCIC?", "¿qué función tiene la TSU?"\n' +
  'Para los casos A–E, usa intent = "education_info" (A–C y E) o intent = "procedure" (D).\n\n' +

  'REGLAS GENERALES:\n' +
  '1. Nunca modifiques, parafrasees ni expandas la consulta original.\n' +
  '2. EXTRAE ENTIDADES QUIRÚRGICAS: Solo códigos de error (E07, F12), nombres de placas (SCIC, SMIC),\n' +
  '   componentes críticos (freno, variador, sensor) o series (3300, 5500).\n' +
  '3. IGNORA RUIDO: No extraigas palabras genéricas como "ascensor", "problema", "mantenimiento".\n' +
  '4. is_ambiguous = true SOLO si el técnico reporta un síntoma vago ("no funciona", "hace ruido",\n' +
  '   "no sube") SIN especificar código de error NI modelo del equipo.\n' +
  '5. use_original_query es siempre true si is_ambiguous es false.\n\n' +

  'Ejemplos is_ambiguous = false:\n' +
  '- "¿Qué significa el código 0020 en un 3300?"          → intent: education_info\n' +
  '- "¿Cuál es la resistencia de la bobina MGB?"          → intent: education_info\n' +
  '- "¿Dónde están las baterías en el Schindler 3300?"    → intent: education_info\n' +
  '- "¿Cómo registro las LOP en el Menú 40?"              → intent: procedure\n' +
  '- "Evacuación manual PEBO en el 5500, pasos"           → intent: procedure\n' +
  '- "SCIC del 3300 muestra E07 y las puertas no abren"   → intent: troubleshooting\n\n' +

  'Ejemplos is_ambiguous = true:\n' +
  '- "El ascensor no sube"          (síntoma sin código ni modelo)\n' +
  '- "Hay un problema con las puertas" (síntoma sin contexto)\n' +
  '- "Falla rara"                   (sin ningún dato técnico)\n\n' +

  'Devuelve SOLO JSON válido, sin texto adicional:\n' +
  '{\n' +
  '  "is_ambiguous": boolean,\n' +
  '  "intent": "troubleshooting" | "education_info" | "procedure" | "emergency_protocol",\n' +
  '  "entities": string[],\n' +
  '  "confidence": number,\n' +
  '  "use_original_query": boolean\n' +
  '}';

const VALID_INTENTS = new Set<string>([
  'troubleshooting', 'education_info', 'procedure', 'emergency_protocol',
]);

/* ── Función pública: resolveQuery ────────────────────────────────────────── */

/**
 * Regla de oro — lógica determinística fuera del LLM.
 * null   → pedir clarificación al técnico (query ambigua)
 * string → query que pasa al Planificador intacta (siempre la original)
 */
export function resolveQuery(
  original:  string,
  clarifier: ClarifierOutput,
): string | null {
  if (clarifier.is_ambiguous) return null;
  return original;
}

/* ── Agente principal ─────────────────────────────────────────────────────── */

export async function runClarifier(
  userQuery:      string,
  equipmentModel: string | null = null,
  historyContext: string        = '',
): Promise<ClarifierOutput> {
  try {
    const userContent =
      `Consulta del técnico: "${userQuery}"` +
      (equipmentModel ? `\nModelo de equipo en contexto: ${equipmentModel}` : '') +
      (historyContext  ? `\nHistorial reciente:\n${historyContext}`          : '');

    const { text } = await generateText({
      model:     openai('gpt-4o-mini'),
      maxTokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userContent   },
      ],
    });

    const stripped  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return CLARIFIER_FAILSAFE;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClarifierOutput & { intent: string }>;

    return {
      is_ambiguous:       typeof parsed.is_ambiguous === 'boolean' ? parsed.is_ambiguous : false,
      intent:             VALID_INTENTS.has(parsed.intent ?? '')
                            ? (parsed.intent as ClarifierOutput['intent'])
                            : 'troubleshooting',
      entities:           Array.isArray(parsed.entities)
                            ? (parsed.entities as unknown[]).filter((e): e is string => typeof e === 'string')
                            : [],
      confidence:         typeof parsed.confidence === 'number'
                            ? Math.min(1, Math.max(0, parsed.confidence))
                            : 0.5,
      use_original_query: true, // siempre true por spec
    };
  } catch (err) {
    console.error('[clarifier] Error, usando failsafe:', (err as Error).message);
    return CLARIFIER_FAILSAFE;
  }
}

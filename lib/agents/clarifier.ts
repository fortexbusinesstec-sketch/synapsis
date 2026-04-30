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
  intent:             'troubleshooting' | 'education_info' | 'emergency_protocol';
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
  `Eres un analizador semántico para consultas de técnicos de ascensores. Tu única función es analizar, NO reescribir ni expandir la consulta.

REGLAS:
1. NUNCA modifiques, parafrasees ni expandas la consulta original del técnico.
2. EXTRAE ENTIDADES QUIRÚRGICAS: códigos de error (E07, F12, 0301), nombres de placas (SCIC, SMIC, SCOP), componentes (KSKB, freno, variador) y modelos (3300, 5500).
3. 'is_ambiguous' = true SOLO si el técnico reporta un síntoma vago ("no funciona", "hace ruido", "falla algo") SIN especificar código de error NI modelo de equipo.
4. 'intent' = 'troubleshooting' | 'education_info' | 'emergency_protocol'.
5. 'use_original_query' = true siempre. Nunca reescribas la query para el embedding.

OUTPUT JSON:
{
  "is_ambiguous": boolean,
  "intent": "troubleshooting|education_info|emergency_protocol",
  "entities": ["string"],
  "confidence": 0.0-1.0,
  "use_original_query": true
}`;

const VALID_INTENTS = new Set<string>([
  'troubleshooting', 'education_info', 'emergency_protocol',
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

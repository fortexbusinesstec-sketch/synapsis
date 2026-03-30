/**
 * Agente 0 — Clarificador (Query Expander/Router)
 * Modelo: gpt-4o-mini
 *
 * Actúa como un Enriquecedor de Consultas Silencioso para mejorar la búsqueda vectorial.
 */
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';

export interface ClarificationResult {
  intent: 'troubleshooting' | 'education_info' | 'emergency_protocol';
  enriched_query: string;
}

function buildExpertPrompt(equipmentModel: string | null): string {
  const modelText = equipmentModel || 'General';

  return `Eres el Agente 0 de Synapsis Go, un sistema experto en ascensores multimarca. Tu objetivo es actuar como un optimizador de búsquedas semánticas y clasificador de intenciones en milisegundos, de forma invisible para el usuario.
Recibirás el mensaje del técnico. Tu tarea es:

Clasificar el intent (¿Es una falla de troubleshooting, una pregunta teórica de education_info, o una emergency_protocol?).

Generar una enriched_query: Si la consulta es detallada, mantenla y añade sinónimos técnicos clave. Si la consulta es vaga (ej. 'el ascensor no va'), expándela asumiendo un rol educativo (ej. 'Guía paso a paso para diagnóstico de ascensor detenido, revisión de serie de seguridades y alimentación'). Si es una emergencia (ej. 'gente atrapada'), expándela a 'Protocolo de rescate seguro y maniobra manual para pasajeros atrapados'. La enriched_query será usada para buscar en una base de datos vectorial de manuales, hazla descriptiva.

CONTEXTO:
Modelo de equipo: ${modelText}

FORMATO DE SALIDA (Responde SOLO JSON válido):
{
  "intent": "troubleshooting",
  "enriched_query": "string"
}`;
}

export async function runClarifier(
  userQuery:      string,
  equipmentModel: string | null,
): Promise<ClarificationResult | null> {
  try {
    const { text } = await generateText({
      model:     openai('gpt-4o-mini'),
      maxTokens: 600,
      messages: [
        { role: 'system', content: buildExpertPrompt(equipmentModel) },
        { role: 'user',   content: `Consulta del técnico: "${userQuery}"` },
      ],
    });

    const stripped  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ClarificationResult>;

    if (!parsed.intent || !parsed.enriched_query) {
      return null;
    }

    return parsed as ClarificationResult;
  } catch (err) {
    console.error('[clarifier] Error:', (err as Error).message);
    return null;
  }
}

/**
 * Agente 1 — Orchestrator
 * Modelo: gpt-4o-mini
 * Responsabilidad: Analizar las primeras páginas del documento y decidir
 * la estrategia de procesamiento óptima (complejidad visual, idioma, etc.)
 */
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface OrchestratorOutput {
  strategy:             'text_heavy' | 'image_heavy' | 'balanced';
  priority_pages:       number[];
  estimated_complexity: 'low' | 'medium' | 'high';
  language:             string;
}

const FALLBACK: OrchestratorOutput = {
  strategy:             'balanced',
  priority_pages:       [],
  estimated_complexity: 'medium',
  language:             'es',
};

export async function runOrchestrator(
  title:      string,
  docType:    string,
  firstPages: string[], // markdown de las primeras 2 páginas (post-OCR)
): Promise<{ data: OrchestratorOutput; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const preview = firstPages.slice(0, 2).join('\n\n---\n\n');

  const res = await openai.chat.completions.create({
    model:           'gpt-4o-mini',
    response_format: { type: 'json_object' },
    temperature:     0,
    messages: [
      {
        role:    'system',
        content:
          'Eres un arquitecto de análisis documental especializado en manuales técnicos de ascensores Schindler. ' +
          'Analiza el contenido y determina la estrategia de procesamiento óptima. ' +
          'Responde SOLO con JSON válido, sin texto adicional.',
      },
      {
        role: 'user',
        content:
          `Título: ${title}\nTipo de documento: ${docType}\n\n` +
          `Preview de las primeras páginas:\n${preview}\n\n` +
          `Devuelve exactamente este JSON:\n` +
          `{\n` +
          `  "strategy": "text_heavy" | "image_heavy" | "balanced",\n` +
          `  "priority_pages": [lista de números de página con contenido crítico, advertencias o esquemas],\n` +
          `  "estimated_complexity": "low" | "medium" | "high",\n` +
          `  "language": "es" | "en" | "de" | "fr"\n` +
          `}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content ?? '{}';
  const usage = {
    prompt_tokens:     res.usage?.prompt_tokens     ?? 0,
    completion_tokens: res.usage?.completion_tokens ?? 0,
  };

  try {
    const parsed = JSON.parse(raw) as Partial<OrchestratorOutput>;
    return {
      data: {
        strategy:             parsed.strategy             ?? FALLBACK.strategy,
        priority_pages:       parsed.priority_pages       ?? FALLBACK.priority_pages,
        estimated_complexity: parsed.estimated_complexity ?? FALLBACK.estimated_complexity,
        language:             parsed.language             ?? FALLBACK.language,
      },
      usage,
    };
  } catch {
    return { data: FALLBACK, usage };
  }
}

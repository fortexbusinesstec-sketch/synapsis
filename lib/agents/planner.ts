/**
 * Nodo 1 — Planificador v3 (Query Strategist con Gap Engine)
 * Modelo: gpt-4o-mini
 *
 * Genera un plan de búsqueda dual (texto + imagen).
 * Recibe SIEMPRE la query ORIGINAL del técnico — nunca la enriquecida.
 * En re-planificación usa GapDescriptor estructurado para queries quirúrgicas.
 */
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';
import type { GapDescriptor } from '@/lib/types/agents';

/* ── Tipos ────────────────────────────────────────────────────────────────── */

export interface SearchPlan {
  text_query:  string;
  image_query: string;
}

export interface SearchMemory {
  previous_queries:   string[];   // todas las queries ya ejecutadas (text + image)
  previous_chunk_ids: string[];   // todos los chunk_ids ya recuperados
}

export interface PlannerInput {
  query:        string;       // SIEMPRE la query original del técnico
  intent:       string;       // del Clarificador
  entities:     string[];     // del Clarificador — usados para filtros SQL
  loopIndex:    number;       // 0 = primera búsqueda | 1-2 = re-planificación
  analystFeedback?: {
    gap:        GapDescriptor; // descriptor estructurado del gap detectado
    confidence: number;
  };
  searchMemory?: SearchMemory;
}

/* ── Fallback determinístico ─────────────────────────────────────────────── */

export function defaultPlannerOutput(query: string, entities: string[] = []): SearchPlan {
  // Enriquecemos la query manteniendo la intención completa y natural del técnico
  const technicalCtx = entities.filter(e => e.length > 2).join(' ');
  const cleanedQuery = `${technicalCtx} ${query}`.trim();
  return { text_query: cleanedQuery, image_query: cleanedQuery };
}

/* ── Agente principal ─────────────────────────────────────────────────────── */

export async function runPlanner(
  input:          PlannerInput,
  equipmentModel?: string | null,
): Promise<SearchPlan> {
  const modelCtx = equipmentModel ? `Modelo de equipo: ${equipmentModel}` : 'Modelo: General';

  // REFACTOR: El Planificador ahora SOLO actúa en re-planificación (Loop 1+)
  // La búsqueda inicial (Loop 0) se realiza por bypass en el orquestador.
  if (!input.analystFeedback || !input.analystFeedback.gap) {
    console.warn('[planner] Llamado sin GapDescriptor. Usando bypass fallback.');
    return defaultPlannerOutput(input.query, input.entities);
  }

  const { gap, confidence } = input.analystFeedback;
  const hasMem = !!input.searchMemory && input.searchMemory.previous_queries.length > 0;

  const systemPrompt =
    'Eres el Planificador Quirúrgico de Synapsis Go. Tu único trabajo es resolver lagunas (Gaps) ' +
    'de información técnica detectadas por el Analista en ascensores Schindler.\n\n' +
    'REGLAS DE ORO (ESTRICTO):\n' +
    '1. ESTRICTAMENTE PROHIBIDO: emitir diagnósticos, hipótesis de causa raíz, conclusiones o recomendaciones de acción.\n' +
    '2. Tu única función es generar una QUERY SEMÁNTICA COMPLETA para recuperar el manual técnico pertinente.\n' +
    '3. Si el gap pide un valor, busca el procedimiento para medirlo, no intentes adivinar el valor.\n\n' +
    'FILOSOFÍA "RECALL FIRST":\n' +
    '1. Ya se hizo una búsqueda general que no bastó. Tu misión es el rescate quirúrgico.\n' +
    '2. Te centras en el "target" y el "search_hint" del Gap, pero mantienes la intención del síntoma original.\n' +
    '3. ENFOQUE JERÁRQUICO (Anti-Contaminación): Si el síntoma original o el historial mencionan un\n' +
    '   Código de Error (ej. Ovrload, BatFlt, 1514, E07) o de Menú (ej. CF98, CF00), tu searchQuery\n' +
    '   DEBE centrarse EXCLUSIVAMENTE en ese código y el modelo de equipo. Ignora síntomas genéricos\n' +
    '   como "no se mueve" o "se detiene" si hay un código presente, para evitar traer manuales irrelevantes.\n' +
    '4. Consulta la SearchMemory para NO REPETIR términos o estrategias fallidas.\n\n' +
    'FORMATO DE SALIDA (QUERIES SEMÁNTICAS):\n' +
    'BIEN: "Parámetros de calibración de pesacargas en Schindler 3300 con error Ovrload", "ajuste freno 5500 menú 40"\n' +
    'MAL:  "frenos" (muy genérico)\n\n' +
    'Devuelve un JSON válido:\n' +
    '{"text_query": "búsqueda para manuales", "image_query": "búsqueda para diagramas"}\n\n' +
    modelCtx;

  const prevQueriesStr = hasMem
    ? `\nBÚSQUEDAS PREVIAS (No repetir):\n${
        input.searchMemory!.previous_queries.map(q => `  - "${q}"`).join('\n')
      }\n`
    : '';

  const userContent =
    `OBJETIVO DEL GAP: "${gap.target}"\n` +
    `PISTA DE BÚSQUEDA: "${gap.search_hint}"\n` +
    `TIPO DE LAGUNA: ${gap.type}\n` +
    `SÍNTOMA ORIGINAL: ${input.query}\n` +
    prevQueriesStr +
    `\nGenera queries quirúrgicas para obtener la información necesaria para cerrar este Gap.`;

  try {
    const { text } = await generateText({
      model:     openai('gpt-4o-mini'),
      maxTokens: 250,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userContent  },
      ],
    });

    const stripped  = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<SearchPlan>;
    if (!parsed.text_query || !parsed.image_query) throw new Error('Estructura inválida');

    // Límite generoso para permitir riqueza semántica sin truncado agresivo
    return {
      text_query:  parsed.text_query.trim(),
      image_query: parsed.image_query.trim(),
    };
  } catch (err) {
    return defaultPlannerOutput(input.query, input.entities);
  }
}

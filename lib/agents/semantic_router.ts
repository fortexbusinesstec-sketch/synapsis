/**
 * Agente Enrutador Semántico — Knowledge Graph ligero pre-retrieval
 * Modelo: gpt-4o-mini
 * Responsabilidad: Extraer entidades físicas, marcas y componentes del reporte
 * del técnico para construir filtros SQL precisos ANTES de ejecutar el
 * vector search en Turso, reduciendo el espacio de búsqueda y mejorando la
 * precisión del Bibliotecario.
 *
 * Posición en el pipeline:
 *   Clarificador → [Enrutador Semántico] → Bibliotecario → Analista → Ingeniero Jefe
 */
import { generateObject } from 'ai';
import { openai }         from '@ai-sdk/openai';
import { z }              from 'zod';

/* ── Schema Zod ──────────────────────────────────────────────────────────── */

const FiltrosMetadatosSchema = z.object({
  marca: z
    .string()
    .nullable()
    .describe(
      'Marca del equipo mencionada explícitamente (ej: "Schindler", "Otis", "Kone"). ' +
      'null si no se menciona ninguna.',
    ),

  modelo: z
    .string()
    .nullable()
    .describe(
      'Modelo específico del equipo (ej: "3300", "5500", "MRL"). ' +
      'null si no se menciona o no se puede inferir con certeza.',
    ),

  codigo_error: z
    .string()
    .nullable()
    .describe(
      'Código de error o falla exacto mencionado por el técnico (ej: "E407", "F12", "Err 03"). ' +
      'null si no hay código explícito.',
    ),
});

export const SemanticRouterOutputSchema = z.object({
  filtros_metadatos: FiltrosMetadatosSchema
    .describe('Filtros derivados de entidades explícitas en el reporte. Solo valores mencionados — nunca inferidos.'),

  entidades_criticas: z
    .array(z.string())
    .describe(
      'Componentes físicos, placas, módulos o subsistemas mencionados en el reporte ' +
      '(ej: ["placa SCMAIN", "módulo SDIC", "encoder", "serie de seguridades"]). ' +
      'Vacío si no hay entidades identificables.',
    ),

  sintoma_resumido: z
    .string()
    .max(120)
    .describe(
      'Resumen técnico del síntoma en una frase corta, en tercera persona, sin datos inventados. ' +
      'Ejemplo: "Ascensor detenido en piso 3 con error E407 en módulo SDIC."',
    ),
});

export type SemanticRouterOutput  = z.infer<typeof SemanticRouterOutputSchema>;
export type FiltrosMetadatos      = z.infer<typeof FiltrosMetadatosSchema>;

/* ── System Prompt ───────────────────────────────────────────────────────── */

const SYSTEM_PROMPT =
  'Eres el Agente Enrutador Semántico de Synapsis Go. Recibes el reporte de falla de un técnico de ascensores ' +
  'y extraes entidades para construir filtros SQL y enriquecer la búsqueda vectorial.\n\n' +

  'REGLAS ABSOLUTAS:\n' +
  '1. SOLO extrae lo que el técnico menciona explícitamente. Nunca inferir, nunca inventar.\n' +
  '2. filtros_metadatos: Si el técnico no menciona la marca → null. Si no menciona el modelo → null. ' +
  '   Si no hay código de error → null. Un campo null es una respuesta correcta.\n' +
  '3. entidades_criticas: Lista los componentes físicos, placas electrónicas, módulos o subsistemas ' +
  '   mencionados por nombre. No incluyas síntomas abstractos ("falla intermitente") ni acciones ("revisar"). ' +
  '   Solo sustantivos técnicos concretos.\n' +
  '4. sintoma_resumido: Una sola frase técnica. Máximo 120 caracteres. Sin opinión, sin diagnóstico, ' +
  '   solo el hecho reportado.\n' +
  '5. Sé preciso con los códigos de error — "E407" y "error 407" son el mismo código: normaliza a "E407".\n' +
  '6. Si el reporte es ambiguo o incompleto, devuelve null en los campos que no tengan soporte textual.';

/* ── Agente principal ────────────────────────────────────────────────────── */

/**
 * Extrae entidades para filtros SQL y enriquecimiento del vector search.
 *
 * @param query  Reporte de falla del técnico (raw o ya enriquecido por el Clarificador).
 * @returns      Filtros SQL listos para inyectar y entidades para el Bibliotecario.
 *
 * @example
 * const { data } = await runSemanticRouter('Error E407 en SDIC, Schindler 3300, piso 3');
 * // data.filtros_metadatos.marca        → 'Schindler'
 * // data.filtros_metadatos.modelo       → '3300'
 * // data.filtros_metadatos.codigo_error → 'E407'
 * // data.entidades_criticas             → ['módulo SDIC']
 * // data.sintoma_resumido               → 'Ascensor Schindler 3300 detenido con error E407 en módulo SDIC.'
 */
export async function runSemanticRouter(
  query: string,
): Promise<{ data: SemanticRouterOutput; usage: { promptTokens: number; completionTokens: number } }> {
  const { object, usage } = await generateObject({
    model:       openai('gpt-4o-mini'),
    schema:      SemanticRouterOutputSchema,
    maxTokens:   300,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: `Reporte del técnico: "${query}"` },
    ],
  });

  return {
    data:  object,
    usage: {
      promptTokens:     usage.promptTokens,
      completionTokens: usage.completionTokens,
    },
  };
}

/* ── Helper: construir cláusula SQL desde los filtros ────────────────────── */

/**
 * Convierte los filtros del Enrutador en fragmentos SQL seguros para inyectar
 * en las queries del Bibliotecario.
 *
 * @example
 * const { sqlClause, args } = buildSqlFilters(data.filtros_metadatos);
 * // sqlClause → "AND d.brand = ? AND d.equipment_model = ?"
 * // args      → ['Schindler', '3300']
 */
export function buildSqlFilters(filtros: FiltrosMetadatos): {
  sqlClause: string;
  args:      string[];
} {
  const conditions: string[] = [];
  const args:       string[] = [];

  if (filtros.marca) {
    conditions.push('AND d.brand = ?');
    args.push(filtros.marca);
  }

  if (filtros.modelo) {
    conditions.push('AND d.equipment_model = ?');
    args.push(filtros.modelo);
  }

  return {
    sqlClause: conditions.join(' '),
    args,
  };
}

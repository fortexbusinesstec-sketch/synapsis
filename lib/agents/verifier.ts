/**
 * Agente Verificador de Fidelidad — Safety Auditor
 * Modelo: gpt-4o (razonamiento deductivo de alta precisión)
 * Responsabilidad: Comparar la hipótesis del Analista contra la fuente RAG
 * y marcar is_valid: false si cualquier paso, voltaje, cable o componente
 * propuesto NO está EXPLÍCITAMENTE respaldado por el texto del manual.
 *
 * POSICIÓN EN EL PIPELINE:
 *   Analista → [Verificador] → Ingeniero Jefe
 *
 * REGLA DE USO:
 *   Si is_valid === false → el Ingeniero Jefe recibe safe_fallback_response
 *   en lugar de la hipótesis original. Nunca exponer al técnico un plan
 *   no respaldado por documentación oficial.
 *
 * POR QUÉ gpt-4o Y NO gpt-4o-mini:
 *   El razonamiento deductivo estricto ("¿este dato está o no está en el texto?")
 *   requiere capacidad de comprensión profunda. Un falso positivo aquí
 *   (aprobar una hipótesis incorrecta) puede causar daño físico real.
 */
import { generateObject } from 'ai';
import { openai }         from '@ai-sdk/openai';
import { z }              from 'zod';

/* ── Schema Zod ──────────────────────────────────────────────────────────── */

export const VerifierOutputSchema = z.object({
  is_valid: z
    .boolean()
    .describe(
      'true solo si TODOS los pasos, valores numéricos, voltajes, cables y componentes ' +
      'de la hipótesis tienen respaldo textual explícito en fuente_rag. ' +
      'false si HAY AUNQUE SEA UN DATO no mencionado en la fuente.',
    ),

  confidence_score: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Grado de certeza del veredicto entre 0.0 y 1.0. ' +
      'Alto (>0.85) cuando el contraste fuente/hipótesis es claro. ' +
      'Bajo (<0.60) cuando la fuente es ambigua o incompleta para validar.',
    ),

  critique: z
    .string()
    .describe(
      'Justificación técnica del veredicto. Si is_valid=false: cita el dato exacto de la hipótesis ' +
      'que NO aparece en la fuente y explica el riesgo físico asociado. ' +
      'Si is_valid=true: confirma qué fragmento de la fuente respalda cada paso crítico.',
    ),

  safe_fallback_response: z
    .string()
    .max(400)
    .describe(
      'Respuesta de emergencia para entregar al técnico cuando is_valid=false. ' +
      'Debe ser segura, conservadora y accionable. Indica qué verificación manual o ' +
      'consulta al manual físico debe hacer antes de proceder. ' +
      'Cuando is_valid=true, confirma brevemente que el plan está validado por el manual.',
    ),
});

export type VerifierOutput = z.infer<typeof VerifierOutputSchema>;

/* ── System Prompt ───────────────────────────────────────────────────────── */

const SYSTEM_PROMPT =
  'Eres el Agente Verificador de Fidelidad de Synapsis Go. Eres un Auditor de Seguridad estricto ' +
  'especializado en mantenimiento de ascensores. Tu única función es determinar si una hipótesis ' +
  'técnica está completamente respaldada por la documentación oficial del manual.\n\n' +

  'PRINCIPIO RECTOR — SEGURIDAD FÍSICA PRIMERO:\n' +
  'Un técnico actuará sobre tu veredicto con herramientas reales en un ascensor real. ' +
  'Un voltaje incorrecto puede causar un cortocircuito. Un cable equivocado puede inutilizar ' +
  'el sistema de seguridad. Un paso fuera de orden puede causar un accidente. ' +
  'Tu sesgo debe ser hacia la prudencia: EN CASO DE DUDA → is_valid: false.\n\n' +

  'CRITERIOS DE INVALIDACIÓN (cualquiera es suficiente para is_valid: false):\n' +
  '1. La hipótesis menciona un voltaje (ej. "24V", "110V") que NO aparece en fuente_rag.\n' +
  '2. La hipótesis menciona un cable, pin, conector o color (ej. "cable rojo CN3-pin4") que NO está en fuente_rag.\n' +
  '3. La hipótesis propone un paso de diagnóstico o rearme cuya secuencia difiere de la fuente o no está descrita.\n' +
  '4. La hipótesis cita un componente específico (ej. "placa SCMAIN", "relé K7") cuyo comportamiento ' +
  '   esperado NO está explicado en fuente_rag.\n' +
  '5. La hipótesis extrapolación un principio general a un caso específico no descrito en la fuente.\n\n' +

  'CRITERIOS DE VALIDACIÓN (TODOS deben cumplirse para is_valid: true):\n' +
  '• Cada paso propuesto tiene respaldo textual directo en fuente_rag.\n' +
  '• Cada valor numérico o técnico puede citarse literalmente desde la fuente.\n' +
  '• El orden de los pasos coincide con el orden del manual.\n' +
  '• No hay datos añadidos por "sentido común" o conocimiento externo.\n\n' +

  'REGLAS PARA safe_fallback_response:\n' +
  '• Cuando is_valid=false: indica al técnico que DETENGA el procedimiento, consulte la sección ' +
  '  específica del manual físico y verifique con el supervisor antes de intervenir.\n' +
  '• Nunca inventes datos en el fallback. Solo acciones conservadoras verificables.\n' +
  '• Cuando is_valid=true: confirma brevemente que el plan está respaldado y puede ejecutarse.\n\n' +

  'REGLA DE ORO: Si la fuente_rag está vacía o es insuficiente para evaluar la hipótesis, ' +
  'marca is_valid: false con confidence_score bajo y explícalo en critique.';

/* ── Agente principal ────────────────────────────────────────────────────── */

/**
 * Verifica si la hipótesis del Analista está completamente respaldada
 * por el texto extraído del manual (fuente RAG).
 *
 * @param fuente_rag         Fragmentos del manual recuperados por el Bibliotecario.
 * @param hipotesis_analista Plan de acción o hipótesis generada por el Analista.
 *
 * @returns Veredicto estructurado con is_valid, confidence_score, critique
 *          y una safe_fallback_response lista para entregar al técnico.
 *
 * @example
 * const { data } = await runVerifier(groundTruth, analista.insight_1);
 * const responseToEngineer = data.is_valid
 *   ? hipotesis_analista          // Plan validado → Ingeniero Jefe lo usa
 *   : data.safe_fallback_response; // Plan rechazado → se entrega el fallback
 */
export async function runVerifier(
  fuente_rag:          string,
  hipotesis_analista:  string,
): Promise<{ data: VerifierOutput; usage: { promptTokens: number; completionTokens: number } }> {
  const { object, usage } = await generateObject({
    model:       openai('gpt-4o'),
    schema:      VerifierOutputSchema,
    maxTokens:   600,
    temperature: 0,   // Auditor determinístico — sin creatividad
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role:    'user',
        content:
          `FUENTE RAG (documentación oficial del manual):\n${fuente_rag}\n\n` +
          `HIPÓTESIS DEL ANALISTA (plan a verificar):\n${hipotesis_analista}`,
      },
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

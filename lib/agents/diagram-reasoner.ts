/**
 * Agente 4.5 — DiagramReasoner
 * Modelo: gpt-4o-mini | temperature: 0
 *
 * Transforma la descripción libre de un diagrama (salida de vision.ts) en
 * conocimiento lógico estructurado para que el RAG pueda razonar sobre
 * fallos eléctricos en ascensores Schindler.
 *
 * Solo se invoca cuando vision.ts clasifica la imagen como 'diagram' o 'schematic'.
 *
 * Salida: JSON determinista con componentes, conexiones, lógica de control,
 * dependencias y modos de fallo → se inyecta en el markdown del chunker como:
 *
 *   ## DIAGRAM STRUCTURED KNOWLEDGE
 *   { ... }
 *
 *   ## DIAGRAM SUMMARY
 *   <texto>
 */
import OpenAI from 'openai';
import type { ImageResult } from '@/lib/agents/vision';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL = 'gpt-4o-mini';

/* ── Tipos públicos ─────────────────────────────────────────────────────── */

export interface DiagramReasonerInput {
  pageNumber:      number;
  imageId:         string;
  description:     string;   // texto libre de vision.ts
  markdownContext: string;   // markdown de la página (post-OCR)
}

export interface DiagramComponent {
  id:     string;
  type:   string;
  label?: string;
}

export interface DiagramConnection {
  from: string;
  to:   string;
  type: string;   // "control" | "power" | "signal" | "safety" | "mechanical"
}

export interface ControlLogicEntry {
  condition: string;
  action:    string;
  result:    string;
}

export interface DiagramReasonerOutput {
  system_type:   'traction' | 'door' | 'safety' | 'unknown';
  components:    DiagramComponent[];
  connections:   DiagramConnection[];
  control_logic: ControlLogicEntry[];
  dependencies:  [string, string][];
  failure_modes: string[];
  summary:       string;
}

/* ── Guard: solo diagramas y esquemas pasan por aquí ───────────────────── */

export function isDiagramEligible(result: ImageResult): boolean {
  return result.type === 'diagram' || result.type === 'schematic';
}

/* ── Constante de respuesta vacía (cuando no hay suficiente información) ── */

const EMPTY_OUTPUT: DiagramReasonerOutput = {
  system_type:   'unknown',
  components:    [],
  connections:   [],
  control_logic: [],
  dependencies:  [],
  failure_modes: [],
  summary:       '',
};

/* ── Agente principal ───────────────────────────────────────────────────── */

export async function runDiagramReasoner(
  input: DiagramReasonerInput,
): Promise<{
  data:  DiagramReasonerOutput | null;
  usage: { prompt_tokens: number; completion_tokens: number };
}> {
  const emptyUsage = { prompt_tokens: 0, completion_tokens: 0 };

  // Rechazo anticipado: descripción demasiado corta para razonar
  if (!input.description || input.description.trim().length < 20) {
    console.log(
      `[diagram-reasoner] Descripción insuficiente, omitiendo img:${input.imageId}`,
    );
    return { data: null, usage: emptyUsage };
  }

  const systemPrompt =
    `Eres un ingeniero especialista en sistemas de control de ascensores Schindler.\n` +
    `Recibes la descripción textual de un diagrama técnico y el contexto de la página.\n\n` +
    `Tu tarea es extraer conocimiento lógico estructurado para un sistema RAG de diagnóstico.\n\n` +
    `REGLAS ESTRICTAS:\n` +
    `1. Solo incluye componentes que estén EXPLÍCITAMENTE mencionados en la descripción.\n` +
    `2. No halucines componentes, conexiones ni lógica que no estén en el texto.\n` +
    `3. Si no hay suficiente información para rellenar un campo, déjalo como array vacío.\n` +
    `4. Los IDs de componentes deben ser los identificadores reales del diagrama (K1, M1, SCIC, etc.).\n` +
    `5. system_type: "traction" si hay motor/variador/ACVF; "door" si hay motor de puerta/DZS;\n` +
    `   "safety" si hay cadena de seguridad/KSE/SIS; "unknown" en cualquier otro caso.\n` +
    `6. En control_logic: condición → acción → resultado (máximo 10 entradas).\n` +
    `7. En failure_modes: lista de fallos realistas basados en los componentes detectados.\n` +
    `8. Responde SOLO con JSON estricto. Sin texto adicional. Sin bloques de código.\n\n` +
    `Estructura de salida:\n` +
    `{\n` +
    `  "system_type": "traction"|"door"|"safety"|"unknown",\n` +
    `  "components": [{ "id": string, "type": string, "label": string? }],\n` +
    `  "connections": [{ "from": string, "to": string, "type": "control"|"power"|"signal"|"safety"|"mechanical" }],\n` +
    `  "control_logic": [{ "condition": string, "action": string, "result": string }],\n` +
    `  "dependencies": [[componentA, componentB]],\n` +
    `  "failure_modes": [string],\n` +
    `  "summary": string\n` +
    `}`;

  const userPrompt =
    `DESCRIPCIÓN DEL DIAGRAMA (página ${input.pageNumber}, imagen ${input.imageId}):\n` +
    `${input.description.slice(0, 2000)}\n\n` +
    `CONTEXTO DE LA PÁGINA (markdown):\n` +
    `${input.markdownContext.slice(0, 1000)}\n\n` +
    `Extrae el conocimiento estructurado siguiendo las reglas del sistema.`;

  try {
    const res = await openai.chat.completions.create({
      model:           MODEL,
      temperature:     0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
    });

    const usage = {
      prompt_tokens:     res.usage?.prompt_tokens     ?? 0,
      completion_tokens: res.usage?.completion_tokens ?? 0,
    };

    const raw = res.choices[0]?.message?.content ?? '{}';

    let parsed: Partial<DiagramReasonerOutput>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error(`[diagram-reasoner] JSON inválido img:${input.imageId}`);
      return { data: null, usage };
    }

    // Validación y coerción defensiva
    const validSystemTypes = new Set(['traction', 'door', 'safety', 'unknown']);
    const system_type = validSystemTypes.has(parsed.system_type as string)
      ? (parsed.system_type as DiagramReasonerOutput['system_type'])
      : 'unknown';

    const output: DiagramReasonerOutput = {
      system_type,
      components:    Array.isArray(parsed.components)    ? parsed.components.filter(isValidComponent)    : [],
      connections:   Array.isArray(parsed.connections)   ? parsed.connections.filter(isValidConnection)  : [],
      control_logic: Array.isArray(parsed.control_logic) ? parsed.control_logic.filter(isValidLogicEntry) : [],
      dependencies:  Array.isArray(parsed.dependencies)  ? parsed.dependencies.filter(isValidDependency) as [string, string][] : [],
      failure_modes: Array.isArray(parsed.failure_modes) ? parsed.failure_modes.filter((f): f is string => typeof f === 'string') : [],
      summary:       typeof parsed.summary === 'string'  ? parsed.summary : '',
    };

    // Verificación de calidad mínima — al menos un componente o una entrada de lógica
    if (output.components.length === 0 && output.control_logic.length === 0) {
      console.log(
        `[diagram-reasoner] Sin componentes ni lógica extraída img:${input.imageId}`,
      );
      return { data: EMPTY_OUTPUT, usage };
    }

    console.log(
      `[diagram-reasoner] img:${input.imageId} | system:${output.system_type} | ` +
      `${output.components.length} componentes | ${output.control_logic.length} lógicas | ` +
      `${output.failure_modes.length} failure modes`,
    );

    return { data: output, usage };

  } catch (err) {
    console.error(
      `[diagram-reasoner] Error img:${input.imageId}:`,
      err instanceof Error ? err.message : err,
    );
    return { data: null, usage: emptyUsage };
  }
}

/* ── Validadores de forma ───────────────────────────────────────────────── */

function isValidComponent(c: unknown): c is DiagramComponent {
  return (
    typeof c === 'object' && c !== null &&
    typeof (c as any).id   === 'string' && (c as any).id.trim().length > 0 &&
    typeof (c as any).type === 'string' && (c as any).type.trim().length > 0
  );
}

function isValidConnection(c: unknown): c is DiagramConnection {
  return (
    typeof c === 'object' && c !== null &&
    typeof (c as any).from === 'string' && (c as any).from.trim().length > 0 &&
    typeof (c as any).to   === 'string' && (c as any).to.trim().length > 0 &&
    typeof (c as any).type === 'string'
  );
}

function isValidLogicEntry(e: unknown): e is ControlLogicEntry {
  return (
    typeof e === 'object' && e !== null &&
    typeof (e as any).condition === 'string' &&
    typeof (e as any).action    === 'string' &&
    typeof (e as any).result    === 'string'
  );
}

function isValidDependency(d: unknown): d is [string, string] {
  return (
    Array.isArray(d) && d.length === 2 &&
    typeof d[0] === 'string' && typeof d[1] === 'string'
  );
}

/* ── Serialización para inyectar en el markdown del chunker ─────────────── */

/**
 * Convierte la salida del DiagramReasoner en los dos bloques markdown
 * que se inyectan al final del contenido de la página antes del chunker.
 *
 * Formato esperado:
 *   ## DIAGRAM STRUCTURED KNOWLEDGE
 *   ```json
 *   { ... }
 *   ```
 *
 *   ## DIAGRAM SUMMARY
 *   <texto>
 */
export function serializeDiagramKnowledge(
  output: DiagramReasonerOutput,
  imageId: string,
): string {
  if (!output || (output.components.length === 0 && output.summary === '')) {
    return '';
  }

  const jsonBlock = JSON.stringify(output, null, 2);
  const summary   = output.summary.trim();

  return (
    `\n\n## DIAGRAM STRUCTURED KNOWLEDGE\n\n` +
    `<!-- imageId: ${imageId} -->\n` +
    `\`\`\`json\n${jsonBlock}\n\`\`\`\n\n` +
    `## DIAGRAM SUMMARY\n\n` +
    `${summary}`
  );
}

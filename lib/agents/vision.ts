/**
 * Agente 3 — Vision / Smart Filter
 * Enrutador LLM Asimétrico (3 rutas):
 *
 *   RUTA 1  VectorScanner → GPT-4o directo
 *           Si la imagen viene del VectorScanner es por definición un
 *           diagrama técnico complejo → saltarse Pixtral, ir a GPT-4o.
 *
 *   RUTA 2  OCR raster → Pixtral triaje → escalado según capa
 *           Capa 1 → descartar. Capa 2 → re-analizar con GPT-4o.
 *           Capa 3 → guardar con resultado de Pixtral directamente.
 *
 *   RUTA 3  Páginas técnicas sin imágenes → VectorScanner (otro agente)
 *
 * FinOps:
 *   Pixtral  $0.15 / 1M tokens  (triaje masivo, barato)
 *   GPT-4o   $2.50 / 1M tokens  (análisis profundo, solo en imágenes valiosas)
 */
import { Mistral }     from '@mistralai/mistralai';
import { generateText } from 'ai';
import { openai }      from '@ai-sdk/openai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

/* ── Tipos base ─────────────────────────────────────────────────────────── */

export type ImageType =
  | 'diagram'
  | 'schematic'
  | 'flow'
  | 'layout'
  | 'graph'
  | 'warning'
  | 'table'
  | 'photo'
  | 'decorative'
  | 'cover'
  | 'logo';

export type StructureType =
  | 'electrical'
  | 'communication'
  | 'mechanical'
  | 'layout'
  | 'flow'
  | 'architecture'
  | 'table'
  | 'unknown';

export interface StructuralComponent {
  id:   string;
  type: 'relay' | 'motor' | 'cpu' | 'sensor' | 'module' | 'node' | 'block' | 'unknown';
}

export interface StructuralConnection {
  from: string;
  to:   string;
  type: 'electrical' | 'logic' | 'bus' | 'mechanical' | 'spatial' | 'unknown';
}

export interface StructuralAnalysis {
  structure_type: StructureType;
  components:     StructuralComponent[];
  connections:    StructuralConnection[];
  flows:          string[];
  relationships:  string[];
  zones:          string[];
}

/** Salida del triaje Pixtral — clasificación + análisis estructural opcional */
export interface VisionOutput {
  type:                 ImageType;
  confidence:           number;             // 0.0–1.0 (certeza de clasificación)
  classification_layer: 1 | 2 | 3;         // 1=blacklist, 2=whitelist, 3=zona gris
  description:          string;
  has_warning:          boolean;
  technical_elements:   string[];
  structural_analysis:  StructuralAnalysis | null;
}

/** Contexto de página para inyección de markdown */
export interface PageContext {
  prev?:    string;
  current:  string;
  next?:    string;
}

/** Imagen de entrada al router */
export interface ImageInput {
  id:          string;
  imageBase64: string;
  metadata?:   string;   // JSON con { source: 'vector_scanner' } si viene del VS
}

/** Resultado final del router — incluye proveniencia y uso de tokens */
export interface ImageResult {
  type:                 ImageType;
  confidence:           number;
  description:          string;
  has_warning:          boolean;
  technical_elements:   string[];
  connections?:         string[];       // solo GPT-4o
  electrical_values?:   string[];       // solo GPT-4o
  visionModel:          'gpt-4o' | 'pixtral-12b';
  route:                'vector_scanner' | 'escalated_from_pixtral' | 'pixtral_direct';
  classification_layer: 1 | 2 | 3;
  usage: {
    pixtral_tokens: number;
    gpt4o_tokens:   number;
  };
}

/* ── Tipos que requieren análisis estructural ───────────────────────────── */

/** Tipos que requieren análisis estructural (si Pixtral los detecta) */
const STRUCTURAL_TYPES = new Set<ImageType>(['diagram', 'schematic', 'flow', 'layout', 'graph', 'table']);

/* ── PIXTRAL — Clasificación + Análisis Estructural ────────────────────── */

export async function analyzeImage(
  imageBase64: string,
  context: PageContext,
): Promise<{ data: VisionOutput | null; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const hasPrefix = imageBase64.includes(';base64,');
  const dataUrl   = hasPrefix ? imageBase64 : `data:image/png;base64,${imageBase64}`;

  const contextText = [
    context.prev    ? `### Página anterior:\n${context.prev.slice(0, 800)}`    : null,
    `### Página actual:\n${context.current.slice(0, 1200)}`,
    context.next    ? `### Página siguiente:\n${context.next.slice(0, 800)}`   : null,
  ].filter(Boolean).join('\n\n');

  const prompt =
    `Eres un ingeniero experto en ascensores Schindler, electrónica industrial y sistemas de control.\n` +
    `Analiza esta imagen extraída de un documento técnico.\n\n` +
    `Tu tarea tiene DOS FASES:\n` +
    `1. Clasificación (capas 1–3)\n` +
    `2. Análisis estructural (si aplica)\n\n` +
    `---\n\n` +
    `CONTEXTO DE LAS PÁGINAS CIRCUNDANTES:\n\n` +
    `${contextText}\n\n` +
    `---\n\n` +
    `SISTEMA DE CLASIFICACIÓN EN 3 CAPAS:\n\n` +
    `CAPA 1 — BLACKLIST ABSOLUTA (classification_layer: 1, descartar SIEMPRE):\n` +
    `- Logotipo corporativo sin elementos técnicos\n` +
    `- Página en blanco\n` +
    `- Fotografía decorativa sin diagramas\n` +
    `- Mano señalando sin equipo técnico visible\n` +
    `- Flecha decorativa aislada\n` +
    `- Persona sin equipo técnico\n` +
    `- Texto puro sin gráficos\n` +
    `- Imagen ornamental o portada\n\n` +
    `CAPA 2 — WHITELIST TÉCNICA (classification_layer: 2, conservar SIEMPRE):\n` +
    `Cualquier imagen que contenga:\n` +
    `- Diagramas eléctricos, esquemas de control, bloques funcionales\n` +
    `- Grafos de comunicación (CAN, LON), diagramas de flujo\n` +
    `- Arquitectura de sistema, plano de ascensor, layout de gabinete\n` +
    `- Cableado, topología de red, tabla técnica con estructura visual\n` +
    `- Esquema mecánico, hidráulico, de puertas o de tracción\n` +
    `O que contenga siglas técnicas como:\n` +
    `SCIC, SMIC, SDIC, GCIO, ACVF, KSE, KNE, KSS, KTC, KTS, KTZ, PHS, PHUET, JHC,\n` +
    `SIS, SGRW, RKPH, SIH, JH, KTHM, CAN, LON, COP, LOP, SCOP, SMLCD, HMI, DBV,\n` +
    `TIC, HTIC, BIO, GSV, MGB, VCA, SCPOW, PDM, Variodyn, Yaskawa, VF122BR,\n` +
    `ASIX, LONIC, NWIOC, NWIOE, CIM, LIM, SNGL, BIM, SEM, SLIN, LCUX,\n` +
    `M1, M2, K1, K2, y formatos de código de plano como 220_000..., K 612089..., EJ 4141...\n\n` +
    `CAPA 3 — ZONA GRIS (classification_layer: 3): todo lo que no sea Capa 1 ni Capa 2.\n\n` +
    `---\n\n` +
    `ANÁLISIS ESTRUCTURAL (OBLIGATORIO si type = "diagram" | "schematic" | "flow" | "layout" | "graph" | "table")\n\n` +
    `TIPOS DE ESTRUCTURAS POSIBLES: electrical | communication | mechanical | layout | flow | architecture | table | unknown\n\n` +
    `Identifica:\n` +
    `COMPONENTES: placas, relés, motores, sensores, módulos, puertas, cabina, variador, CPU, IO, nodos\n` +
    `CONEXIONES: líneas eléctricas, flechas, buses, cables — cada una con from/to/type\n` +
    `RELACIONES: "A controla B", "A alimenta B", "A comunica con B", "A depende de B"\n` +
    `FLUJOS: eléctrico, lógico, mecánico, comunicación, datos\n` +
    `ZONAS: cabina, cuarto de máquinas, control, foso, etc.\n\n` +
    `REGLAS DE INTERPRETACIÓN:\n` +
    `- Las líneas representan conexiones; las flechas representan flujo o dirección\n` +
    `- Las cajas representan módulos; las etiquetas representan componentes\n` +
    `- La proximidad espacial indica relación; los planos indican relaciones físicas\n` +
    `- NO ignorar: líneas finas, punteadas, buses horizontales, flechas pequeñas, conexiones indirectas\n\n` +
    `---\n\n` +
    `RESPONDE SOLO CON JSON ESTRICTO (sin texto adicional, sin bloques de código):\n` +
    `{\n` +
    `  "type": "diagram"|"schematic"|"flow"|"layout"|"graph"|"warning"|"table"|"photo"|"decorative"|"logo",\n` +
    `  "confidence": <0.0–1.0>,\n` +
    `  "classification_layer": <1|2|3>,\n` +
    `  "description": "<descripción técnica breve>",\n` +
    `  "has_warning": <true|false>,\n` +
    `  "technical_elements": ["siglas y etiquetas visibles en la imagen; [] si ninguna"],\n` +
    `  "structural_analysis": {\n` +
    `    "structure_type": "electrical"|"communication"|"mechanical"|"layout"|"flow"|"architecture"|"table"|"unknown",\n` +
    `    "components": [{"id": "etiqueta", "type": "relay"|"motor"|"cpu"|"sensor"|"module"|"node"|"block"|"unknown"}],\n` +
    `    "connections": [{"from": "A", "to": "B", "type": "electrical"|"logic"|"bus"|"mechanical"|"spatial"|"unknown"}],\n` +
    `    "flows": ["texto corto describiendo flujo"],\n` +
    `    "relationships": ["A controla B"],\n` +
    `    "zones": ["cabina", "cuarto de maquinas"]\n` +
    `  }\n` +
    `}\n\n` +
    `REGLAS FINALES:\n` +
    `- Si no es diagrama/schematic/flow/layout/graph/table → structural_analysis = null\n` +
    `- No inventar componentes; solo los visibles en la imagen\n` +
    `- Seguir líneas visualmente; usar etiquetas visibles\n` +
    `- Ser conservador si no es claro\n` +
    `- JSON válido únicamente`;

  try {
    const res = await mistral.chat.complete({
      model: 'pixtral-12b-2409',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', imageUrl: { url: dataUrl } },
          { type: 'text',      text: prompt },
        ],
      }],
    });

    const raw = typeof res.choices?.[0]?.message?.content === 'string'
      ? res.choices[0].message.content : '';

    const usage = {
      prompt_tokens:     (res.usage as any)?.promptTokens     ?? 0,
      completion_tokens: (res.usage as any)?.completionTokens ?? 0,
    };

    const stripped = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { data: null, usage };

    const parsed = JSON.parse(jsonMatch[0]) as Partial<VisionOutput>;
    const parsedType = (parsed.type ?? 'decorative') as ImageType;

    // Validar structural_analysis solo si el tipo lo requiere
    const rawSA = (parsed as any).structural_analysis;
    let structuralAnalysis: StructuralAnalysis | null = null;

    if (STRUCTURAL_TYPES.has(parsedType) && rawSA && typeof rawSA === 'object') {
      structuralAnalysis = {
        structure_type: rawSA.structure_type ?? 'unknown',
        components:     Array.isArray(rawSA.components)    ? rawSA.components    : [],
        connections:    Array.isArray(rawSA.connections)   ? rawSA.connections   : [],
        flows:          Array.isArray(rawSA.flows)         ? rawSA.flows         : [],
        relationships:  Array.isArray(rawSA.relationships) ? rawSA.relationships : [],
        zones:          Array.isArray(rawSA.zones)         ? rawSA.zones         : [],
      };
    }

    return {
      data: {
        type:                 parsedType,
        confidence:           parsed.confidence           ?? 0,
        classification_layer: ([1, 2, 3].includes(parsed.classification_layer as number)
                                ? parsed.classification_layer : 3) as 1 | 2 | 3,
        description:          parsed.description          ?? '',
        has_warning:          parsed.has_warning          ?? false,
        technical_elements:   Array.isArray(parsed.technical_elements)
                                ? (parsed.technical_elements as unknown[]).filter((e): e is string => typeof e === 'string')
                                : [],
        structural_analysis:  structuralAnalysis,
      },
      usage,
    };
  } catch (err) {
    console.error('[vision] Pixtral falló:', err instanceof Error ? err.message : err);
    return { data: null, usage: { prompt_tokens: 0, completion_tokens: 0 } };
  }
}

/* ── GPT-4o — Análisis profundo ─────────────────────────────────────────── */

interface GPT4oRawOutput {
  type:               ImageType;
  description:        string;
  technical_elements: string[];
  connections:        string[];
  electrical_values:  string[];
  safety_relevant:    boolean;
  confidence:         number;
}

async function analyzeWithGPT4o(
  image:       ImageInput,
  pageContext: PageContext,
  route:       'vector_scanner' | 'escalated_from_pixtral',
  pixtralHint?: VisionOutput,
): Promise<ImageResult | null> {
  const hasPrefix = image.imageBase64.includes(';base64,');
  const dataUrl   = hasPrefix
    ? image.imageBase64
    : `data:image/png;base64,${image.imageBase64}`;

  const hintSection = pixtralHint
    ? `\nANÁLISIS PREVIO DEL TRIAJE (usa como contexto adicional):\n` +
      `- Tipo detectado: ${pixtralHint.type}\n` +
      `- Elementos identificados: ${pixtralHint.technical_elements.join(', ')}\n` +
      `- Descripción preliminar: ${pixtralHint.description}\n`
    : '';

  const systemPrompt =
    `Eres un Ingeniero Especialista en sistemas de control de ascensores Schindler.\n` +
    `Recibes imágenes de diagramas técnicos complejos para análisis profundo.\n\n` +
    `Tu tarea es extraer TODA la información técnica visible:\n` +
    `1. Identifica cada componente y su función en el sistema\n` +
    `2. Describe todas las conexiones y flujos de señal entre componentes\n` +
    `3. Lee todos los códigos, referencias y etiquetas visibles\n` +
    `4. Explica qué hace este diagrama en el contexto del ascensor\n` +
    `5. Si hay valores eléctricos (voltajes, frecuencias, resistencias), recítalos\n\n` +
    `Responde en JSON estricto sin markdown:\n` +
    `{\n` +
    `  "type": "diagram"|"schematic"|"flow"|"layout"|"graph"|"warning"|"table"|"photo",\n` +
    `  "description": "<descripción técnica exhaustiva en español, mínimo 100 palabras>",\n` +
    `  "technical_elements": ["siglas", "y", "componentes"],\n` +
    `  "connections": ["LDU conecta con ACVF via bus CAN", ...],\n` +
    `  "electrical_values": ["24VDC alimentación HCU", ...],\n` +
    `  "safety_relevant": true|false,\n` +
    `  "confidence": 0.95\n` +
    `}`;

  const userPrompt =
    `CONTEXTO DE LA PÁGINA (markdown del manual):\n` +
    `${pageContext.current.slice(0, 1500)}` +
    hintSection +
    `\nAnaliza este diagrama técnico con máxima profundidad.`;

  try {
    const { text, usage } = await generateText({
      model:     openai('gpt-4o'),
      maxTokens: 800,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image', image: dataUrl },
            { type: 'text',  text: userPrompt },
          ],
        },
      ],
    });

    const gpt4oTokens = (usage?.promptTokens ?? 0) + (usage?.completionTokens ?? 0);

    const stripped = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();

    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[vision] GPT-4o devolvió JSON inválido (ruta: ${route})`);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<GPT4oRawOutput>;

    return {
      type:                 (parsed.type ?? 'diagram') as ImageType,
      confidence:           parsed.confidence     ?? 0.9,
      description:          parsed.description    ?? '',
      has_warning:          parsed.safety_relevant ?? false,
      technical_elements:   Array.isArray(parsed.technical_elements) ? parsed.technical_elements : [],
      connections:          Array.isArray(parsed.connections)        ? parsed.connections        : [],
      electrical_values:    Array.isArray(parsed.electrical_values)  ? parsed.electrical_values  : [],
      visionModel:          'gpt-4o',
      route,
      classification_layer: 2,   // GPT-4o solo analiza imágenes confirmadas como técnicas
      usage: { pixtral_tokens: 0, gpt4o_tokens: gpt4oTokens },
    };
  } catch (err) {
    console.error(`[vision] GPT-4o falló (ruta: ${route}):`, err instanceof Error ? err.message : err);
    return null;
  }
}

/* ── ROUTER PRINCIPAL ────────────────────────────────────────────────────── */

export async function processImage(
  image:       ImageInput,
  pageContext: PageContext,
): Promise<ImageResult | null> {
  // Detectar origen de la imagen
  let parsedMeta: Record<string, unknown> = {};
  try {
    if (image.metadata) parsedMeta = JSON.parse(image.metadata);
  } catch { /* metadata inválida → tratar como imagen normal */ }

  /* ── RUTA 1: VectorScanner → GPT-4o directo ─────────────────────────── */
  if (parsedMeta.source === 'vector_scanner') {
    console.log(`[Vision] Ruta 1 — GPT-4o directo (vector_scanner) img:${image.id}`);
    return analyzeWithGPT4o(image, pageContext, 'vector_scanner');
  }

  /* ── RUTA 2: OCR raster → Pixtral triaje ────────────────────────────── */
  console.log(`[Vision] Ruta 2 — Pixtral triaje img:${image.id}`);
  const { data: triage, usage: pixtralUsage } = await analyzeImage(image.imageBase64, pageContext);

  const pixtralTokens = pixtralUsage.prompt_tokens + pixtralUsage.completion_tokens;

  // Pixtral no pudo parsear nada — error real, no hay imagen que guardar
  if (!triage) return null;

  // Capa 1: AI sugiere que no es técnica (logo, portada, decorativa…)
  // NO descartamos — el humano decide. Guardamos con classification_layer=1 como pista.
  if (triage.classification_layer === 1) {
    console.log(`[Vision] Capa 1 (guardada para revisión humana) | tipo: ${triage.type} | img:${image.id}`);
    return {
      type:                 triage.type,
      confidence:           triage.confidence,
      description:          triage.description || `Imagen ${triage.type} — revisar`,
      has_warning:          false,
      technical_elements:   triage.technical_elements,
      visionModel:          'pixtral-12b' as const,
      route:                'pixtral_direct' as const,
      classification_layer: 1 as const,
      usage: { pixtral_tokens: pixtralTokens, gpt4o_tokens: 0 },
    };
  }

  // Capa 2: diagrama técnico → escalar a GPT-4o
  if (triage.classification_layer === 2) {
    console.log(
      `[Vision] Escalando a GPT-4o | elementos: ${triage.technical_elements.join(', ')} | img:${image.id}`,
    );
    const gpt4oResult = await analyzeWithGPT4o(image, pageContext, 'escalated_from_pixtral', triage);

    if (gpt4oResult) {
      // Sumar los tokens de Pixtral al resultado (el triaje sí costó)
      return {
        ...gpt4oResult,
        usage: {
          pixtral_tokens: pixtralTokens,
          gpt4o_tokens:   gpt4oResult.usage.gpt4o_tokens,
        },
      };
    }

    // GPT-4o falló → salvar con resultado de Pixtral como fallback
    console.warn(`[Vision] GPT-4o falló, usando Pixtral como fallback | img:${image.id}`);
    return {
      type:                 triage.type,
      confidence:           triage.confidence,
      description:          triage.description,
      has_warning:          triage.has_warning,
      technical_elements:   triage.technical_elements,
      visionModel:          'pixtral-12b',
      route:                'pixtral_direct',
      classification_layer: 2,
      usage: { pixtral_tokens: pixtralTokens, gpt4o_tokens: 0 },
    };
  }

  // Capa 3: zona gris → guardar siempre, el humano decide
  console.log(`[Vision] Capa 3 guardada para revisión humana | conf: ${triage.confidence} | tipo: ${triage.type} | img:${image.id}`);
  return {
    type:                 triage.type,
    confidence:           triage.confidence,
    description:          triage.description,
    has_warning:          triage.has_warning,
    technical_elements:   triage.technical_elements,
    visionModel:          'pixtral-12b',
    route:                'pixtral_direct',
    classification_layer: 3,
    usage: { pixtral_tokens: pixtralTokens, gpt4o_tokens: 0 },
  };
}

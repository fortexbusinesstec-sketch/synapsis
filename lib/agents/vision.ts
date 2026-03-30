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
  | 'warning'
  | 'table'
  | 'photo'
  | 'decorative'
  | 'cover'
  | 'logo';

/** Salida del triaje Pixtral — sin cambios respecto a versión anterior */
export interface VisionOutput {
  type:                 ImageType;
  confidence:           number;       // 0.0–1.0 (certeza de clasificación)
  classification_layer: 1 | 2 | 3;   // 1=blacklist, 2=whitelist, 3=zona gris
  description:          string;
  reason:               string;
  has_warning:          boolean;
  technical_elements:   string[];
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

/* ── Filtro de 3 capas (sin cambios) ───────────────────────────────────── */

const DISCARD_TYPES = new Set<ImageType>(['decorative', 'cover', 'logo']);

export function shouldDiscard(result: VisionOutput): boolean {
  if (result.classification_layer === 1) return true;
  if (result.classification_layer === 2) return false;
  if (DISCARD_TYPES.has(result.type))    return true;
  if (result.confidence < 0.75)          return true;
  if (result.description.trim().length < 20) return true;
  return false;
}

/* ── PIXTRAL — Triaje (función original sin cambios de lógica) ──────────── */

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
    `Eres un ingeniero experto en ascensores Schindler. ` +
    `Analiza esta imagen extraída de un documento técnico.\n\n` +
    `CONTEXTO DE LAS PÁGINAS CIRCUNDANTES:\n${contextText}\n\n` +
    `SISTEMA DE CLASIFICACIÓN EN 3 CAPAS:\n\n` +
    `CAPA 1 — BLACKLIST ABSOLUTA (classification_layer: 1, descartar SIEMPRE):\n` +
    `Aplica si la imagen es UNO de estos:\n` +
    `- Únicamente un logotipo corporativo sin ningún componente técnico\n` +
    `- Página completamente en blanco o casi en blanco\n` +
    `- Fotografía de edificio o instalación sin esquemas superpuestos\n` +
    `- Una mano o dedo humano señalando/apuntando SIN que haya ningún componente\n` +
    `  técnico visible (sin circuitos, sin displays, sin esquemas).\n` +
    `  Si la mano TOCA o está JUNTO A un componente real → NO es Capa 1.\n` +
    `- Flecha decorativa aislada sin contexto de diagrama\n` +
    `- Fotografía de persona sin equipo técnico visible\n` +
    `- Texto puro sin ningún elemento gráfico\n\n` +
    `CAPA 2 — WHITELIST TÉCNICA REFORZADA (classification_layer: 2, conservar SIEMPRE):\n` +
    `Solo marca como Capa 2 si la imagen es un diagrama técnico (líneas de conexión, bloques o tablas)\n` +
    `que contenga al menos UNA de estas siglas o identificadores:\n\n` +
    `1. PLACAS/CPUs: SCIC, SMIC, SDIC, GCIO, ASIX, LONIC, NWIOC, NWIOE, CIM, LIM, SNGL, BIM, SEM, SLIN, LCUX\n\n` +
    `2. TRACCIÓN/POTENCIA: ACVF, GSV, MGB, VCA, SCPOW, PDM, Variodyn, Yaskawa, VF122BR\n\n` +
    `3. SENSORES/SEGURIDAD: KSE, KNE, KSKB, KSS, KTC, KTS, KTZ, PHS, PHUET, JHC, SIS, SGRW, RKPH, SIH, JH, KTHM\n\n` +
    `4. INTERFACES/BUS: SMLCD, HMI, COP, LOP, SCOP, DBV, TIC, HTIC, LON, CAN, BIO\n\n` +
    `5. CÓDIGOS DE PLANO: formatos como '220_000...', 'K 612089...' o 'EJ 4141...'\n\n` +
    `REGLA DE ORO DE PRECISIÓN:\n` +
    `- Si la imagen es un logo, una advertencia genérica (mano, casco) o texto sin gráficos: ES CAPA 1 (DESCARTAR).\n` +
    `- En caso de duda entre Capa 2 y Capa 3, elige Capa 2.\n\n` +
    `CAPA 3 — ZONA GRIS (classification_layer: 3): todo lo que no sea Capa 1 ni Capa 2.\n\n` +
    `REGLAS FINALES:\n` +
    `- En Capa 2, confidence = certeza de TU clasificación, no decide el descarte.\n` +
    `- Ante la duda entre Capa 1 y Capa 2, elige SIEMPRE Capa 2.\n` +
    `- La descripción debe nombrar todos los componentes y siglas que veas en la imagen.\n\n` +
    `Responde SOLO con JSON estricto (sin texto adicional, sin bloques de código):\n` +
    `{\n` +
    `  "type": "diagram"|"schematic"|"warning"|"table"|"photo"|"decorative"|"cover"|"logo",\n` +
    `  "confidence": <0.0–1.0>,\n` +
    `  "classification_layer": <1|2|3>,\n` +
    `  "description": "<descripción técnica densa>",\n` +
    `  "reason": "<motivo; vacío si se conserva>",\n` +
    `  "has_warning": <true|false>,\n` +
    `  "technical_elements": <siglas y etiquetas que LEES DENTRO DE LA IMAGEN; [] si ninguna>\n` +
    `}`;

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
    return {
      data: {
        type:                 (parsed.type                ?? 'decorative') as ImageType,
        confidence:           parsed.confidence           ?? 0,
        classification_layer: ([1, 2, 3].includes(parsed.classification_layer as number)
                                ? parsed.classification_layer : 3) as 1 | 2 | 3,
        description:          parsed.description          ?? '',
        reason:               parsed.reason               ?? '',
        has_warning:          parsed.has_warning          ?? false,
        technical_elements:   Array.isArray(parsed.technical_elements)
                                ? (parsed.technical_elements as unknown[]).filter((e): e is string => typeof e === 'string')
                                : [],
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
    `  "type": "diagram"|"schematic"|"warning"|"table"|"photo",\n` +
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

  // Capa 1: descarte inmediato
  if (!triage || triage.classification_layer === 1) {
    console.log(
      `[Vision] Descartada Capa 1 | tipo: ${triage?.type ?? 'null'} | img:${image.id}`,
    );
    return null;
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

  // Capa 3: zona gris → aplicar umbral
  if (shouldDiscard(triage)) {
    console.log(
      `[Vision] Descartada Capa 3 | conf: ${triage.confidence} | tipo: ${triage.type} | img:${image.id}`,
    );
    return null;
  }

  // Capa 3 pasa el umbral → guardar con Pixtral directamente
  console.log(`[Vision] Guardada Capa 3 con Pixtral | tipo: ${triage.type} | img:${image.id}`);
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

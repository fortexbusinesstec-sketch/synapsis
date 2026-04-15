/**
 * POST /api/documents/[id]/scan-recommendations
 *
 * Comportamiento:
 * - Si OCR no extrae imagen en esa página → "not found" (razón: sin imagen en página)
 * - Si OCR SÍ extrae imagen → SIEMPRE guardarla en R2 + DB, marcada isUseful=1
 *   GPT-4o describe lo que encontró + si coincide o no con la instrucción del usuario
 *   La razón de no-coincidencia es informativa pero NO bloquea el guardado
 */

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { Mistral } from '@mistralai/mistralai';
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';
import { documents, extractedImages } from '@/lib/db/schema';
import { uploadImage } from '@/lib/storage/blob';
import { createId } from '@paralleldrive/cuid2';
import { runCuriousForSpecificImages } from '@/lib/agents/curious';
import { embedAll } from '@/lib/agents/embedder';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

/* ── Tipos ────────────────────────────────────────────────────────────────── */

interface Recommendation {
  pageNumberRaw: string;
  contentType:   string;
  instruction:   string;
}

export interface ScanResult {
  pageQuery:    string;         // "1-3" etc
  contentType:  string;
  instruction:  string;
  foundImages:  number;         // cuántas imágenes se extrajeron en total
  details:      ScanDetail[];
}

export interface ScanDetail {
  pageNumber:     number;
  imageId:        string;
  imageUrl:       string;
  description:    string;
  isRelevant:     boolean;
  mismatchReason?: string;
}

/* ── Helper: Parsear rangos de páginas ───────────────────────────────────── */
function parsePages(raw: string): number[] {
  const result = new Set<number>();
  const parts = raw.split(',').map(p => p.trim());
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          result.add(i);
        }
      }
    } else {
      const n = parseInt(part);
      if (!isNaN(n)) result.add(n);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

/* ── Extraer TODAS las imágenes de una página ───────────────────────────── */
async function scanPageForImages(
  pdfUrl:     string,
  pageNumber: number,
): Promise<{ images: string[]; rawMarkdown: string }> {
  try {
    const ocrResult = await mistral.ocr.process({
      model:    'mistral-ocr-latest',
      document: { type: 'document_url', documentUrl: pdfUrl },
      pages:              [pageNumber - 1], // 0-indexed
      includeImageBase64: true,
    });

    const page = ocrResult.pages?.[0];
    if (!page) return { images: [], rawMarkdown: '' };

    return {
      images:      (page.images ?? []).map((img: any) => img.imageBase64).filter(Boolean),
      rawMarkdown: page.markdown ?? '',
    };
  } catch {
    return { images: [], rawMarkdown: '' };
  }
}

/* ── GPT-4o: describe la imagen y compara con la instrucción ─────────────── */

async function analyzeWithGPT4o(
  rawBase64:    string,
  contentType:  string,
  instruction:  string,
  pageMarkdown: string,
): Promise<{ description: string; isRelevant: boolean; mismatchReason: string }> {
  // Construir dataUrl correctamente, igual al pipeline principal
  const dataUrl = rawBase64.includes(';base64,')
    ? rawBase64
    : `data:image/png;base64,${rawBase64}`;

  const systemPrompt =
    `Eres un Ingeniero Arquitecto Senior de Schindler con décadas de experiencia acumulada. ` +
    `Tu objetivo es COMPLEMENTAR la instrucción del usuario ("pista humana") con tu conocimiento experto profundo. ` +
    `No te limites a confirmar lo que el usuario dice; actúa como un consultor técnico que: ` +
    `(1) Identifica componentes técnicos adicionales que el usuario no mencionó, ` +
    `(2) Explica la FUNCIÓN y EL ROL de cada placa o módulo detectado dentro de la arquitectura del ascensor (ej: comunicación CAN, maniobras, seguridad), ` +
    `(3) Analiza detalles minuciosos como estados de LEDs, códigos de producto (ej: ID de placa 593...), cableado visible o jumpers. ` +
    `Si el usuario dice "Aquí hay una placa SCIC", tú debes explicar qué es la placa SCIC, qué controla y qué otros módulos (como HMI o SDIC) suelen interactuar con ella en esta configuración.`;

  const userPrompt =
    `PISTA HUMANA: "${instruction}" (Categoría: ${contentType})\n\n` +
    `CONTEXTO DEL MANUAL (Markdown OCR):\n${pageMarkdown.slice(0, 1000)}\n\n` +
    `TAFA: Genera una descripción TÉCNICA EXHAUSTIVA y ARQUITECTÓNICA de la imagen. ` +
    `Si la imagen es de baja calidad o texto ilegible, usa tu conocimiento general del modelo (${contentType}) para inferir la configuración más probable.\n\n` +
    `Responde exactamente con este JSON:\n` +
    `{ 
      "description": "<análisis técnico profundo, expandiendo la pista humana con detalles de ingeniería y arquitectura Schindler>", 
      "isRelevant": true|false, 
      "mismatchReason": "<vacío si coincide, breve si hay una discrepancia crítica con la pista humana>" 
    }`;

  try {
    const { text } = await generateText({
      model:     openai('gpt-4o'),
      maxTokens: 700,
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

    const stripped = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const json = stripped.match(/\{[\s\S]*\}/)?.[0];
    if (!json) {
      return { description: 'Imagen analizada (descripción no disponible)', isRelevant: true, mismatchReason: '' };
    }
    const parsed = JSON.parse(json);
    return {
      description:     parsed.description     ?? 'Sin descripción disponible',
      isRelevant:      Boolean(parsed.isRelevant ?? true),
      mismatchReason:  parsed.mismatchReason   ?? '',
    };
  } catch {
    return { description: 'Imagen encontrada (error al analizar con GPT-4o)', isRelevant: true, mismatchReason: '' };
  }
}

/* ── Route Handler ────────────────────────────────────────────────────────── */

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);
  if (!doc) {
    return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  }

  let body: { recommendations?: unknown };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }

  if (!Array.isArray(body.recommendations) || body.recommendations.length === 0) {
    return NextResponse.json({ error: 'Se requiere el array recommendations' }, { status: 400 });
  }

  const recs = (body.recommendations as any[]).filter(
    r => typeof r.pageNumberRaw === 'string' && typeof r.instruction === 'string'
  ) as Recommendation[];

  const results: ScanResult[] = [];

  for (const rec of recs) {
    const { pageNumberRaw, contentType, instruction } = rec;
    const pagesToScan = parsePages(pageNumberRaw);
    const resultDetails: ScanDetail[] = [];

    for (const pageNum of pagesToScan) {
      const { images, rawMarkdown } = await scanPageForImages(doc.pdfUrl, pageNum);

      for (const base64 of images) {
        // 1. Analizar cada imagen encontrada en la página
        const analysis = await analyzeWithGPT4o(base64, contentType, instruction, rawMarkdown);

        // 2. Subir y Guardar
        try {
          const pureBase64 = base64.includes(';base64,') ? base64.split(';base64,')[1] : base64;
          const buffer = Buffer.from(pureBase64, 'base64');
          const newId  = createId();

          const imageUrl = await uploadImage(
            `${documentId}/hitl_rec_p${pageNum}_${newId}.png`,
            buffer,
            'image/png',
          );

          const fullDescription =
            `[Recomendación manual] ${contentType}: ${instruction}\n\n` +
            analysis.description +
            (analysis.mismatchReason ? `\n\n⚠ Nota del agente: ${analysis.mismatchReason}` : '');

          await db.insert(extractedImages).values({
            id:          newId,
            documentId,
            pageNumber:  pageNum,
            imageUrl,
            imageType:   'diagram',
            confidence:  analysis.isRelevant ? 0.9 : 0.6,
            description: fullDescription,
            isCritical:  1,
            isDiscarded: 0,
            isUseful:    1,
            userComment: `${contentType}: ${instruction}`,
          } as any);

          resultDetails.push({
            pageNumber:     pageNum,
            imageId:        newId,
            imageUrl,
            description:    analysis.description,
            isRelevant:     analysis.isRelevant,
            mismatchReason: analysis.mismatchReason || undefined,
          });
        } catch (e) {
          console.error(`Error procesando imagen en pág ${pageNum}:`, e);
        }
      }
    }

    results.push({
      pageQuery:    pageNumberRaw,
      contentType,
      instruction,
      foundImages:  resultDetails.length,
      details:      resultDetails,
    });
  }

  // Generar embeddings para las imágenes insertadas (necesario para búsqueda vectorial en el chat)
  const insertedImages = results.flatMap(r =>
    r.details.map(d => ({ imageId: d.imageId, description: d.description }))
  );

  if (insertedImages.length > 0) {
    try {
      const descriptions = insertedImages.map(img => img.description);
      const { data: embeddings } = await embedAll(descriptions);

      await Promise.allSettled(
        insertedImages.map((img, i) =>
          embeddings[i]
            ? db.update(extractedImages)
                .set({ embedding: embeddings[i] })
                .where(eq(extractedImages.id, img.imageId))
            : Promise.resolve()
        )
      );
    } catch (err) {
      console.error('[scan-recommendations] Error generando embeddings:', (err as Error).message);
    }
  }

  // Ejecutar Agente Curioso para las nuevas imágenes
  const insertedImageIds = insertedImages.map(img => img.imageId);
  if (insertedImageIds.length > 0) {
    await runCuriousForSpecificImages(documentId, insertedImageIds);
  }

  const found = insertedImageIds.length;

  return NextResponse.json({
    results,
    summary: { total: recs.length, foundImages: found },
  });
}

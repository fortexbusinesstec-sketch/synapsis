/**
 * Agente 2 — OCR
 * Modelo: mistral-ocr-latest
 * Responsabilidad: Extraer el contenido completo (texto + imágenes en base64)
 * de un PDF alojado en Vercel Blob.
 */
import { Mistral } from '@mistralai/mistralai';

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

export interface OcrImage {
  id:          string;
  imageBase64: string | null;
}

export interface OcrPage {
  index:    number;   // base-0
  markdown: string;
  images:   OcrImage[];
}

export interface OcrResult {
  pages:     OcrPage[];
  pageCount: number;
}

export async function runOcr(pdfUrl: string): Promise<{ data: OcrResult; usage: { pages: number } }> {
  const result = await mistral.ocr.process({
    model:    'mistral-ocr-latest',
    document: {
      type:        'document_url',
      documentUrl: pdfUrl,
    },
    includeImageBase64: true,
  });

  const rawPages = result.pages ?? [];

  const pages: OcrPage[] = rawPages.map((p, i) => ({
    index:    i,
    markdown: p.markdown ?? '',
    images:   (p.images ?? []).map((img, j) => ({
      id:          img.id ?? `page${i}_img${j}`,
      imageBase64: img.imageBase64 ?? null,
    })),
  }));

  return { 
    data: { pages, pageCount: pages.length },
    usage: { pages: pages.length },
  };
}

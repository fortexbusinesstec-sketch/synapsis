/**
 * Agente 4 — Validador de Imágenes
 *
 * Sin LLM — lógica pura. Filtra las imágenes devueltas por el Bibliotecario
 * antes de enviarlas al frontend, aplicando 3 filtros en cascada:
 *   1. Distancia vectorial estricta (> 0.28 → descartada)
 *   2. Solo tipos técnicos (diagram, schematic, warning, table)
 *   3. Al menos 1 término técnico en común con la consulta o el contexto
 *
 * Máximo 2 imágenes por respuesta.
 */

export interface RetrievedImage {
  description: string | null;
  image_url:   string | null;
  image_type:  string | null;
  is_critical: number | null;
  doc_title:   string | null;
  distance:    number;
}

export type ValidatedImage = RetrievedImage;

const TECHNICAL_TYPES = new Set<string>(['diagram', 'schematic', 'warning', 'table']);

function extractTechnicalTerms(text: string): string[] {
  return text
    .split(/\s+/)
    .map(w => w.replace(/[^a-zA-Z0-9]/g, '').toLowerCase())
    .filter(w => w.length >= 3);
}

export function validateImages(
  images:          RetrievedImage[],
  userQuery:       string,
  groundTruthText: string,
): ValidatedImage[] {
  const queryTerms = extractTechnicalTerms(userQuery + ' ' + groundTruthText);

  return images
    .filter(img => {
      // Filtro 1: distancia vectorial estricta
      if (img.distance > 0.28) return false;

      // Filtro 2: solo tipos técnicos
      if (!TECHNICAL_TYPES.has(img.image_type ?? '')) return false;

      // Filtro 3: al menos 1 término técnico compartido
      const descTerms = extractTechnicalTerms(img.description ?? '');
      const overlap   = queryTerms.filter(t => descTerms.includes(t));
      if (overlap.length === 0) return false;

      return true;
    })
    .slice(0, 2);
}

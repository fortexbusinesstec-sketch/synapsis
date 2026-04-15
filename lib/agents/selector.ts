/**
 * Agente Selector de Contexto v3
 *
 * Sin LLM — lógica determinística y auditable.
 * Toma los top 10 chunks del Bibliotecario y selecciona los 3-5
 * más relevantes para el Analista.
 *
 * Prioridades (loop inicial):
 *   1. Warning chunk de mayor score (máx 1)
 *   2. Chunk de mayor final_score global
 *   3. Enrichment de mayor score si existe
 *   4. Completar hasta 4 chunks por final_score DESC
 *   5. Imagen con distance < 0.40 como chunk 5
 *
 * Re-planificación (gap presente):
 *   - getGapTerms expande los términos según el tipo del gap
 *   - Prioriza hasta 2 chunks que contengan términos del gap
 *   - Completa con los de mayor score restantes
 */
import type { ScoredChunk } from './bibliotecario';
import type { GapDescriptor } from '@/lib/types/agents';

/* ── Extracción de términos de búsqueda según tipo de gap ─────────────────── */

function getGapTerms(gap: GapDescriptor): string[] {
  // Siempre incluir target y search_hint
  const base = [gap.target, gap.search_hint]
    .flatMap(t => t.split(/[\s,]+/))
    .map(t => t.trim())
    .filter(t => t.length >= 2);

  // Ampliar según tipo de gap
  switch (gap.type) {
    case 'measurement':
      return [...base, 'voltaje', 'resistencia', 'valor', 'nominal', 'medir', 'VDC', 'mA', 'Ω'];
    case 'error_code':
      return [...base, 'error', 'falla', 'código', 'causa', 'reset', 'diagnóstico'];
    case 'component':
      return [...base, 'placa', 'módulo', 'conector', 'pin', 'borne', 'circuito'];
    case 'procedure':
      return [...base, 'paso', 'procedimiento', 'verificar', 'ajustar', 'calibrar'];
    case 'location':
      return [...base, 'ubicación', 'posición', 'rack', 'tablero', 'slot', 'panel'];
    default:
      return base;
  }
}

/* ── Selector ─────────────────────────────────────────────────────────────── */

export function selectContext(
  chunks:    ScoredChunk[],
  _intent:   string,
  _entities: string[],
  gap:       GapDescriptor | null = null,
): ScoredChunk[] {
  if (chunks.length === 0) return [];

  const textChunks  = chunks.filter(c => c.source !== 'image');
  const imageChunks = chunks.filter(c => c.source === 'image');

  const selected: ScoredChunk[] = [];
  const addedIds = new Set<string>();

  function addChunk(c: ScoredChunk) {
    if (!addedIds.has(c.chunk_id)) {
      addedIds.add(c.chunk_id);
      selected.push(c);
    }
  }

  /* ── Modo re-planificación: dirigir la selección al gap ───────────────── */
  if (gap !== null) {
    const terms = getGapTerms(gap);
    console.log(`[selector] Gap mode | type=${gap.type} | target="${gap.target}" | terms=${terms.slice(0,5).join(',')}`);

    const withMatches = textChunks.map(c => {
      const lc      = c.content.toLowerCase();
      const matches = terms.filter(t => lc.includes(t.toLowerCase())).length;
      return { chunk: c, matches };
    });

    // Hasta 2 chunks con al menos 1 coincidencia de términos del gap
    const targeted = withMatches
      .filter(x => x.matches > 0)
      .sort((a, b) => b.matches - a.matches || b.chunk.final_score - a.chunk.final_score)
      .slice(0, 2)
      .map(x => x.chunk);

    for (const c of targeted) addChunk(c);

    // Completar hasta 4 con los de mayor score restantes
    const byScore = textChunks
      .filter(c => !addedIds.has(c.chunk_id))
      .sort((a, b) => b.final_score - a.final_score);

    for (const c of byScore) {
      if (selected.length >= 4) break;
      addChunk(c);
    }

    // Imagen relevante
    const bestImage = imageChunks
      .filter(c => c.distance < 0.40)
      .sort((a, b) => a.distance - b.distance)[0];
    if (bestImage) addChunk(bestImage);

    return selected;
  }

  /* ── Modo estándar ────────────────────────────────────────────────────── */

  // Paso 1 — Warning chunk (máx 1)
  const warningChunks = textChunks
    .filter(c => c.has_warning === 1)
    .sort((a, b) => b.final_score - a.final_score);
  if (warningChunks.length > 0) addChunk(warningChunks[0]);

  // Paso 2 — Chunk de mayor final_score global
  const topChunk = [...textChunks].sort((a, b) => b.final_score - a.final_score)[0];
  if (topChunk) addChunk(topChunk);

  // Paso 3 — Enrichment de mayor score
  const topEnrichment = textChunks
    .filter(c => c.enrichment_match === 1 || c.source === 'enrichment')
    .sort((a, b) => b.final_score - a.final_score)[0];
  if (topEnrichment) addChunk(topEnrichment);

  // Paso 4 — Completar hasta 4
  const remaining = textChunks
    .filter(c => !addedIds.has(c.chunk_id))
    .sort((a, b) => b.final_score - a.final_score);

  for (const c of remaining) {
    if (selected.length >= 4) break;
    addChunk(c);
  }

  // Paso 5 — Imagen relevante
  const bestImage = imageChunks
    .filter(c => c.distance < 0.40)
    .sort((a, b) => a.distance - b.distance)[0];
  if (bestImage) addChunk(bestImage);

  return selected;
}

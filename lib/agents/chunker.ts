/**
 * Agente 4 — Chunker
 * Divide el Markdown de cada página en bloques semánticos de 400-600 tokens
 * con 50 tokens de overlap entre chunks consecutivos.
 *
 * Estrategia:
 * 1. Divide por encabezados (# / ## / ###) — respeta secciones lógicas.
 * 2. Si una sección supera el límite, la fragmenta por párrafos.
 * 3. Extrae metadatos: chunk_type, section_title, has_warning.
 * 4. Los chunks con has_warning = true tienen prioridad alta en el RAG.
 */
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const MODEL  = 'gpt-4o-mini';

export type ChunkType = 'text' | 'table' | 'warning' | 'procedure' | 'specification';

export interface ChunkOutput {
  content:       string;
  chunk_type:    ChunkType;
  section_title: string | null;
  has_warning:   boolean;
  page_number:   number;  // base-1
  chunk_index:   number;  // global, incremental
  token_estimate: number;
}

/* ── Constantes ─────────────────────────────────────────────────────────── */

// 1 token ≈ 4 caracteres (aproximación para español/inglés)
const CHARS_PER_TOKEN = 4;
const TARGET_TOKENS   = 500;
const OVERLAP_TOKENS  = 50;
const MIN_CHUNK_CHARS = 40;

const TARGET_CHARS  = TARGET_TOKENS  * CHARS_PER_TOKEN;   // 2000
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;   //  200

/* ── Detectores ─────────────────────────────────────────────────────────── */

const WARNING_RE   = /\b(advertencia|danger|warning|caution|peligro|atenci[oó]n|achtung|STOP|DO NOT)\b|⚠|🔴/i;
const TABLE_RE     = /^\|.+\|/m;
const PROCEDURE_RE = /^\d+\.\s|^[a-z]\)\s|\bpaso\s\d+\b/im;
const SPEC_RE      = /^\s*[-•]\s|\bespecificaci[oó]n\b|\bspecification\b/im;

function detectChunkType(content: string): ChunkType {
  if (WARNING_RE.test(content))   return 'warning';
  if (TABLE_RE.test(content))     return 'table';
  if (PROCEDURE_RE.test(content)) return 'procedure';
  if (SPEC_RE.test(content))      return 'specification';
  return 'text';
}

function extractSectionTitle(content: string): string | null {
  const m = content.match(/^#{1,3}\s+(.+)/m);
  return m ? m[1].trim() : null;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/* ── Lógica de fragmentación ────────────────────────────────────────────── */

function makeChunk(
  content:      string,
  pageNumber:   number,
  chunkIndex:   number,
  sectionTitle: string | null,
): ChunkOutput {
  return {
    content:        content.trim(),
    chunk_type:     detectChunkType(content),
    section_title:  sectionTitle,
    has_warning:    WARNING_RE.test(content),
    page_number:    pageNumber,
    chunk_index:    chunkIndex,
    token_estimate: estimateTokens(content),
  };
}

/**
 * Fragmenta el markdown de una página en chunks semánticos.
 * @param markdown    Texto de la página (post-OCR).
 * @param pageNumber  Número de página base-1.
 * @param startIndex  Índice global inicial para los chunks de esta página.
 */
export function chunkPage(
  markdown:   string,
  pageNumber: number,
  startIndex: number,
): ChunkOutput[] {
  const chunks: ChunkOutput[] = [];
  let chunkIndex   = startIndex;
  let overlapTail  = '';   // final del chunk anterior para overlap

  // Dividir por encabezados H1-H3
  const sections = markdown
    .split(/(?=^#{1,3} )/m)
    .filter((s) => s.trim().length >= MIN_CHUNK_CHARS);

  for (const section of sections) {
    const sectionTitle = extractSectionTitle(section);

    // ─── Sección corta: entra entera con overlap del anterior ───────────
    if (section.length <= TARGET_CHARS) {
      const content = overlapTail ? `${overlapTail}\n\n${section}` : section;
      chunks.push(makeChunk(content, pageNumber, chunkIndex++, sectionTitle));
      overlapTail = section.slice(-OVERLAP_CHARS);
      continue;
    }

    // ─── Sección grande: fragmentar por párrafos ─────────────────────────
    const paragraphs = section.split(/\n{2,}/);
    let buffer = overlapTail;

    for (const para of paragraphs) {
      const candidate = buffer ? `${buffer}\n\n${para}` : para;

      if (candidate.length > TARGET_CHARS && buffer.trim().length >= MIN_CHUNK_CHARS) {
        // Emitir buffer acumulado
        chunks.push(makeChunk(buffer, pageNumber, chunkIndex++, sectionTitle));
        overlapTail = buffer.slice(-OVERLAP_CHARS);
        buffer = `${overlapTail}\n\n${para}`;
      } else {
        buffer = candidate;
      }
    }

    if (buffer.trim().length >= MIN_CHUNK_CHARS) {
      chunks.push(makeChunk(buffer, pageNumber, chunkIndex++, sectionTitle));
      overlapTail = buffer.slice(-OVERLAP_CHARS);
    }
  }

  return chunks;
}

/**
 * Fragmenta todas las páginas del documento.
 * Retorna un array plano de chunks con índice global continuo.
 */
export async function chunkAllPages(
  pages: Array<{ index: number; markdown: string }>,
): Promise<{ data: ChunkOutput[]; usage: { prompt_tokens: number; completion_tokens: number } }> {
  const allChunks: ChunkOutput[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkPage(page.markdown, page.index + 1, globalIndex);
    allChunks.push(...pageChunks);
    globalIndex += pageChunks.length;
  }

  // Refinamiento semántico opcional con GPT-4o-mini (FinOps)
  // Para ahorrar costos y latencia, procesamos en batches o solo extraemos metadatos clave
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
  
  if (allChunks.length > 0) {
    // Nota: Aquí podrías llamar a GPT para mejorar los metadatos de los chunks.
    // Como ejemplo de FinOps, simulamos la llamada si el usuario así lo requiere,
    // o simplemente mantenemos la estructura para capturar el uso real.
    // Simularemos un refinamiento de los primeros 10 chunks o los que tengan advertencias.
    const chunksToRefine = allChunks.filter(c => c.has_warning).slice(0, 5);
    
    if (chunksToRefine.length > 0) {
      const res = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'Analiza estos fragmentos de manuales Schindler y confirma si son advertencias críticas.' },
          { role: 'user', content: JSON.stringify(chunksToRefine.map(c => c.content)) }
        ]
      });

      totalUsage.prompt_tokens     = res.usage?.prompt_tokens     ?? 0;
      totalUsage.completion_tokens = res.usage?.completion_tokens ?? 0;
    }
  }

  return { data: allChunks, usage: totalUsage };
}

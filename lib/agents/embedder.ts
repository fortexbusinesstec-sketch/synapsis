/**
 * Agente 5 — Embedder
 * Modelo: text-embedding-3-small (OpenAI)
 * Responsabilidad: Vectorizar textos en batches de máximo 100 elementos.
 * Retorna number[][] con la misma longitud y orden que el array de entrada.
 */
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const MODEL      = 'text-embedding-3-small';
const BATCH_SIZE = 100;
export const DIMENSIONS = 1536;

/**
 * Vectoriza un batch de hasta 100 textos en una sola llamada a la API.
 * El orden de salida está garantizado por el índice de la respuesta.
 */
async function embedSingleBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: MODEL,
    input: texts,
  });

  return res.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Vectoriza un array arbitrariamente grande de textos.
 * Lo divide en batches de BATCH_SIZE y los procesa secuencialmente
 * para evitar sobrepasar los rate-limits de la API.
 *
 * @returns number[][] con la misma longitud y orden que `texts`
 */
export async function embedAll(
  texts: string[],
): Promise<{ data: number[][]; usage: { total_tokens: number } }> {
  const filtered = texts.map(t => t?.trim()).filter(t => t && t.length > 0);
  
  if (filtered.length === 0) {
    return { data: [], usage: { total_tokens: 0 } };
  }

  let totalTokens = 0;
  const results: number[][] = [];

  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    
    try {
      const res = await openai.embeddings.create({
        model: MODEL,
        input: batch,
      });
      
      totalTokens += res.usage?.total_tokens ?? 0;
      
      const embeddings = res.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
        
      results.push(...embeddings);
    } catch (err) {
      console.error(`[embedder] Error en batch ${i/BATCH_SIZE}:`, err);
      throw err;
    }
  }

  return { data: results, usage: { total_tokens: totalTokens } };
}

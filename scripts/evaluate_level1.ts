/**
 * SYNAPSE — Dos-Etapas Static Evaluation (Nivel 1)
 * Motor: BM25 (Sparse) + BERT Cross-Encoder (Dense Re-ranking)
 * 
 * Requisitos: All in-memory processing, no DB tokenization tables.
 */

import { client } from '../lib/db';
import { pipeline } from '@xenova/transformers';
// @ts-ignore
import winkBM25 from 'wink-bm25-text-search';

// Interface para el almacenamiento local de chunks
interface LocalChunk {
  id: string;
  content: string;
}

interface RetrievalResult {
  id: string;
  content: string;
  score: number;
}

// Variables globales para persistencia en memoria durante la sesión
let engineBM25: any = null;
let reRanker: any = null;
let chunkMap: Map<string, string> = new Map();
let initPromise: Promise<void> | null = null;

/**
 * Fase 1: Data Loader
 * Descarga todos los chunks de la base de datos a memoria.
 * Implementa un patrón de inicialización única (thread-safe) para evitar carreras.
 */
async function loadDataAndIndex() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    console.log('[Level 1] Descargando chunks desde la base de datos...');
    const res = await client.execute('SELECT id, content FROM document_chunks');
    const chunks = res.rows as any[];

    console.log(`[Level 1] Cargados ${chunks.length} chunks. Inicializando BM25...`);

    engineBM25 = winkBM25();
    // Configuramos los campos a indexar. 
    // Nota: 'idFieldName' no es una opción válida en wink-bm25-text-search; 
    // el ID se pasa como segundo argumento a addDoc().
    engineBM25.defineConfig({
      fldWeights: { content: 1 }
    });

    // Tarea de pre-procesamiento simple (tokenización por palabras y minúsculas)
    engineBM25.definePrepTasks([
      (text: string) => text.toLowerCase()
        .replace(/[^\w\sáéíóúñ]/g, ' ')
        .split(/\s+/)
        .filter((t: string) => t.length > 2)
    ]);

    // Indexar chunks con IDs explícitos (segundo argumento de addDoc)
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      // Si el id viene del driver como objeto o missing, aseguramos un string único
      const docId = chunk.id?.toString() || `doc_${i}`;

      // IMPORTANTE: addDoc(documento, id_unico)
      engineBM25.addDoc({
        content: chunk.content || ''
      }, docId);

      chunkMap.set(docId, chunk.content || '');
    }

    engineBM25.consolidate();
    console.log('[Level 1] BM25 Indexado y consolidado.');
  })();

  return initPromise;
}

/**
 * Fase 2: Cargador del Modelo BERT Cross-Encoder
 */
async function loadReRanker() {
  if (reRanker) return;
  console.log('[Level 1] Cargando BERT Cross-Encoder (Xenova/ms-marco-MiniLM-L-6-v2)...');
  reRanker = await pipeline('text-classification', 'Xenova/ms-marco-MiniLM-L-6-v2', {
    revision: 'main'
  });
  console.log('[Level 1] Modelo de re-ranking cargado.');
}

/**
 * Ejecuta el motor Two-Stage Retriever
 */
export async function runLevel1Retrieval(query: string) {
  const startTime = Date.now();

  // 1. Asegurar inicialización
  await loadDataAndIndex();
  await loadReRanker();

  // 2. Etapa 1: BM25 - Sparse Retrieval (Top 50)
  console.log(`[Level 1] Etapa 1 (BM25) buscando query: "${query}"`);
  const bm25Results = engineBM25.search(query);

  // Tomamos los Top 50 candidatos
  const candidates = bm25Results.slice(0, 50).map((res: any) => ({
    id: res[0],
    scoreBM25: res[1],
    content: chunkMap.get(res[0]) || ''
  }));

  console.log(`[Level 1] Encontrados ${candidates.length} candidatos por BM25.`);

  if (candidates.length === 0) {
    return {
      results: [],
      executionTimeMs: Date.now() - startTime
    };
  }

  // 3. Etapa 2: BERT Cross-Encoder - Dense Re-ranking
  console.log('[Level 1] Etapa 2 (BERT Re-ranking)...');
  const reRanked: RetrievalResult[] = [];

  for (const candidate of candidates) {
    // El Cross-Encoder de MS-MARCO espera el formato de query y texto (text_pair)
    // Transformers.js text-classification devuelve el score de relevancia
    const output = await reRanker(query, {
      text_pair: candidate.content
    });

    // El modelo ms-marco-MiniLM suele devolver el score directamente
    const score = output[0]?.score || 0;

    reRanked.push({
      id: candidate.id,
      content: candidate.content,
      score: score
    });
  }

  // Ordenar por score del Cross-Encoder
  reRanked.sort((a, b) => b.score - a.score);

  // Devolver estrictamente Top 3 definitivo
  const finalTop3 = reRanked.slice(0, 3);
  const executionTimeMs = Date.now() - startTime;

  console.log(`[Level 1] Fin de ejecución en ${executionTimeMs}ms.`);

  return {
    results: finalTop3,
    executionTimeMs
  };
}

// Ejemplo de uso si se ejecuta directamente
if (require.main === module) {
  const queryExample = process.argv[2] || '¿Cómo resetear el ascensor Schindler 3300?';
  runLevel1Retrieval(queryExample).then(res => {
    console.log('\n=== TOP 3 DEFINITIVO ===');
    res.results.forEach((r, i) => {
      console.log(`\nRank ${i + 1} (Score: ${r.score.toFixed(4)})`);
      console.log(`ID: ${r.id}`);
      console.log(`Content snippet: ${r.content.substring(0, 150)}...`);
    });
    console.log(`\nTiempo total: ${res.executionTimeMs}ms`);
  }).catch(console.error);
}

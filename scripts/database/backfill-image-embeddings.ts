/**
 * Backfill: genera embeddings para imágenes existentes sin embedding.
 *
 * Uso:
 *   npx tsx scripts/backfill-image-embeddings.ts
 */

import { createClient } from '@libsql/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = createClient({
  url:       process.env.TURSO_URL!,
  authToken: process.env.TURSO_TOKEN,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

const BATCH_SIZE = 50;

async function main() {
  // Obtener imágenes sin embedding y con descripción
  const result = await client.execute({
    sql: `SELECT id, description FROM extracted_images WHERE embedding IS NULL AND description IS NOT NULL LIMIT 500`,
    args: [],
  });

  const images = result.rows as unknown as Array<{ id: string; description: string }>;
  console.log(`[backfill] ${images.length} imágenes sin embedding encontradas`);

  if (images.length === 0) {
    console.log('[backfill] Nada que hacer.');
    return;
  }

  let updated = 0;

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const texts = batch.map(img => img.description.slice(0, 8000));

    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    const embeddings = res.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding);

    for (let j = 0; j < batch.length; j++) {
      const img = batch[j];
      const vec = embeddings[j];
      if (!vec) continue;

      const buffer = Buffer.from(new Float32Array(vec).buffer);

      await client.execute({
        sql: `UPDATE extracted_images SET embedding = ? WHERE id = ?`,
        args: [buffer, img.id],
      });
      updated++;
    }

    console.log(`[backfill] ${updated}/${images.length} actualizadas...`);
  }

  console.log(`[backfill] Completado. ${updated} imágenes actualizadas.`);
}

main().catch(err => {
  console.error('[backfill] Error:', err);
  process.exit(1);
});

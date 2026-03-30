/**
 * Agente 5 — Metrificador
 *
 * Sin LLM. Calcula y persiste métricas de cada turno del chat.
 * Solo actúa cuando mode === 'record'. En modo 'test', todas las
 * funciones son no-ops que retornan inmediatamente.
 */
import { client }   from '@/lib/db';
import { createId } from '@paralleldrive/cuid2';

/* ── Precios por millón de tokens (actualizar si cambian) ───────────────── */

const PRICES = {
  'gpt-4o-mini-input':  0.15,
  'gpt-4o-mini-output': 0.60,
  'gpt-4o-input':       2.50,
  'gpt-4o-output':      10.00,
  'embedding-3-small':  0.02,
} as const;

/* ── Tipos ──────────────────────────────────────────────────────────────── */

export interface MetricsPayload {
  phase0Used:          boolean;
  phase1Ms:            number;
  phase2Ms:            number;
  phase2Tokens:        number;
  phase3Ms:            number;
  phase3InputTokens:   number;
  phase3OutputTokens:  number;
  chunksRetrieved:     number;
  imagesRetrieved:     number;
  imagesShown:         number;
  enrichmentsUsed:     number;
}

/* ── calculateCost ──────────────────────────────────────────────────────── */

export function calculateCost(
  phase2Tokens:       number,
  phase3InputTokens:  number,
  phase3OutputTokens: number,
): { phase2: number; phase3: number; total: number } {
  const phase2 = (phase2Tokens / 1_000_000) *
    (PRICES['gpt-4o-mini-input'] + PRICES['gpt-4o-mini-output']) / 2;
  const phase3 =
    (phase3InputTokens  / 1_000_000) * PRICES['gpt-4o-input'] +
    (phase3OutputTokens / 1_000_000) * PRICES['gpt-4o-output'];
  return { phase2, phase3, total: phase2 + phase3 };
}

/* ── saveMetrics ────────────────────────────────────────────────────────── */

export async function saveMetrics(
  sessionId: string,
  messageId: string,
  metrics:   MetricsPayload,
  mode:      'test' | 'record',
): Promise<void> {
  if (mode !== 'record') return;

  const cost = calculateCost(
    metrics.phase2Tokens,
    metrics.phase3InputTokens,
    metrics.phase3OutputTokens,
  );
  const totalTokens =
    metrics.phase2Tokens + metrics.phase3InputTokens + metrics.phase3OutputTokens;

  await client.execute({
    sql: `
      INSERT INTO chat_metrics (
        id, session_id, message_id,
        phase0_used, phase1_ms, phase2_ms, phase2_tokens,
        phase3_ms, phase3_input_tokens, phase3_output_tokens,
        total_tokens, cost_phase2_usd, cost_phase3_usd, total_cost_usd,
        chunks_retrieved, images_retrieved, images_shown, enrichments_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      createId(), sessionId, messageId,
      metrics.phase0Used ? 1 : 0,
      metrics.phase1Ms,  metrics.phase2Ms,  metrics.phase2Tokens,
      metrics.phase3Ms,  metrics.phase3InputTokens, metrics.phase3OutputTokens,
      totalTokens, cost.phase2, cost.phase3, cost.total,
      metrics.chunksRetrieved, metrics.imagesRetrieved,
      metrics.imagesShown, metrics.enrichmentsUsed,
    ],
  });
}

/* ── saveRating ─────────────────────────────────────────────────────────── */

export async function saveRating(
  messageId: string,
  rating:    number,
  mode:      'test' | 'record',
): Promise<void> {
  if (mode !== 'record') return;
  await client.execute({
    sql:  `UPDATE chat_metrics SET rating = ?, rating_at = CURRENT_TIMESTAMP WHERE message_id = ?`,
    args: [rating, messageId],
  });
}

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

/* ── saveChatMessage ────────────────────────────────────────────────────── */

export async function saveChatMessage(
  sessionId: string,
  role:      'user' | 'assistant',
  content:   string,
  mode:      'test' | 'record',
): Promise<void> {
  if (mode !== 'record') return;

  await client.execute({
    sql: `INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)`,
    args: [createId(), sessionId, role, content],
  });
}

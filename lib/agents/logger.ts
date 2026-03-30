/**
 * Logger de agentes — Observabilidad del pipeline RAG
 *
 * Cada agente llama a logAgentStart() al inicio y logAgentEnd()/logAgentError()
 * al terminar, generando trazas completas en la tabla agent_logs de Turso.
 */
import { eq }        from 'drizzle-orm';
import { createId }  from '@paralleldrive/cuid2';

import { db }        from '@/lib/db';
import { agentLogs } from '@/lib/db/schema';

/* ── Registro de tiempos en memoria (para calcular durationMs sin re-query) */
const startTimes = new Map<string, number>();

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Registra el inicio de un agente.
 * @returns logId — necesario para llamar a logAgentEnd / logAgentError.
 */
export async function logAgentStart(
  documentId:   string,
  agentName:    string,
  inputSummary: string,
): Promise<string> {
  const id  = createId();
  const now = new Date().toISOString();

  startTimes.set(id, Date.now());

  await db.insert(agentLogs).values({
    id,
    documentId,
    agentName,
    status:       'running',
    startedAt:    now,
    inputSummary: inputSummary.slice(0, 300),
  });

  return id;
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Registra la finalización exitosa de un agente.
 */
export async function logAgentEnd(
  logId:         string,
  outputSummary: string,
  tokens:        { input: number; output: number },
  metadata?:     Record<string, unknown>,
): Promise<void> {
  const start      = startTimes.get(logId) ?? Date.now();
  const durationMs = Date.now() - start;
  startTimes.delete(logId);

  await db
    .update(agentLogs)
    .set({
      status:        'done',
      endedAt:       new Date().toISOString(),
      durationMs,
      inputTokens:   tokens.input,
      outputTokens:  tokens.output,
      outputSummary: outputSummary.slice(0, 300),
      metadata:      metadata ? JSON.stringify(metadata) : null,
    })
    .where(eq(agentLogs.id, logId));
}

/* ────────────────────────────────────────────────────────────────────────── */

/**
 * Registra un error fatal en un agente.
 * No re-lanza — el caller decide si propagar el error.
 */
export async function logAgentError(
  logId: string,
  error: Error,
): Promise<void> {
  const start      = startTimes.get(logId) ?? Date.now();
  const durationMs = Date.now() - start;
  startTimes.delete(logId);

  await db
    .update(agentLogs)
    .set({
      status:       'error',
      endedAt:      new Date().toISOString(),
      durationMs,
      errorMessage: error.message,
      errorStack:   error.stack?.slice(0, 1000) ?? null,
    })
    .where(eq(agentLogs.id, logId));
}

/**
 * PATCH /api/chat/metrics/rating — Guardar rating de utilidad (1-5)
 * Body: { messageId: string, rating: number, sessionId: string }
 */
import { NextResponse } from 'next/server';
import { saveRating }   from '@/lib/agents/metrifier';
import { client }       from '@/lib/db';

export async function PATCH(req: Request) {
  let messageId: string;
  let rating:    number;
  let sessionId: string;

  try {
    const body = await req.json();
    messageId = body.messageId;
    rating    = body.rating;
    sessionId = body.sessionId;

    if (!messageId || !sessionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'messageId, sessionId y rating (1-5) son requeridos' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // Verificar que la sesión es de modo record
  const session = await client.execute({
    sql:  `SELECT mode FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [sessionId],
  });
  const mode = (session.rows[0] as any)?.mode ?? 'test';

  await saveRating(messageId, rating, mode as 'test' | 'record');

  return NextResponse.json({ saved: true });
}

/**
 * PATCH /api/chat/metrics/rating — Guardar rating de utilidad (1-5)
 * Body: { messageId: string, rating: number, sessionId: string }
 */
import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

export async function PATCH(req: Request) {
  let messageId: string;
  let rating: number;
  let sessionId: string;

  try {
    const body = await req.json();
    messageId = body.messageId;
    rating = body.rating;
    sessionId = body.sessionId;

    if (!messageId || !sessionId || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'messageId, sessionId y rating (1-5) son requeridos' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // Verificar que la sesión es de modo record
  const session = await client.execute({
    sql: `SELECT mode FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [sessionId],
  });
  const mode = (session.rows[0] as any)?.mode ?? 'test';

  // Guardar rating directamente en la tabla de mensajes
  await client.execute({
    sql: `UPDATE chat_messages SET utility_rating = ?, mode = ? WHERE id = ?`,
    args: [rating, mode, messageId],
  });

  return NextResponse.json({ saved: true });
}

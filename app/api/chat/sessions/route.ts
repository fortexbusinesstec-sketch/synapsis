/**
 * POST /api/chat/sessions — Crear nueva sesión de chat
 * Body: { mode: 'test' | 'record', equipmentModel?: string }
 * Returns: { sessionId: string }
 */
import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

export async function POST(req: Request) {
  let mode: string;
  let equipmentModel: string | null;

  try {
    const body = await req.json();
    mode           = body.mode === 'record' ? 'record' : 'test';
    equipmentModel = body.equipmentModel || null;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const sessionId = createId();

  await client.execute({
    sql:  `INSERT INTO chat_sessions (id, mode, equipment_model) VALUES (?, ?, ?)`,
    args: [sessionId, mode, equipmentModel],
  });

  return NextResponse.json({ sessionId });
}

import { NextResponse } from 'next/server';
import { createId } from '@paralleldrive/cuid2';
import { client } from '@/lib/db';
import { getCurrentUser } from '@/lib/db/auth';

/**
 * GET /api/chat/sessions — Listar sesiones del usuario actual
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const result = await client.execute({
      sql: `
        SELECT id, mode, equipment_model, created_at, message_count 
        FROM chat_sessions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT 20
      `,
      args: [user.id],
    });
    return NextResponse.json(result.rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/chat/sessions — Crear nueva sesión de chat
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  let mode: string;
  let equipmentModel: string | null;

  try {
    const body = await req.json();
    mode = body.mode === 'record' ? 'record' : 'test';
    equipmentModel = body.equipmentModel || null;
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const sessionId = createId();

  await client.execute({
    sql: `INSERT INTO chat_sessions (id, user_id, mode, equipment_model) VALUES (?, ?, ?, ?)`,
    args: [sessionId, user.id, mode, equipmentModel],
  });

  return NextResponse.json({ sessionId });
}

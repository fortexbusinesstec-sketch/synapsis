import { NextResponse } from 'next/server';
import { client } from '@/lib/db';
import { getCurrentUser } from '@/lib/db/auth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/chat/sessions/[id] — Obtener mensajes de una sesión
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  try {
    // Verificar propiedad
    const sessionRes = await client.execute({
      sql: `SELECT id, user_id, mode, equipment_model FROM chat_sessions WHERE id = ? LIMIT 1`,
      args: [id],
    });

    if (sessionRes.rows.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const session = sessionRes.rows[0] as any;
    if (session.user_id !== user.id) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    // Obtener mensajes
    const messagesRes = await client.execute({
      sql: `SELECT id, role, content, created_at FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC`,
      args: [id],
    });

    return NextResponse.json({
      session,
      messages: messagesRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/sessions/[id] — Eliminar sesión de prueba
 */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Verificar que existe, es del usuario y es modo test
  const result = await client.execute({
    sql: `SELECT id, mode, user_id FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
  }
  const session = result.rows[0] as any;
  if (session.user_id !== user.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }
  if (session.mode !== 'test') {
    return NextResponse.json(
      { error: 'Solo se pueden borrar sesiones en modo test' },
      { status: 403 },
    );
  }

  // Borrar en orden
  await client.execute({
    sql: `DELETE FROM chat_messages WHERE session_id = ?`,
    args: [id],
  });
  await client.execute({
    sql: `DELETE FROM chat_sessions WHERE id = ?`,
    args: [id],
  });

  return NextResponse.json({ deleted: true });
}

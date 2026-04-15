/**
 * DELETE /api/chat/sessions/[id] — Eliminar sesión de prueba y todos sus datos
 *
 * Solo permite borrar sesiones con mode = 'test'.
 * Hace 3 DELETEs manuales en orden (metrics → messages → sessions)
 * para garantizar integridad incluso si CASCADE no está activo en libSQL.
 */
import { NextResponse } from 'next/server';
import { client }       from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;

  // Verificar que existe y es modo test
  const result = await client.execute({
    sql:  `SELECT id, mode FROM chat_sessions WHERE id = ? LIMIT 1`,
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
  }
  if ((result.rows[0] as any).mode !== 'test') {
    return NextResponse.json(
      { error: 'Solo se pueden borrar sesiones en modo test' },
      { status: 403 },
    );
  }

  // Borrar en orden para garantizar integridad referencial
  await client.execute({
    sql:  `DELETE FROM chat_messages WHERE session_id = ?`,
    args: [id],
  });
  await client.execute({
    sql:  `DELETE FROM chat_sessions WHERE id = ?`,
    args: [id],
  });

  return NextResponse.json({ deleted: true });
}

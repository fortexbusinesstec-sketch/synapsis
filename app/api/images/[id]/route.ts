/**
 * PATCH /api/images/[id]
 * Permite al humano marcar una imagen como Útil (1) / No Útil (-1) / Pendiente (0)
 * y añadir un comentario explicativo.
 * Body: { isUseful?: 1 | 0 | -1, userComment?: string, isDiscarded?: 0 | 1 }
 */
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { extractedImages } from '@/lib/db/schema';
import { deleteBlob } from '@/lib/storage/blob';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: { isUseful?: unknown; userComment?: unknown; isDiscarded?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // Campo legacy (mantener retrocompatibilidad)
  if (body.isDiscarded === 0 || body.isDiscarded === 1) {
    updates.isDiscarded = body.isDiscarded as number;
  }

  // Nuevo campo: utilidad marcada por humano
  if (body.isUseful === 1 || body.isUseful === 0 || body.isUseful === -1) {
    updates.isUseful = body.isUseful as number;
    // Sincronizar isDiscarded: si marca No Útil → descartar; si Útil → restaurar
    if (body.isUseful === -1) updates.isDiscarded = 1;
    if (body.isUseful === 1)  updates.isDiscarded = 0;
  }

  // Comentario del humano
  if (typeof body.userComment === 'string') {
    updates.userComment = body.userComment.trim();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Sin campos válidos para actualizar' }, { status: 400 });
  }

  await db
    .update(extractedImages)
    .set(updates as any)
    .where(eq(extractedImages.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Obtener URL de la imagen para borrarla de R2
  const [img] = await db.select().from(extractedImages).where(eq(extractedImages.id, id)).limit(1);
  
  if (img?.imageUrl) {
    await deleteBlob(img.imageUrl);
  }

  await db.delete(extractedImages).where(eq(extractedImages.id, id));

  return NextResponse.json({ ok: true });
}

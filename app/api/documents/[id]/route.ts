/**
 * DELETE /api/documents/[id]
 * Endpoint de purga profunda de documentos.
 */
import { NextResponse }    from 'next/server';
import { cleanupDocument } from '@/lib/db/cleanup';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  try {
    await cleanupDocument(documentId);
    return NextResponse.json({ success: true, message: `Documento ${documentId} eliminado.` });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Error eliminando el documento: ${err.message}` },
      { status: 500 }
    );
  }
}
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;
  const body = await request.json();

  try {
    await db.update(documents)
      .set({
        brand: body.brand,
        equipmentModel: body.equipmentModel,
        title: body.title,
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Error actualizando el documento: ${err.message}` },
      { status: 500 }
    );
  }
}

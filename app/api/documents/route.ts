import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const docs = await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));

    return NextResponse.json(docs);
  } catch (error) {
    console.error('Error al obtener documentos:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

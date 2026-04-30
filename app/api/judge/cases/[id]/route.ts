import { db } from '@/lib/db';
import { judgeCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, messagesUsed } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (messagesUsed !== undefined) updateData.messagesUsed = messagesUsed;
    if (status === 'completed') updateData.completedAt = new Date().toISOString();

    const [updatedCase] = await db.update(judgeCases)
      .set(updateData)
      .where(eq(judgeCases.id, id))
      .returning();

    return NextResponse.json(updatedCase);
  } catch (error: any) {
    console.error('[API_JUDGE_CASE_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

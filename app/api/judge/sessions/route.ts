import { db } from '@/lib/db';
import { judgeSessions, judgeCases } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { judgeProfileId, judgeCaseId, equipmentModel } = body;

    // Check if an active session already exists for this case
    const existingSession = await db.query.judgeSessions.findFirst({
        where: and(
            eq(judgeSessions.judgeCaseId, judgeCaseId),
            eq(judgeSessions.status, 'active')
        )
    });

    if (existingSession) {
        // Ensure case is in_progress if we are returning an active session
        await db.update(judgeCases)
          .set({ status: 'in_progress' })
          .where(eq(judgeCases.id, judgeCaseId));
          
        return NextResponse.json(existingSession);
    }

    // Start new session and mark case as in_progress
    const [session] = await db.insert(judgeSessions).values({
      judgeProfileId,
      judgeCaseId,
      equipmentModel,
      status: 'active',
    }).returning();

    await db.update(judgeCases)
      .set({ status: 'in_progress' })
      .where(eq(judgeCases.id, judgeCaseId));

    return NextResponse.json(session);
  } catch (error: any) {
    console.error('[API_JUDGE_SESSIONS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

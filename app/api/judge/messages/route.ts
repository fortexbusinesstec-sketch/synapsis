import { db } from '@/lib/db';
import { judgeMessages, judgeCases } from '@/lib/db/schema';
import { eq, sql, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return new NextResponse('Session ID required', { status: 400 });
    }

    const messages = await db
      .select()
      .from(judgeMessages)
      .where(eq(judgeMessages.sessionId, sessionId))
      .orderBy(asc(judgeMessages.createdAt));

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error('[API_JUDGE_MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, role, content, judgeCaseId } = body;

    const [message] = await db.insert(judgeMessages).values({
      sessionId,
      role,
      content,
    }).returning();

    // If it's a user message, increment messagesUsed in the case
    if (role === 'user' && judgeCaseId) {
      await db.update(judgeCases)
        .set({ messagesUsed: sql`messages_used + 1` })
        .where(eq(judgeCases.id, judgeCaseId));
    }

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('[API_JUDGE_MESSAGES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

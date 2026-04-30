import { db } from '@/lib/db';
import { judgeCases, judgeSessions } from '@/lib/db/schema';
import { eq, and, desc, getTableColumns } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const judgeProfileId = searchParams.get('judgeProfileId');

    if (!judgeProfileId) {
      return new NextResponse('Missing judgeProfileId', { status: 400 });
    }

    // Get cases and sessions with a simple join
    // We'll deduplicate in JS to ensure we only get one row per case with the latest session
    const results = await db.select({
        case: judgeCases,
        session: judgeSessions
    })
      .from(judgeCases)
      .leftJoin(judgeSessions, eq(judgeCases.id, judgeSessions.judgeCaseId))
      .where(eq(judgeCases.judgeProfileId, judgeProfileId))
      .orderBy(desc(judgeCases.createdAt), desc(judgeSessions.createdAt));

    const casesMap = new Map();
    results.forEach(row => {
        const c = row.case;
        const s = row.session;
        
        if (!casesMap.has(c.id)) {
            casesMap.set(c.id, {
                ...c,
                sessionId: s?.id || null
            });
        } else {
            // If we already have this case, check if this session is better (e.g. has more messages?)
            // For now, the ORDER BY handles picking the most recent one first
        }
    });

    const cases = Array.from(casesMap.values());

    return NextResponse.json(cases);
  } catch (error: any) {
    console.error('[API_JUDGE_CASES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { judgeProfileId, title, equipmentModel, caseDescription, realExperience, actualOutcome, caseNumber } = body;

    const [newCase] = await db.insert(judgeCases).values({
      judgeProfileId,
      title,
      equipmentModel,
      caseDescription,
      realExperience,
      actualOutcome,
      caseNumber,
      status: 'draft',
    }).returning();

    return NextResponse.json(newCase);
  } catch (error: any) {
    console.error('[API_JUDGE_CASES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

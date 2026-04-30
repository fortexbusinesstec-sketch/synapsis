import { db } from '@/lib/db';
import { judgeEvaluations, judgeCases } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Support both camelCase and snake_case for flexibility, but prioritize snake_case as per requirement
    const { 
      judge_case_id, 
      judge_session_id, 
      judge_profile_id,
      q1_resolved,
      q2_helpful,
      q3_would_use,
      q4_would_recommend,
      q5_clarity,
      q6_time_save,
      missing_info,
      loop_count,
      total_ms,
      final_confidence,
      stopped_reason
    } = body;

    const [evaluation] = await db.insert(judgeEvaluations).values({
      judgeCaseId: judge_case_id || body.judgeCaseId,
      judgeSessionId: judge_session_id || body.judgeSessionId,
      judgeProfileId: judge_profile_id || body.judgeProfileId,
      q1Resolved: q1_resolved || body.q1Resolved,
      q2Helpful: q2_helpful || body.q2Helpful,
      q3WouldUse: q3_would_use || body.q3WouldUse,
      q4WouldRecommend: q4_would_recommend || body.q4WouldRecommend,
      q5Clarity: q5_clarity || body.q5Clarity,
      q6TimeSave: q6_time_save || body.q6TimeSave,
      missingInfo: missing_info || body.missingInfo,
      loopCount: loop_count || body.loopCount || 0,
      totalMs: total_ms || body.totalMs || 0,
      finalConfidence: final_confidence || body.finalConfidence || 0,
      stoppedReason: stopped_reason || body.stoppedReason || 'finished_by_user'
    }).returning();

    // Mark case as completed
    await db.update(judgeCases)
      .set({ status: 'completed', completedAt: new Date().toISOString() })
      .where(eq(judgeCases.id, judge_case_id || body.judgeCaseId));

    return NextResponse.json(evaluation);
  } catch (error: any) {
    console.error('[API_JUDGE_EVALUATIONS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

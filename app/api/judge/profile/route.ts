import { db } from '@/lib/db';
import { judgeProfiles } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const profiles = await db.select().from(judgeProfiles);
    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error('[API_JUDGE_PROFILE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, company, yearsExperience, modelsWorked, primaryRole, phone } = body;

    const [profile] = await db.insert(judgeProfiles).values({
      fullName,
      company,
      yearsExperience: parseInt(yearsExperience),
      modelsWorked: JSON.stringify(modelsWorked),
      primaryRole,
      phone,
    }).returning();

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error('[API_JUDGE_PROFILE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

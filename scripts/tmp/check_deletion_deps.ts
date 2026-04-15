import { db } from './lib/db';
import { ablationQuestions, ablationRuns } from './lib/db/schema';
import { eq, inArray } from 'drizzle-orm';

async function check() {
  const ids = ['P12', 'P13', 'P14', 'P15', 'P16', 'P17', 'P18', 'P19'];
  
  console.log('--- Checking ablation_questions ---');
  const questions = await db.select().from(ablationQuestions).where(inArray(ablationQuestions.id, ids));
  console.log('Found questions:', questions.map(q => q.id));

  console.log('\n--- Checking ablation_runs dependencies ---');
  const runs = await db.select().from(ablationRuns).where(inArray(ablationRuns.questionId, ids));
  console.log('Found runs referencing these questions:', runs.length);
  
  if (runs.length > 0) {
    const runCounts = ids.reduce((acc, id) => {
      acc[id] = runs.filter(r => r.questionId === id).length;
      return acc;
    }, {} as Record<string, number>);
    console.log('Run counts per question ID:', runCounts);
  }
}

check().catch(console.error);

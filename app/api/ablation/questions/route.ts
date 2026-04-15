import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

/* ── GET — listado de preguntas activas ─────────────────────────────────── */
export async function GET() {
  const result = await client.execute(
    `SELECT id, category, category_number, question_text, expected_agent_critical,
            difficulty, ground_truth, requires_visual, requires_enrichment,
            requires_ordering, is_ambiguous, equipment_model, is_active, created_at
     FROM ablation_questions
     ORDER BY category_number, id`,
  );
  return NextResponse.json(result.rows);
}

/* ── POST — crear pregunta ──────────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json() as {
    id:                      string;
    category:                string;
    question_text:           string;
    ground_truth:            string;
    difficulty?:             string;
    equipment_model?:        string | null;
    expected_agent_critical?: string | null;
    requires_visual?:        number;
    requires_enrichment?:    number;
    requires_ordering?:      number;
    is_ambiguous?:           number;
  };

  const { id, category, question_text, ground_truth } = body;

  if (!id?.trim() || !category || !question_text?.trim() || !ground_truth?.trim()) {
    return NextResponse.json(
      { error: 'id, category, question_text y ground_truth son obligatorios' },
      { status: 400 },
    );
  }

  // Verificar que el ID no exista
  const exists = await client.execute({
    sql:  'SELECT id FROM ablation_questions WHERE id = ?',
    args: [id.trim()],
  });
  if (exists.rows.length) {
    return NextResponse.json({ error: `Ya existe una pregunta con id "${id.trim()}"` }, { status: 409 });
  }

  const CATEGORY_NUMBER: Record<string, number> = {
    diagnostico_tecnico: 1,
    ambigua:             2,
    secuencial:          3,
    enriquecimiento:     4,
    visual:              5,
  };

  await client.execute({
    sql: `INSERT INTO ablation_questions
            (id, category, category_number, question_text, ground_truth,
             difficulty, equipment_model, expected_agent_critical,
             requires_visual, requires_enrichment, requires_ordering, is_ambiguous,
             is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    args: [
      id.trim(),
      category,
      CATEGORY_NUMBER[category] ?? 1,
      question_text.trim(),
      ground_truth.trim(),
      body.difficulty             ?? 'medium',
      body.equipment_model        ?? null,
      body.expected_agent_critical ?? null,
      body.requires_visual        ?? 0,
      body.requires_enrichment    ?? 0,
      body.requires_ordering      ?? 0,
      body.is_ambiguous           ?? 0,
    ],
  });

  return NextResponse.json({ ok: true, id: id.trim() }, { status: 201 });
}

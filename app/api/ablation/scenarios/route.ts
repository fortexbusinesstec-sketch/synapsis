/**
 * GET  /api/ablation/scenarios           — lista escenarios con sus turnos
 * POST /api/ablation/scenarios           — crea / actualiza un escenario
 */
import { NextResponse } from 'next/server';
import { createId }     from '@paralleldrive/cuid2';
import { client }       from '@/lib/db';

/* ── GET ──────────────────────────────────────────────────────────────────── */
export async function GET() {
  const scenRes = await client.execute({
    sql:  `SELECT * FROM ablation_scenarios WHERE is_active = 1 ORDER BY id`,
    args: [],
  });

  const scenarios = scenRes.rows as Record<string, unknown>[];

  if (!scenarios.length) {
    return NextResponse.json([]);
  }

  const ids = scenarios.map((s) => s.id as string);
  const placeholders = ids.map(() => '?').join(',');
  const turnRes = await client.execute({
    sql:  `SELECT * FROM ablation_scenario_turns WHERE scenario_id IN (${placeholders}) ORDER BY scenario_id, turn_number`,
    args: ids,
  });
  const turns = turnRes.rows as Record<string, unknown>[];

  const result = scenarios.map((s) => ({
    ...s,
    turns: turns.filter((t) => t.scenario_id === s.id),
  }));

  return NextResponse.json(result);
}

/* ── POST ─────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json() as {
    id?:                  string;
    title:                string;
    description?:         string;
    category:             string;
    equipment_model?:     string | null;
    difficulty?:          string;
    max_turns?:           number;
    resolution_criteria:  string;
    turns: Array<{
      turn_number:          number;
      technician_message:   string;
      turn_intent?:         string;
      expected_behavior?:   string;
      is_ambiguous?:        number;
      introduces_new_data?: number;
    }>;
  };

  if (!body.title || !body.category || !body.resolution_criteria || !body.turns?.length) {
    return NextResponse.json(
      { error: 'title, category, resolution_criteria y turns son requeridos' },
      { status: 400 },
    );
  }

  const id = body.id ?? createId();

  // Upsert escenario
  await client.execute({
    sql: `INSERT INTO ablation_scenarios
            (id, title, description, category, equipment_model, difficulty, max_turns, resolution_criteria, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(id) DO UPDATE SET
            title               = excluded.title,
            description         = excluded.description,
            category            = excluded.category,
            equipment_model     = excluded.equipment_model,
            difficulty          = excluded.difficulty,
            max_turns           = excluded.max_turns,
            resolution_criteria = excluded.resolution_criteria`,
    args: [
      id,
      body.title,
      body.description ?? null,
      body.category,
      body.equipment_model ?? null,
      body.difficulty ?? 'medium',
      body.max_turns ?? body.turns.length,
      body.resolution_criteria,
    ],
  });

  // Reemplazar turnos
  await client.execute({
    sql:  `DELETE FROM ablation_scenario_turns WHERE scenario_id = ?`,
    args: [id],
  });

  for (const t of body.turns) {
    await client.execute({
      sql: `INSERT INTO ablation_scenario_turns
              (id, scenario_id, turn_number, technician_message, turn_intent, expected_behavior, is_ambiguous, introduces_new_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        createId(),
        id,
        t.turn_number,
        t.technician_message,
        t.turn_intent        ?? null,
        t.expected_behavior  ?? null,
        t.is_ambiguous       ?? 0,
        t.introduces_new_data ?? 0,
      ],
    });
  }

  return NextResponse.json({ id, turns: body.turns.length });
}

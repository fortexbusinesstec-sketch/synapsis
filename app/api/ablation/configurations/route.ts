import { NextResponse } from 'next/server';
import { client } from '@/lib/db';

/* ── GET — listado de configuraciones ──────────────────────────────────── */
export async function GET() {
  const result = await client.execute(
    `SELECT id, name, description,
            clarifier_enabled, bibliotecario_enabled,
            COALESCE(planner_enabled,  1) AS planner_enabled,
            COALESCE(selector_enabled, 1) AS selector_enabled,
            analista_enabled, enrichments_enabled,
            COALESCE(images_enabled,   1) AS images_enabled,
            is_baseline, display_order, created_at
     FROM ablation_configurations
     ORDER BY display_order`,
  );
  return NextResponse.json(result.rows);
}

/* ── POST — crear configuración ────────────────────────────────────────── */
export async function POST(req: Request) {
  const body = await req.json() as {
    id:                      string;
    name:                    string;
    description?:            string | null;
    clarifier_enabled?:      number;
    bibliotecario_enabled?:  number;
    planner_enabled?:        number;
    selector_enabled?:       number;
    analista_enabled?:       number;
    enrichments_enabled?:    number;
    images_enabled?:         number;
    is_baseline?:            number;
    display_order?:          number;
  };

  const { id, name } = body;

  if (!id?.trim() || !name?.trim()) {
    return NextResponse.json(
      { error: 'id y name son obligatorios' },
      { status: 400 },
    );
  }

  const exists = await client.execute({
    sql:  'SELECT id FROM ablation_configurations WHERE id = ?',
    args: [id.trim()],
  });
  if (exists.rows.length) {
    return NextResponse.json(
      { error: `Ya existe una configuración con id "${id.trim()}"` },
      { status: 409 },
    );
  }

  let displayOrder = body.display_order ?? 0;
  if (!body.display_order) {
    const maxRes = await client.execute(
      'SELECT COALESCE(MAX(display_order), -1) AS max_order FROM ablation_configurations',
    );
    displayOrder = ((maxRes.rows[0] as any).max_order as number) + 1;
  }

  await client.execute({
    sql: `INSERT INTO ablation_configurations
            (id, name, description,
             clarifier_enabled, bibliotecario_enabled, planner_enabled,
             selector_enabled, analista_enabled, enrichments_enabled,
             images_enabled, is_baseline, display_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id.trim(),
      name.trim(),
      body.description           ?? null,
      body.clarifier_enabled     ?? 1,
      body.bibliotecario_enabled ?? 1,
      body.planner_enabled       ?? 1,
      body.selector_enabled      ?? 1,
      body.analista_enabled      ?? 1,
      body.enrichments_enabled   ?? 1,
      body.images_enabled        ?? 1,
      body.is_baseline           ?? 0,
      displayOrder,
    ],
  });

  return NextResponse.json({ ok: true, id: id.trim() }, { status: 201 });
}

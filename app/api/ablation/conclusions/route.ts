/**
 * POST /api/ablation/conclusions
 * Llama a GPT-4o con los datos de ablation_summary para generar conclusiones
 * automáticas del experimento.
 *
 * Body: { run_batch: string }
 */

import { NextResponse } from 'next/server';
import { generateText } from 'ai';
import { openai }       from '@ai-sdk/openai';
import { client }       from '@/lib/db';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { run_batch } = await req.json() as { run_batch: string };
  if (!run_batch) {
    return NextResponse.json({ error: 'run_batch requerido' }, { status: 400 });
  }

  // Obtener summary con datos de configuración
  const summaryRes = await client.execute({
    sql: `SELECT s.question_category, s.avg_score_total, s.avg_score_correctness,
                 s.avg_score_completeness, s.avg_score_relevance, s.avg_score_clarity,
                 s.avg_score_ablation_impact, s.avg_total_ms, s.n_runs,
                 c.name AS config_name, c.display_order,
                 c.clarifier_enabled, c.bibliotecario_enabled, c.analista_enabled,
                 c.image_validator_enabled, c.rag_enabled
          FROM ablation_summary s
          JOIN ablation_configurations c ON s.config_id = c.id
          WHERE s.run_batch = ?
          ORDER BY c.display_order, s.question_category`,
        args: [run_batch],
  });

  if (!summaryRes.rows.length) {
    return NextResponse.json(
      { error: 'No hay datos de summary para este batch. Calcúlalos primero.' },
      { status: 400 },
    );
  }

  // Construir tabla de resumen para el prompt
  const tableLines = summaryRes.rows
    .filter((r) => (r as any).question_category === 'all')
    .map((r: any) => {
      const disabled: string[] = [];
      if (!r.rag_enabled)               disabled.push('RAG');
      else {
        if (!r.clarifier_enabled)       disabled.push('Clarif.');
        if (!r.bibliotecario_enabled)   disabled.push('Biblio.');
        if (!r.analista_enabled)        disabled.push('Analista');
        if (!r.image_validator_enabled) disabled.push('ImgVal.');
      }
      return `Config ${r.config_name} (sin ${disabled.join(', ') || 'ninguno'}) | ` +
             `Score: ${Number(r.avg_score_total).toFixed(2)} | ` +
             `Correctitud: ${Number(r.avg_score_correctness).toFixed(2)} | ` +
             `Latencia: ${Math.round(Number(r.avg_total_ms) / 1000)}s | ` +
             `N=${r.n_runs}`;
    })
    .join('\n');

  const catLines = summaryRes.rows
    .filter((r) => (r as any).question_category !== 'all')
    .map((r: any) =>
      `  ${r.config_name} × ${r.question_category} → ${Number(r.avg_score_total).toFixed(2)}`
    )
    .join('\n');

  const prompt = `Resultados del experimento de ablación (batch: ${run_batch}):

SCORES GLOBALES POR CONFIGURACIÓN:
${tableLines}

SCORES POR CATEGORÍA × CONFIGURACIÓN:
${catLines}

Nomenclatura de configuraciones:
- A: Sistema completo (todos los agentes activos) → techo teórico
- B-E: Ablaciones individuales (un agente deshabilitado)
- F: Solo LLM base sin RAG → piso teórico`;

  const { text } = await generateText({
    model:       openai('gpt-4o'),
    temperature: 0.3,
    maxTokens:   900,
    messages: [
      {
        role: 'system',
        content:
          'Eres un investigador de NLP que analiza resultados de ablación en sistemas RAG multi-agente para técnicos de ascensores. ' +
          'Responde en español con 3 puntos numerados y concisos (máximo 4 oraciones cada uno):\n' +
          '1. Qué agente tiene mayor impacto al deshabilitarse (cuantifica la caída de score)\n' +
          '2. Qué categoría de pregunta es más sensible a la ablación y por qué técnicamente\n' +
          '3. Si alguna configuración parcial sorprende positiva o negativamente (compara con expectativas)',
      },
      { role: 'user', content: prompt },
    ],
  });

  return NextResponse.json({ analysis: text, run_batch });
}

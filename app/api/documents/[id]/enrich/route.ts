/**
 * GET   /api/documents/[id]/enrich  — Obtener lagunas del documento
 * PATCH /api/documents/[id]/enrich  — Guardar respuesta del experto
 * POST  /api/documents/[id]/enrich  — Lanzar (o re-lanzar) el Agente Curioso
 */
import { NextResponse }  from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { embed }         from 'ai';
import { openai }        from '@ai-sdk/openai';

import { db }            from '@/lib/db';
import { enrichments, documents } from '@/lib/db/schema';
import { runCuriousAgent } from '@/lib/agents/curious';

type RouteContext = { params: Promise<{ id: string }> };

/* ── GET ──────────────────────────────────────────────────────────────────── */

export async function GET(_req: Request, { params }: RouteContext) {
  const { id: documentId } = await params;

  const rows = await db
    .select({
      id:                  enrichments.id,
      referenceId:         enrichments.referenceId,
      referenceType:       enrichments.referenceType,
      originalExcerpt:     enrichments.originalExcerpt,
      generatedQuestion:   enrichments.generatedQuestion,
      questionContext:     enrichments.questionContext,
      expertAnswer:        enrichments.expertAnswer,
      answerSource:        enrichments.answerSource,
      confidence:          enrichments.confidence,
      isVerified:          enrichments.isVerified,
      pageNumber:          enrichments.pageNumber,
      timesRetrieved:      enrichments.timesRetrieved,
      answerLengthTokens:  enrichments.answerLengthTokens,
      createdAt:           enrichments.createdAt,
      reviewedAt:          enrichments.reviewedAt,
    })
    .from(enrichments)
    .where(eq(enrichments.documentId, documentId));

  const pending   = rows.filter(r => r.answerSource === 'pending');
  const inherited = rows.filter(r => r.answerSource === 'inherited');
  const answered  = rows.filter(r => r.isVerified === 1 && r.answerSource !== 'inherited');

  const total           = rows.length;
  const pendingCount    = pending.length;
  const answeredCount   = answered.length;
  const inheritedCount  = inherited.length;
  const coveragePercent = total > 0 ? Math.round(((answeredCount + inheritedCount) / total) * 100) : 0;

  return NextResponse.json({
    pending,
    inherited,
    answered,
    stats: {
      total,
      pending:         pendingCount,
      answered:        answeredCount,
      inherited:       inheritedCount,
      coveragePercent,
    },
  });
}

/* ── PATCH ────────────────────────────────────────────────────────────────── */

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id: documentId } = await params;

  let enrichmentIds: string[];
  let expertAnswer: string;

  try {
    const body = await req.json();
    enrichmentIds = body.enrichmentIds;
    expertAnswer  = body.expertAnswer;
    if (!Array.isArray(enrichmentIds) || enrichmentIds.length === 0 || !expertAnswer?.trim()) {
      return NextResponse.json(
        { error: 'enrichmentIds (array no vacío) y expertAnswer son requeridos' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  // Validar que todos los enrichments pertenecen al documento.
  // Traemos solo los que realmente existen para evitar IDs espurios.
  const existingRows = await db
    .select({ id: enrichments.id, generatedQuestion: enrichments.generatedQuestion })
    .from(enrichments)
    .where(and(
      inArray(enrichments.id, enrichmentIds),
      eq(enrichments.documentId, documentId),
    ));

  if (existingRows.length === 0) {
    return NextResponse.json(
      { error: 'Ninguna laguna encontrada para este documento' },
      { status: 404 },
    );
  }

  // Vectorizamos UNA sola vez usando la pregunta del primer enrichment.
  // Embedding = pregunta + respuesta concatenadas → buscable por ambos vocabularios.
  const textToEmbed =
    `Pregunta: ${existingRows[0].generatedQuestion} | Respuesta: ${expertAnswer.trim()}`;

  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: textToEmbed,
  });

  // Convertir a Buffer para almacenar como F32_BLOB
  const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer) as unknown as number[];

  // Estimación de tokens: ~4 chars por token (válido para español/inglés técnico)
  const answerLengthTokens = Math.round(expertAnswer.trim().length / 4);

  // UPDATE masivo — todos reciben la misma respuesta y el mismo embedding
  const validIds = existingRows.map(r => r.id);
  await db
    .update(enrichments)
    .set({
      expertAnswer:        expertAnswer.trim(),
      answerSource:        'expert',
      isVerified:          1,
      embedding:           embeddingBuffer,
      reviewedAt:          new Date().toISOString(),
      answerLengthTokens,
    })
    .where(inArray(enrichments.id, validIds));

  return NextResponse.json({ success: true, enrichmentIds: validIds });
}

/* ── POST — Re-lanzar Agente Curioso ─────────────────────────────────────── */

export async function POST(_req: Request, { params }: RouteContext) {
  const { id: documentId } = await params;

  // Verificar que el documento existe y está ready
  const [doc] = await db
    .select({ id: documents.id, status: documents.status })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!doc)                 return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
  if (doc.status !== 'ready') return NextResponse.json({ error: 'El documento no está listo' }, { status: 409 });

  // Lanzar en background — no bloquear la respuesta
  runCuriousAgent(documentId).catch(err =>
    console.error('[enrich:POST] Error re-lanzando Agente Curioso:', err.message),
  );

  return NextResponse.json({ started: true });
}

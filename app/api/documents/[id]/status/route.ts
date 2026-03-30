/**
 * GET /api/documents/[id]/status
 *
 * Endpoint de polling para el frontend.
 * Retorna el estado actual del pipeline + logs de cada agente.
 */
import { NextResponse }  from 'next/server';
import { eq, asc }       from 'drizzle-orm';

import { db }            from '@/lib/db';
import { agentLogs }     from '@/lib/db/schema';
import { getDocumentById } from '@/lib/db/turso';
import type { AgentLogSummary } from '@/lib/db/schema';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [doc, logs] = await Promise.all([
    getDocumentById(id),
    db
      .select({
        id:            agentLogs.id,
        agentName:     agentLogs.agentName,
        status:        agentLogs.status,
        startedAt:     agentLogs.startedAt,
        endedAt:       agentLogs.endedAt,
        durationMs:    agentLogs.durationMs,
        inputTokens:   agentLogs.inputTokens,
        outputTokens:  agentLogs.outputTokens,
        inputSummary:  agentLogs.inputSummary,
        outputSummary: agentLogs.outputSummary,
        errorMessage:  agentLogs.errorMessage,
      })
      .from(agentLogs)
      .where(eq(agentLogs.documentId, id))
      .orderBy(asc(agentLogs.startedAt)),
  ]);

  if (!doc) {
    return NextResponse.json(
      { error: 'Documento no encontrado' },
      { status: 404 },
    );
  }

  const agentLogsSummary: AgentLogSummary[] = logs.map((l) => ({
    id:            l.id,
    agentName:     l.agentName,
    status:        l.status,
    startedAt:     l.startedAt,
    endedAt:       l.endedAt,
    durationMs:    l.durationMs,
    inputTokens:   l.inputTokens,
    outputTokens:  l.outputTokens,
    inputSummary:  l.inputSummary,
    outputSummary: l.outputSummary,
    errorMessage:  l.errorMessage,
  }));

  return NextResponse.json({
    id:           doc.id,
    title:        doc.title,
    status:       doc.status,
    statusDetail: doc.statusDetail,
    pageCount:    doc.pageCount,
    costOrchestrator: doc.costOrchestrator,
    costOcr:          doc.costOcr,
    costVision:       doc.costVision,
    costChunker:      doc.costChunker,
    costEmbedder:     doc.costEmbedder,
    totalCost:        doc.totalCost,
    agentLogs:    agentLogsSummary,
  });
}

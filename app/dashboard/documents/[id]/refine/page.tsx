import { notFound } from 'next/navigation';
import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';

import { db } from '@/lib/db';
import { documents, enrichments, agentLogs } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/db/auth';
import { EnrichmentReviewer } from './EnrichmentReviewer';
import { RerunButton } from './RerunButton';

type PageProps = { params: Promise<{ id: string }> };

/* ── Banner del estado del Agente Curioso ────────────────────────────────── */

function AgentStatusBanner({
  agentStatus,
  summary,
  total,
  documentId,
}: {
  agentStatus: 'never' | 'running' | 'done' | 'error';
  summary: string | null;
  total: number;
  documentId: string;
}) {
  // Nunca ha corrido (documento anterior al feature)
  if (agentStatus === 'never') {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 flex-shrink-0">
          <HelpCircle className="h-5 w-5 text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-700">
            El Agente Curioso aún no ha analizado este documento
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Puede que el documento se procesara antes de que el agente estuviera disponible.
            Lanza el análisis manualmente.
          </p>
        </div>
        <RerunButton documentId={documentId} />
      </div>
    );
  }

  // Corriendo ahora mismo
  if (agentStatus === 'running') {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
        <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
        <p className="text-sm font-semibold text-blue-700">
          El Agente Curioso está analizando el documento en este momento…
        </p>
      </div>
    );
  }

  // Terminó con error
  if (agentStatus === 'error') {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-red-700">
            El Agente Curioso encontró un error en su última ejecución
          </p>
          {summary && (
            <p className="mt-0.5 text-xs text-red-500 font-mono break-words">{summary}</p>
          )}
        </div>
        <RerunButton documentId={documentId} />
      </div>
    );
  }

  // Terminó OK — 0 lagunas
  if (total === 0) {
    return (
      <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 flex-shrink-0">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800">
            El Agente Curioso completó el análisis y no encontró lagunas
          </p>
          <p className="mt-0.5 text-xs text-emerald-700">
            {summary
              ? summary
              : 'Todos los fragmentos revisados parecen suficientemente claros para un técnico en campo.'}
          </p>
          <p className="mt-2 text-[11px] text-emerald-600">
            ¿Crees que falta algo? Puedes volver a analizar el documento.
          </p>
        </div>
        <RerunButton documentId={documentId} />
      </div>
    );
  }

  // Terminó OK — encontró lagunas
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 flex-shrink-0">
        <CheckCircle2 className="h-5 w-5 text-violet-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-violet-800">
          El Agente Curioso completó el análisis —{' '}
          {total} laguna{total !== 1 ? 's' : ''} detectada{total !== 1 ? 's' : ''}
        </p>
        <p className="mt-0.5 text-xs text-violet-600">
          {summary ?? 'Responde las preguntas pendientes para mejorar la precisión del sistema RAG.'}
        </p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function RefinePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (user?.role === "Técnico") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center border-2 border-red-100 shadow-xl shadow-red-500/10">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Privado</h1>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            El Módulo de Refinamiento es exclusivo para el equipo de <span className="text-slate-900 font-bold">Administración</span> y <span className="text-blue-600 font-bold">Auditoría</span>.
          </p>
        </div>
        <div className="pt-4">
          <Link
            href="/dashboard/home"
            className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all active:scale-95 shadow-2xl inline-block"
          >
            Volver al Panel Técnico
          </Link>
        </div>
      </div>
    );
  }

  const [doc] = await db
    .select({ id: documents.id, title: documents.title, status: documents.status })
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) notFound();
  if (doc.status !== 'ready') notFound();

  const [rows, allLogs] = await Promise.all([
    db
      .select({
        id: enrichments.id,
        referenceId: enrichments.referenceId,
        referenceType: enrichments.referenceType,
        originalExcerpt: enrichments.originalExcerpt,
        generatedQuestion: enrichments.generatedQuestion,
        questionContext: enrichments.questionContext,
        expertAnswer: enrichments.expertAnswer,
        answerSource: enrichments.answerSource,
        confidence: enrichments.confidence,
        isVerified: enrichments.isVerified,
        pageNumber: enrichments.pageNumber,
        timesRetrieved: enrichments.timesRetrieved,
        answerLengthTokens: enrichments.answerLengthTokens,
        createdAt: enrichments.createdAt,
        reviewedAt: enrichments.reviewedAt,
      })
      .from(enrichments)
      .where(eq(enrichments.documentId, id)),

    // Último log del agente 'curious' para este documento
    db
      .select({
        agentName: agentLogs.agentName,
        status: agentLogs.status,
        outputSummary: agentLogs.outputSummary,
        errorMessage: agentLogs.errorMessage,
      })
      .from(agentLogs)
      .where(eq(agentLogs.documentId, id))
      .orderBy(desc(agentLogs.startedAt)),
  ]);

  // Filtrar solo el log más reciente del Agente Curioso
  const curiousLog = allLogs.find(l => l.agentName === 'curious');

  const agentStatus: 'never' | 'running' | 'done' | 'error' =
    !curiousLog ? 'never' :
      curiousLog.status === 'running' ? 'running' :
        curiousLog.status === 'error' ? 'error' :
          'done';

  const agentSummary =
    agentStatus === 'error' ? curiousLog?.errorMessage ?? null :
      agentStatus === 'done' ? curiousLog?.outputSummary ?? null :
        null;

  const pending = rows.filter(r => r.answerSource === 'pending');
  const inherited = rows.filter(r => r.answerSource === 'inherited');
  const answered = rows.filter(r => r.isVerified === 1 && r.answerSource !== 'inherited');
  const total = rows.length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      <Link
        href={`/dashboard/documents/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al documento
      </Link>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Refinamiento de Conocimiento</h1>
        <p className="mt-1 text-sm text-slate-500">{doc.title}</p>
      </div>

      {/* ── Explicación del Proceso de Refinamiento ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest">Modelo de Aprendizaje</h3>
          </div>
          <p className="text-sm leading-relaxed font-bold opacity-90">
            El motor de IA Synapsis puede presentar dudas sobre diagramas específicos o terminología del manual. Su función aquí es responder estas consultas para "entrenar" al sistema y garantizar respuestas infalibles para los técnicos en campo.
          </p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Tiempos de Procesamiento</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <p className="text-[13px] font-bold">Información Manual: Preguntas y respuestas al instante.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <p className="text-[13px] font-bold">Análisis de Imágenes: Demora de unos minutos según la complejidad.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner con el estado real del agente */}
      <AgentStatusBanner
        agentStatus={agentStatus}
        summary={agentSummary}
        total={total}
        documentId={id}
      />

      {/* Solo mostrar el reviewer si hay lagunas */}
      {total > 0 && (
        <EnrichmentReviewer
          documentId={id}
          initialPending={pending}
          initialInherited={inherited}
          initialAnswered={answered}
          total={total}
        />
      )}
    </div>
  );
}

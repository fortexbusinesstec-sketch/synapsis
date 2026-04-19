import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, count, and } from "drizzle-orm";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ArrowLeft,
  BookOpen,
  Layers,
  Images,
  Cpu,
  Sparkles,
} from "lucide-react";

import { db } from "@/lib/db";
import { documents, documentChunks, extractedImages, agentLogs, enrichments, indexingMetrics } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/db/auth";
import { cn } from "@/lib/utils";
import { AuditTabs } from "./AuditTabs";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";

/* ── Types ──────────────────────────────────────────────────────────────── */

type PageProps = {
  params: Promise<{ id: string }>;
};

type DocStatus =
  | "ready"
  | "pending"
  | "analyzing"
  | "ocr"
  | "scanning_vectors"
  | "processing"
  | "embedding"
  | "error"
  | string;

/* ── Status badge ────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string; Icon: React.ElementType }
> = {
  ready: {
    label: "Listo",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    Icon: CheckCircle2,
  },
  pending: {
    label: "Pendiente",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Clock,
  },
  analyzing: {
    label: "Analizando",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Loader2,
  },
  ocr: {
    label: "OCR",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Loader2,
  },
  scanning_vectors: {
    label: "Escaneando vectores",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Loader2,
  },
  processing: {
    label: "Procesando",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Loader2,
  },
  embedding: {
    label: "Embeddings",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon: Loader2,
  },
  error: {
    label: "Error",
    color: "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-500",
    Icon: AlertCircle,
  },
};

function getStatusConfig(status: DocStatus) {
  return STATUS_CONFIG[status] ?? STATUS_CONFIG["pending"];
}

function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = getStatusConfig(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border",
        cfg.color,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}

/* ── Metric card ─────────────────────────────────────────────────────────── */

function MetricCard({
  icon,
  label,
  value,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bg: string;
  border: string;
}) {
  return (
    <div className={cn("flex items-center gap-4 rounded-2xl border p-5 bg-white shadow-sm", border)}>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl flex-shrink-0", bg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function DocumentObservabilityPage({ params }: PageProps) {
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
            El Observador de Documentos es exclusivo para el equipo de <span className="text-slate-900 font-bold">Administración</span> y <span className="text-blue-600 font-bold">Auditoría</span>.
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

  const isAdmin = user?.role === "Administrador de Sistema";
  const isAuditor = user?.role === "Auditor";
  const isDevMode = user?.isDevMode || false;

  // ── Fetch master document ─────────────────────────────────────────────────
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) notFound();

  // ── Parallel: counts + data rows + agent logs (sin embedding blobs) ────────
  const [chunksCountResult, imagesCountResult, enrichmentCountResult, chunks, images, logsRaw, metricsResult] =
    await Promise.all([
      db
        .select({ count: count() })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, id)),

      db
        .select({ count: count() })
        .from(extractedImages)
        .where(eq(extractedImages.documentId, id)),

      db
        .select({ count: count() })
        .from(enrichments)
        .where(and(
          eq(enrichments.documentId, id),
          eq(enrichments.answerSource, 'pending'),
        )),

      db
        .select({
          id: documentChunks.id,
          pageNumber: documentChunks.pageNumber,
          chunkType: documentChunks.chunkType,
          content: documentChunks.content,
          hasWarning: documentChunks.hasWarning,
          sectionTitle: documentChunks.sectionTitle,
        })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, id)),

      db
        .select({
          id: extractedImages.id,
          pageNumber: extractedImages.pageNumber,
          imageUrl: extractedImages.imageUrl,
          imageType: extractedImages.imageType,
          confidence: extractedImages.confidence,
          description: extractedImages.description,
          isCritical: extractedImages.isCritical,
          isDiscarded: extractedImages.isDiscarded,
          isUseful: extractedImages.isUseful,
          userComment: extractedImages.userComment,
        })
        .from(extractedImages)
        .where(eq(extractedImages.documentId, id)),

      db
        .select({
          id: agentLogs.id,
          agentName: agentLogs.agentName,
          status: agentLogs.status,
          startedAt: agentLogs.startedAt,
          endedAt: agentLogs.endedAt,
          durationMs: agentLogs.durationMs,
          inputTokens: agentLogs.inputTokens,
          outputTokens: agentLogs.outputTokens,
          inputSummary: agentLogs.inputSummary,
          outputSummary: agentLogs.outputSummary,
          errorMessage: agentLogs.errorMessage,
        })
        .from(agentLogs)
        .where(eq(agentLogs.documentId, id))
        .orderBy(agentLogs.startedAt),

      db
        .select()
        .from(indexingMetrics)
        .where(eq(indexingMetrics.documentId, id))
        .limit(1),
    ]);

  const chunksCount = chunksCountResult[0]?.count ?? 0;
  const imagesCount = imagesCountResult[0]?.count ?? 0;
  const enrichmentCount = enrichmentCountResult[0]?.count ?? 0;
  const docMetrics = metricsResult[0];
  const isError = doc.status === "error";
  const initialAgentLogs = logsRaw.map((l) => ({
    id: l.id,
    agentName: l.agentName,
    status: l.status,
    startedAt: l.startedAt,
    endedAt: l.endedAt,
    durationMs: l.durationMs,
    inputTokens: l.inputTokens,
    outputTokens: l.outputTokens,
    inputSummary: l.inputSummary,
    outputSummary: l.outputSummary,
    errorMessage: l.errorMessage,
  }));

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/documentacion"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a documentación
        </Link>
      </div>

      {/* ── 1. CABECERA DEL DOCUMENTO ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-4">

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-blue-50 border border-blue-100 flex-shrink-0 animate-pulse-slow">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                {doc.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                {doc.equipmentModel && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600">
                    <Cpu className="h-4 w-4 text-slate-400" />
                    Modelo{" "}
                    <span className="text-blue-600">
                      {doc.equipmentModel}
                    </span>
                  </span>
                )}
                {doc.brand && (
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                    {doc.brand}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={doc.status ?? "pending"} />
            {(isAdmin || (isAuditor && isDevMode)) && doc.status === "ready" && (
              <Link
                href={`/dashboard/documents/${id}/refine`}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl text-xs font-black bg-violet-600 text-white shadow-lg shadow-violet-600/20 hover:scale-105 active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Auditar Conocimiento
                {enrichmentCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-white text-violet-600 text-[10px] font-black ml-1">
                    {enrichmentCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── Error alert ──────────────────────────────────────────────── */}
        {isError && doc.statusDetail && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-5 flex gap-4">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-black text-red-800">
                Error en el pipeline de procesamiento
              </p>
              <pre className="mt-2 text-xs text-red-600 font-mono whitespace-pre-wrap break-words leading-relaxed bg-white/50 p-3 rounded-xl border border-red-100">
                {doc.statusDetail}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. PANEL DE MÉTRICAS (Simplificado para Admin o Full para otros) ── */}
      {!isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            icon={<BookOpen className="h-5 w-5 text-blue-600" />}
            label="Páginas procesadas"
            value={doc.pageCount ?? "—"}
            bg="bg-blue-50"
            border="border-blue-100"
          />
          <MetricCard
            icon={<Layers className="h-5 w-5 text-violet-600" />}
            label="Chunks de texto extraídos"
            value={chunksCount}
            bg="bg-violet-50"
            border="border-violet-100"
          />
          <MetricCard
            icon={<Images className="h-5 w-5 text-emerald-600" />}
            label="Imágenes extraídas"
            value={imagesCount}
            bg="bg-emerald-50"
            border="border-emerald-100"
          />
        </div>
      )}

      {/* ── 2.5 MÉTRICAS ACADÉMICAS (Sólo para Técnicos/Auditores) ─────────── */}
      {!isAdmin && (
        <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-200 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 blur-[80px] pointer-events-none opacity-50" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-50 blur-[80px] pointer-events-none opacity-50" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-4 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" />
                Métricas de Indexación (Paper Q1)
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                Resiliencia y Transferencia <span className="text-blue-600">de Conocimiento</span>
              </h2>
            </div>

            <div className="flex items-center gap-6 bg-slate-50/80 backdrop-blur-sm p-6 rounded-2xl border border-slate-100">
              <div className="text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mismatch</p>
                <p className={cn(
                  "text-3xl font-black mt-1",
                  (docMetrics?.agentMismatchCount ?? 0) > 0 ? "text-amber-500" : "text-emerald-500"
                )}>
                  {docMetrics?.agentMismatchCount ?? 0}
                </p>
              </div>
              <div className="w-px h-12 bg-slate-200" />
              <div className="text-center min-w-[80px]">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Gaps</p>
                <p className="text-3xl font-black text-blue-600 mt-1">{docMetrics?.detectedGaps ?? 0}</p>
              </div>
            </div>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* L1 Card */}
            <div className="bg-white border-2 border-slate-50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-emerald-50 rounded-2xl group-hover:scale-110 transition-transform">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 1</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-slate-800">{docMetrics?.inheritedL1 ?? 0}</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-6 leading-relaxed font-bold">
                Herencia por coincidencia exacta de términos clave.
              </p>
            </div>

            {/* L2 Card */}
            <div className="bg-white border-2 border-slate-50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-blue-50 rounded-2xl group-hover:scale-110 transition-transform">
                  <Layers className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 2</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-slate-800">{docMetrics?.inheritedL2 ?? 0}</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-6 leading-relaxed font-bold">
                Inferencia basada en modelo {doc.equipmentModel}.
              </p>
            </div>

            {/* L3 Card */}
            <div className="bg-white border-2 border-slate-50 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-violet-100 transition-all group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-violet-50 rounded-2xl group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel 3</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-5xl font-black text-slate-800">{docMetrics?.inheritedL3 ?? 0}</p>
              </div>
              <p className="text-[11px] text-slate-500 mt-6 leading-relaxed font-bold">
                Transferencia semántica mediante VSS.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. PESTAÑAS DE AUDITORÍA ───────────────────────────────────── */}
      <AuditTabs
        chunks={chunks}
        images={images}
        documentId={id}
        initialDocStatus={doc.status ?? "pending"}
        initialAgentLogs={initialAgentLogs}
        document={doc}
        isAdmin={isAdmin}
        userRole={user?.role || null}
        isDevMode={user?.isDevMode || false}
      />
    </div>
  );
}

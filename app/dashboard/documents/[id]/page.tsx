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
import { documents, documentChunks, extractedImages, agentLogs, enrichments } from "@/lib/db/schema";
import { cn } from "@/lib/utils";
import { AuditTabs } from "./AuditTabs";
import { DeleteDocumentButton } from "@/components/DeleteDocumentButton";

/* ── Types ──────────────────────────────────────────────────────────────── */

type PageProps = {
  params: Promise<{ id: string }>;
};

type DocStatus =
  | "pending"
  | "analyzing"
  | "ocr"
  | "processing"
  | "embedding"
  | "ready"
  | "error"
  | string;

/* ── Status badge ────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; dotColor: string; Icon: React.ElementType }
> = {
  ready: {
    label:    "Listo",
    color:    "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotColor: "bg-emerald-500",
    Icon:     CheckCircle2,
  },
  pending: {
    label:    "Pendiente",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Clock,
  },
  analyzing: {
    label:    "Analizando",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Loader2,
  },
  ocr: {
    label:    "OCR",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Loader2,
  },
  scanning_vectors: {
    label:    "Escaneando vectores",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Loader2,
  },
  processing: {
    label:    "Procesando",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Loader2,
  },
  embedding: {
    label:    "Embeddings",
    color:    "bg-amber-50 text-amber-700 border-amber-200",
    dotColor: "bg-amber-400 animate-pulse",
    Icon:     Loader2,
  },
  error: {
    label:    "Error",
    color:    "bg-red-50 text-red-700 border-red-200",
    dotColor: "bg-red-500",
    Icon:     AlertCircle,
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
  icon:   React.ReactNode;
  label:  string;
  value:  number | string;
  bg:     string;
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

  // ── Fetch master document ─────────────────────────────────────────────────
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1);

  if (!doc) notFound();

  // ── Parallel: counts + data rows + agent logs (sin embedding blobs) ────────
  const [chunksCountResult, imagesCountResult, enrichmentCountResult, chunks, images, logsRaw] =
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
          id:           documentChunks.id,
          pageNumber:   documentChunks.pageNumber,
          chunkType:    documentChunks.chunkType,
          content:      documentChunks.content,
          hasWarning:   documentChunks.hasWarning,
          sectionTitle: documentChunks.sectionTitle,
        })
        .from(documentChunks)
        .where(eq(documentChunks.documentId, id)),

      db
        .select({
          id:          extractedImages.id,
          pageNumber:  extractedImages.pageNumber,
          imageUrl:    extractedImages.imageUrl,
          imageType:   extractedImages.imageType,
          description: extractedImages.description,
          isCritical:  extractedImages.isCritical,
        })
        .from(extractedImages)
        .where(eq(extractedImages.documentId, id)),

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
        .orderBy(agentLogs.startedAt),
    ]);

  const chunksCount       = chunksCountResult[0]?.count ?? 0;
  const imagesCount       = imagesCountResult[0]?.count ?? 0;
  const enrichmentCount   = enrichmentCountResult[0]?.count ?? 0;
  const isError           = doc.status === "error";
  const initialAgentLogs = logsRaw.map((l) => ({
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

        <DeleteDocumentButton documentId={id} />
      </div>

      {/* ── 1. CABECERA DEL DOCUMENTO ──────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100 flex-shrink-0">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">
                {doc.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                {doc.equipmentModel && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                    <Cpu className="h-3.5 w-3.5 text-slate-400" />
                    Modelo{" "}
                    <span className="font-semibold text-slate-800">
                      {doc.equipmentModel}
                    </span>
                  </span>
                )}
                {doc.docType && (
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                    {doc.docType}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={doc.status ?? "pending"} />
            {doc.status === "ready" && (
              <Link
                href={`/dashboard/documents/${id}/refine`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Enriquecer Texto
                {enrichmentCount > 0 && (
                  <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {enrichmentCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── Error alert ──────────────────────────────────────────────── */}
        {isError && doc.statusDetail && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Error en el pipeline de procesamiento
              </p>
              <pre className="mt-1.5 text-xs text-red-600 font-mono whitespace-pre-wrap break-words leading-relaxed">
                {doc.statusDetail}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. PANEL DE MÉTRICAS RAG ───────────────────────────────────── */}
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

      {/* ── 3. PESTAÑAS DE AUDITORÍA ───────────────────────────────────── */}
      <AuditTabs
        chunks={chunks}
        images={images}
        documentId={id}
        initialDocStatus={doc.status ?? "pending"}
        initialAgentLogs={initialAgentLogs}
        document={doc}
      />
    </div>
  );
}

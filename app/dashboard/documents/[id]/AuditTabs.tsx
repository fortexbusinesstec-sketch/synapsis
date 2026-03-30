"use client";

import { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  FileType2,
  Hash,
  Eye,
  ZoomIn,
  Star,
  Cpu,
  MessageSquare,
  BarChart2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLogSummary } from "@/lib/db/schema";
import { AgentTimeline } from "./AgentTimeline";
import { AgentMessage  } from "./AgentMessage";
import { TokenMeter    } from "./TokenMeter";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ChunkRow {
  id:           string;
  pageNumber:   number | null;
  chunkType:    string | null;
  content:      string;
  hasWarning:   number | null;
  sectionTitle: string | null;
}

export interface ImageRow {
  id:          string;
  pageNumber:  number | null;
  imageUrl:    string;
  imageType:   string | null;
  description: string | null;
  isCritical:  number | null;
}

interface Props {
  chunks:            ChunkRow[];
  images:            ImageRow[];
  documentId:        string;
  initialDocStatus:  string;
  initialAgentLogs:  AgentLogSummary[];
  document:          any;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const TERMINAL_STATUSES = new Set(["ready", "error"]);

const CHUNK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text:          { label: "Texto",    color: "bg-slate-100 text-slate-600"   },
  table:         { label: "Tabla",    color: "bg-blue-50 text-blue-700"      },
  warning:       { label: "Aviso",    color: "bg-amber-50 text-amber-700"    },
  procedure:     { label: "Proceso",  color: "bg-violet-50 text-violet-700"  },
  specification: { label: "Especif.", color: "bg-cyan-50 text-cyan-700"      },
};

const IMAGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  technical_diagram:  { label: "Diagrama",   color: "bg-blue-50 text-blue-700"      },
  electrical_schema:  { label: "Esquema",    color: "bg-violet-50 text-violet-700"  },
  warning_label:      { label: "Advertencia",color: "bg-amber-50 text-amber-700"    },
  photo:              { label: "Foto",        color: "bg-slate-100 text-slate-600"   },
  table:              { label: "Tabla",       color: "bg-emerald-50 text-emerald-700"},
  decorative:         { label: "Decorativo",  color: "bg-slate-100 text-slate-400"   },
};

function chunkTypeMeta(type: string | null) {
  return CHUNK_TYPE_LABELS[type ?? ""] ?? { label: type ?? "—", color: "bg-slate-100 text-slate-600" };
}
function imageTypeMeta(type: string | null) {
  return IMAGE_TYPE_LABELS[type ?? ""] ?? { label: type ?? "—", color: "bg-slate-100 text-slate-600" };
}

/* ── Sub-componentes: Chunks & Images (sin cambios funcionales) ──────────── */

function ChunksTab({ chunks }: { chunks: ChunkRow[] }) {
  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <Hash className="h-8 w-8 opacity-30" />
        <p className="text-sm">No hay chunks disponibles aún.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4 w-16">Pág.</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4 w-32">Tipo</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4">Sección / Extracto</th>
            <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 px-4 w-20">Aviso</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {chunks.map((chunk) => {
            const isWarning = Boolean(chunk.hasWarning);
            const meta = chunkTypeMeta(chunk.chunkType);
            return (
              <tr
                key={chunk.id}
                className={cn(
                  "group hover:bg-slate-50 transition-colors",
                  isWarning && "bg-amber-50/60 hover:bg-amber-50",
                )}
              >
                <td className="py-3 px-4">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-xs font-mono font-semibold text-slate-600">
                    {chunk.pageNumber ?? "—"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", meta.color)}>
                    {meta.label}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {chunk.sectionTitle && (
                    <p className="text-xs font-semibold text-slate-700 mb-0.5 truncate max-w-md">
                      {chunk.sectionTitle}
                    </p>
                  )}
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">
                    {chunk.content.slice(0, 200)}{chunk.content.length > 200 && "…"}
                  </p>
                </td>
                <td className="py-3 px-4">
                  {isWarning && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
                      <AlertTriangle className="h-3 w-3" />
                      Aviso
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ImagesTab({ images }: { images: ImageRow[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <Eye className="h-8 w-8 opacity-30" />
        <p className="text-sm">No hay imágenes extraídas aún.</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {images.map((img) => {
        const meta       = imageTypeMeta(img.imageType);
        const isCritical = Boolean(img.isCritical);
        const isOpen     = expanded === img.id;
        return (
          <div
            key={img.id}
            className={cn(
              "group relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all",
              isCritical
                ? "border-amber-300 ring-1 ring-amber-200"
                : "border-slate-200 hover:border-slate-300",
            )}
          >
            {isCritical && (
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold shadow">
                <Star className="h-2.5 w-2.5 fill-white" />
                Crítica
              </div>
            )}
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.imageUrl}
                alt={img.description ?? `Imagen pág. ${img.pageNumber}`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <button
                onClick={() => setExpanded(isOpen ? null : img.id)}
                className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors"
              >
                <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", meta.color)}>
                  {meta.label}
                </span>
                {img.pageNumber != null && (
                  <span className="text-[10px] text-slate-400 font-mono">Pág. {img.pageNumber}</span>
                )}
              </div>
              {img.description && (
                <p className={cn("text-xs text-slate-600 leading-relaxed", !isOpen && "line-clamp-3")}>
                  {img.description}
                </p>
              )}
              {img.description && img.description.length > 120 && (
                <button
                  onClick={() => setExpanded(isOpen ? null : img.id)}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  {isOpen ? "Ver menos" : "Ver más"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Pipeline Tab ────────────────────────────────────────────────────────── */

function PipelineTab({ agentLogs, document }: { agentLogs: AgentLogSummary[]; document: any }) {
  return (
    <div className="p-5 space-y-6">

      {/* Timeline */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Timeline de Agentes
          </h3>
        </div>
        <AgentTimeline agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      {/* Messages */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Diálogo entre Agentes
          </h3>
        </div>
        <AgentMessage agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      {/* Token Meter */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Uso de Tokens (estimado)
          </h3>
        </div>
        <TokenMeter agentLogs={agentLogs} document={document} />
      </section>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function AuditTabs({
  chunks,
  images,
  documentId,
  initialDocStatus,
  initialAgentLogs,
  document: initialDoc,
}: Props) {
  const [activeTab,  setActiveTab]  = useState<"pipeline" | "chunks" | "images">("pipeline");
  const [agentLogs,  setAgentLogs]  = useState<AgentLogSummary[]>(initialAgentLogs);
  const [docStatus,  setDocStatus]  = useState(initialDocStatus);
  const [docData,    setDocData]    = useState(initialDoc);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Polling: activo mientras el documento no esté en estado terminal ── */
  useEffect(() => {
    if (TERMINAL_STATUSES.has(docStatus)) return;

    pollRef.current = setInterval(async () => {
      try {
        const res  = await fetch(`/api/documents/${documentId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setAgentLogs(data.agentLogs ?? []);
        setDocStatus(data.status);
        setDocData(data);

        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch {
        // silencioso — reintentará en el siguiente tick
      }
    }, 2500);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [documentId, docStatus]);

  /* ── Tabs ────────────────────────────────────────────────────────────── */
  const tabs = [
    {
      key:   "pipeline" as const,
      label: "Pipeline",
      Icon:  Cpu,
      count: agentLogs.length,
      live:  !TERMINAL_STATUSES.has(docStatus),
    },
    {
      key:   "chunks" as const,
      label: "Texto (Chunks)",
      Icon:  FileType2,
      count: chunks.length,
      live:  false,
    },
    {
      key:   "images" as const,
      label: "Imágenes",
      Icon:  Eye,
      count: images.length,
      live:  false,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-slate-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap flex-shrink-0",
              activeTab === tab.key
                ? "text-blue-600 border-blue-600 bg-blue-50/50"
                : "text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50",
            )}
          >
            <tab.Icon className="h-4 w-4" />
            {tab.label}

            {/* Indicador "live" pulsante cuando el pipeline está corriendo */}
            {tab.live && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}

            <span
              className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === tab.key
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="min-h-64">
        {activeTab === "pipeline" && <PipelineTab agentLogs={agentLogs} document={docData} />}
        {activeTab === "chunks"   && <ChunksTab chunks={chunks} />}
        {activeTab === "images"   && <ImagesTab  images={images} />}
      </div>
    </div>
  );
}

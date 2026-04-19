"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AlertTriangle,
  FileType2,
  Hash,
  Eye,
  ZoomIn,
  Cpu,
  MessageSquare,
  BarChart2,
  Activity,
  Ghost,
  Plus,
  Trash2,
  Loader2,
  Send,
  CheckCircle2,
  XCircle,
  ScanSearch,
  BookOpen,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLogSummary } from "@/lib/db/schema";
import { AgentTimeline } from "./AgentTimeline";
import { AgentMessage } from "./AgentMessage";
import { TokenMeter } from "./TokenMeter";

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface ChunkRow {
  id: string;
  pageNumber: number | null;
  chunkType: string | null;
  content: string;
  hasWarning: number | null;
  sectionTitle: string | null;
}

export interface ImageRow {
  id: string;
  pageNumber: number | null;
  imageUrl: string;
  imageType: string | null;
  confidence: number | null;
  description: string | null;
  isCritical: number | null;
  isDiscarded: number | null;
  isUseful: number | null;   // 0=pendiente | 1=útil | -1=no útil
  userComment: string | null;
}

interface Props {
  chunks: ChunkRow[];
  images: ImageRow[];
  documentId: string;
  initialDocStatus: string;
  initialAgentLogs: AgentLogSummary[];
  document: any;
  isAdmin?: boolean;
  userRole?: string | null;
  isDevMode?: boolean;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const TERMINAL_STATUSES = new Set(["ready", "error"]);

const CHUNK_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  text: { label: "Texto", color: "bg-slate-100 text-slate-600" },
  table: { label: "Tabla", color: "bg-blue-50 text-blue-700" },
  warning: { label: "Aviso", color: "bg-amber-50 text-amber-700" },
  procedure: { label: "Proceso", color: "bg-violet-50 text-violet-700" },
  specification: { label: "Especif.", color: "bg-cyan-50 text-cyan-700" },
};

const IMAGE_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  technical_diagram: { label: "Diagrama", color: "bg-blue-50 text-blue-700" },
  electrical_schema: { label: "Esquema", color: "bg-violet-50 text-violet-700" },
  warning_label: { label: "Advertencia", color: "bg-amber-50 text-amber-700" },
  photo: { label: "Foto", color: "bg-slate-100 text-slate-600" },
  table: { label: "Tabla", color: "bg-emerald-50 text-emerald-700" },
  decorative: { label: "Decorativo", color: "bg-slate-100 text-slate-400" },
  diagram: { label: "Diagrama", color: "bg-blue-50 text-blue-700" },
  schematic: { label: "Esquema", color: "bg-violet-50 text-violet-700" },
  flow: { label: "Flujo", color: "bg-cyan-50 text-cyan-700" },
  layout: { label: "Layout", color: "bg-teal-50 text-teal-700" },
  graph: { label: "Gráfico", color: "bg-indigo-50 text-indigo-700" },
  warning: { label: "Advertencia", color: "bg-amber-50 text-amber-700" },
};

function chunkTypeMeta(type: string | null) {
  return CHUNK_TYPE_LABELS[type ?? ""] ?? { label: type ?? "—", color: "bg-slate-100 text-slate-600" };
}
function imageTypeMeta(type: string | null) {
  return IMAGE_TYPE_LABELS[type ?? ""] ?? { label: type ?? "—", color: "bg-slate-100 text-slate-600" };
}

/* ── ChunksTab ───────────────────────────────────────────────────────────── */

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

/* ── ImagesTab ───────────────────────────────────────────────────────────── */

interface ImageCardState {
  isUseful: number;
  userComment: string;
  pending: boolean;
  commentOpen: boolean;
}

function ImagesTab({ images, documentId, isAdmin, isDevMode, userRole }: { images: ImageRow[]; documentId: string; isAdmin?: boolean; isDevMode?: boolean; userRole?: string | null }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const deleteImage = useCallback(async (id: string) => {
    const confirmed = window.confirm("¿Estás seguro de eliminar esta imagen permanentemente? Esta acción no se puede deshacer.");
    if (!confirmed) return;

    setDeletedIds(prev => new Set(prev).add(id));
    try {
      await fetch(`/api/images/${id}`, { method: 'DELETE' });
    } catch {
      setDeletedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const [cardStates, setCardStates] = useState<Record<string, ImageCardState>>(() => {
    const init: Record<string, ImageCardState> = {};
    images.forEach(img => {
      init[img.id] = {
        isUseful: img.isUseful ?? 0,
        userComment: img.userComment ?? '',
        pending: false,
        commentOpen: Boolean(img.userComment),
      };
    });
    return init;
  });

  const visibleImages = images.filter(img => !deletedIds.has(img.id));

  return (
    <div className="space-y-8 p-4">

      {/* ── SECCIÓN DE AUDITORÍA ─────────────────────────────────────────── */}
      {(isAdmin || (userRole === "Auditor" && isDevMode)) && (
        <ManualRecommendationsSection documentId={documentId} />
      )}

      {/* Grid de imágenes */}
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-1 flex-wrap">
          <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Repositorio de Conocimiento Visual</span>
          <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] text-blue-700 font-black uppercase tracking-tight">{visibleImages.length} Activos</span>
          </div>
        </div>

        {visibleImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <Eye className="h-8 w-8 opacity-30" />
            <p className="text-sm font-medium">No hay imágenes procesadas aún</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleImages.map((img) => {
              const meta = imageTypeMeta(img.imageType);
              const isManualRec = img.description?.startsWith('[Recomendación manual]') ?? false;
              const rawDesc = img.description ?? '';
              const hasMismatch = rawDesc.includes('⚠ Nota del agente:');
              const mainDesc = hasMismatch ? rawDesc.split('⚠ Nota del agente:')[0] : rawDesc;

              return (
                <div
                  key={img.id}
                  className={cn(
                    "group relative bg-white border rounded-[2rem] overflow-hidden shadow-sm transition-all",
                    isManualRec ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200 hover:border-blue-400 hover:shadow-xl",
                  )}
                >
                  {(isAdmin || (isDevMode && userRole === "Auditor" && (img.description?.includes('[Recomendación manual]') || img.description?.includes('AUDITOR')))) && (
                    <div className="absolute top-4 left-4 z-20">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 hover:bg-red-500 hover:text-white text-slate-500 shadow-lg backdrop-blur transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 items-end">
                    {isManualRec ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                        <ScanSearch className="h-3.5 h-3.5" />
                        HITL
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                        IA
                      </span>
                    )}
                  </div>

                  <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.description ?? `Imagen pág. ${img.pageNumber}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <button
                      onClick={() => setExpanded(expanded === img.id ? null : img.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-blue-600/10 transition-colors"
                    >
                      <ZoomIn className="h-10 w-10 text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider", meta.color)}>
                        {meta.label}
                      </span>
                      {img.pageNumber != null && (
                        <span className="text-[11px] text-slate-400 font-black">PÁGINA {img.pageNumber}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-2 font-bold">
                      {mainDesc.replace('[Recomendación manual]', '').replace('[Análisis Masivo Senior]', '').trim()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── ManualRecommendationsSection ────────────────────────────────────────── */

interface ManualRec {
  id: string;
  pageNumber: number | '';
  contentType: string;
  instruction: string;
}

interface ScanResultItem {
  pageNumber: number;
  contentType: string;
  instruction: string;
  found: boolean;
  imageId?: string;
  imageUrl?: string;
  description?: string;
  isRelevant?: boolean;
  mismatchReason?: string;
  notFoundReason?: string;
}

function createLocalId() {
  return Math.random().toString(36).slice(2);
}

function ManualRecommendationsSection({ documentId }: { documentId: string }) {
  const [recs, setRecs] = useState<ManualRec[]>([
    { id: createLocalId(), pageNumber: '', contentType: '', instruction: '' },
  ]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setRecs(prev => [...prev, { id: createLocalId(), pageNumber: '', contentType: '', instruction: '' }]);
  };

  const removeRow = (id: string) => {
    setRecs(prev => prev.filter(r => r.id !== id));
  };

  const updateRow = (id: string, field: keyof ManualRec, value: string | number) => {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleScan = async () => {
    const valid = recs.filter(r => r.pageNumber !== '' && r.instruction.trim() !== '');
    if (valid.length === 0) { setError('Agrega al menos una recomendación con página e instrucción.'); return; }

    setIsScanning(true);
    setScanResults(null);
    setError(null);

    try {
      const res = await fetch(`/api/documents/${documentId}/scan-recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: valid.map(r => ({
            pageNumberRaw: String(r.pageNumber),
            contentType: r.contentType || 'Imagen técnica',
            instruction: r.instruction,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Error ${res.status}`);
      }

      const data = await res.json();
      setScanResults(data.results ?? []);
    } catch (e: any) {
      setError(e.message ?? 'Error al escanear recomendaciones');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ── Tutorial de Auditoría (Light Theme) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-200 rounded-[2.5rem] p-8 relative overflow-hidden shadow-sm">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-50 blur-[80px] opacity-50 pointer-events-none" />

        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100 shadow-sm">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-blue-600">Paso 1</p>
            <p className="text-[13px] font-bold leading-tight text-slate-800">Identifica la página omitida en el manual original.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0 border border-violet-100 shadow-sm">
            <Info className="w-5 h-5 text-violet-600" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">Paso 2</p>
            <p className="text-[13px] font-bold leading-tight text-slate-800">Describe qué diagrama o detalle técnico debe extraer el agente.</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0 border border-emerald-100 shadow-sm">
            <ScanSearch className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600">Paso 3</p>
            <p className="text-[13px] font-bold leading-tight text-slate-800">Inicia el análisis dinámico para incorporar la imagen al sistema.</p>
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border-2 border-blue-100 bg-blue-50/20 overflow-hidden shadow-sm">
        {/* Header Form */}
        <div className="px-8 py-6 border-b border-blue-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-600/20">
              <ScanSearch className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Auditoría por Demanda (HITL)</h3>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide mt-0.5">Entrenamiento Supervisado para el Agente</p>
            </div>
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-slate-100 bg-white text-xs font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Añadir Fila
          </button>
        </div>

        <div className="p-8 space-y-4">
          {recs.map((rec) => (
            <div key={rec.id} className="grid grid-cols-[100px_1fr_1fr_40px] gap-3 items-start">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Pág."
                  value={rec.pageNumber}
                  onChange={e => updateRow(rec.id, 'pageNumber', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all"
                />
              </div>
              <input
                type="text"
                placeholder="Tipo de Diagrama"
                value={rec.contentType}
                onChange={e => updateRow(rec.id, 'contentType', e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all"
              />
              <input
                type="text"
                placeholder="Describe la instrucción para la IA..."
                value={rec.instruction}
                onChange={e => updateRow(rec.id, 'instruction', e.target.value)}
                className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-400 transition-all"
              />
              <button
                onClick={() => removeRow(rec.id)}
                disabled={recs.length === 1}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <div className="flex items-center gap-4 pt-4">
            <button
              onClick={handleScan}
              disabled={isScanning}
              className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-slate-900 hover:bg-black disabled:bg-slate-400 text-white text-sm font-black shadow-2xl transition-all active:scale-95 group"
            >
              {isScanning ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Procesando Peticiones...</>
              ) : (
                <><Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" /> Iniciar Escaneo Dinámico</>
              )}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-2 font-bold px-1 animate-pumping">
              <XCircle className="h-4 w-4" /> {error}
            </p>
          )}
        </div>

        {/* Resultados */}
        {scanResults !== null && (
          <div className="border-t-2 border-blue-100 p-8 space-y-4 bg-white">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Auditoría Finalizada
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scanResults.map((result, i) => (
                <div key={i} className={cn("p-5 rounded-[1.5rem] border flex gap-4 items-start shadow-sm", result.found ? "border-emerald-100 bg-emerald-50/30" : "border-red-100 bg-red-50/30")}>
                  {result.imageUrl && <img src={result.imageUrl} className="w-20 h-20 rounded-2xl object-cover border border-emerald-200 shadow-md" alt="" />}
                  <div>
                    <p className="text-xs font-black text-slate-800 tracking-tight">Página {result.pageNumber} • {result.contentType}</p>
                    <p className="text-[11px] text-slate-500 mt-2 leading-relaxed font-bold">
                      {result.found ? 'Imagen capturada y asociada al conocimiento técnico del manual.' : result.notFoundReason}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── RecommendationsTab ──────────────────────────────────────────────────── */

interface AuditorRecommendation {
  pageNumber: number;
  reason: string;
  context: string;
}

function RecommendationsTab({ document }: { document: any }) {
  const recommendations: AuditorRecommendation[] = (() => {
    if (!document?.auditorRecommendations) return [];
    try {
      const parsed = JSON.parse(document.auditorRecommendations);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
          <Ghost className="h-8 w-8 opacity-30" />
        </div>
        <p className="text-sm font-bold text-slate-500">Sin Lagunas de Conocimiento</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-4">
      {recommendations.map((rec, i) => (
        <div key={i} className="flex gap-4 rounded-[1.5rem] border border-amber-200 bg-amber-50/50 p-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-900 flex-shrink-0 font-black text-sm">
            {rec.pageNumber}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-black text-amber-900 leading-snug">{rec.reason}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{rec.context}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── PipelineTab ─────────────────────────────────────────────────────────── */

function PipelineTab({ agentLogs, document, userRole }: { agentLogs: AgentLogSummary[]; document: any; userRole: string | null }) {
  return (
    <div className="p-8 space-y-10">
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Timeline de Agentes</h3>
        </div>
        <AgentTimeline agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Diálogo entre Agentes</h3>
        </div>
        <AgentMessage agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      <section>
        <div className="flex items-center gap-3 mb-6">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Uso de Tokens (estimado)</h3>
        </div>
        <TokenMeter agentLogs={agentLogs} document={document} userRole={userRole} />
      </section>
    </div>
  );
}

/* ── AuditTabs (main) ────────────────────────────────────────────────────── */

export function AuditTabs({
  chunks,
  images,
  documentId,
  initialDocStatus,
  initialAgentLogs,
  document: initialDoc,
  isAdmin = false,
  userRole = null,
  isDevMode = false,
}: Props) {
  const [activeTab, setActiveTab] = useState<"pipeline" | "chunks" | "images">(isAdmin ? "images" : "pipeline");
  const [agentLogs, setAgentLogs] = useState<AgentLogSummary[]>(initialAgentLogs);
  const [docStatus, setDocStatus] = useState(initialDocStatus);
  const [docData, setDocData] = useState(initialDoc);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (TERMINAL_STATUSES.has(docStatus)) return;

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/status`);
        if (!res.ok) return;
        const data = await res.json();

        setAgentLogs(data.agentLogs ?? []);
        setDocStatus(data.status);
        setDocData(data);

        if (TERMINAL_STATUSES.has(data.status)) {
          clearInterval(pollRef.current!);
          pollRef.current = null;
        }
      } catch { /* silencioso */ }
    }, 2500);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [documentId, docStatus]);

  const auditorCount = (() => {
    if (!docData?.auditorRecommendations) return 0;
    try {
      const parsed = JSON.parse(docData.auditorRecommendations);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch { return 0; }
  })();

  const pendingReview = images.filter(
    i => !i.description?.startsWith('[Recomendación manual]') && (i.isUseful ?? 0) === 0
  ).length;

  const tabs = [
    ...(isAdmin ? [] : [{ key: "pipeline" as const, label: "Pipeline", Icon: Cpu, count: agentLogs.length, live: !TERMINAL_STATUSES.has(docStatus) }]),
    { key: "chunks" as const, label: isAdmin ? "Contenido Extraído" : "Texto (Chunks)", Icon: FileType2, count: chunks.length, live: false },
    { key: "images" as const, label: isAdmin ? "Curaduría Visual" : "Imágenes", Icon: Eye, count: images.length, live: false, badge: pendingReview > 0 ? pendingReview : undefined },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden min-h-[600px] flex flex-col transition-all">
      {/* Tab header */}
      <div className="flex border-b border-slate-100 overflow-x-auto bg-slate-50/30">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-3 px-8 py-5 text-xs font-black tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab.key
                ? "text-blue-600 border-blue-600 bg-white shadow-[0_-4px_20px_-10px_rgba(37,99,235,0.1)]"
                : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50/50",
            )}
          >
            <tab.Icon className={cn("h-4 w-4", activeTab === tab.key ? "text-blue-600" : "text-slate-400")} />
            {tab.label}

            {tab.live && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}

            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-[10px] font-black",
              activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
            )}>
              {tab.count}
            </span>

            {'badge' in tab && tab.badge !== undefined && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-sm animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="flex-1 bg-white">
        {activeTab === "pipeline" && <PipelineTab agentLogs={agentLogs} document={docData} userRole={userRole} />}
        {activeTab === "chunks" && <ChunksTab chunks={chunks} />}
        {activeTab === "images" && <ImagesTab images={images} documentId={documentId} isAdmin={isAdmin} isDevMode={isDevMode} userRole={userRole} />}
      </div>
    </div>
  );
}

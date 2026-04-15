"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Ghost,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  XCircle,
  ScanSearch,
  Lightbulb,
  RefreshCw,
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
  confidence:  number | null;
  description: string | null;
  isCritical:  number | null;
  isDiscarded: number | null;
  isUseful:    number | null;   // 0=pendiente | 1=útil | -1=no útil
  userComment: string | null;
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
  technical_diagram:  { label: "Diagrama",    color: "bg-blue-50 text-blue-700"      },
  electrical_schema:  { label: "Esquema",     color: "bg-violet-50 text-violet-700"  },
  warning_label:      { label: "Advertencia", color: "bg-amber-50 text-amber-700"    },
  photo:              { label: "Foto",         color: "bg-slate-100 text-slate-600"   },
  table:              { label: "Tabla",        color: "bg-emerald-50 text-emerald-700"},
  decorative:         { label: "Decorativo",   color: "bg-slate-100 text-slate-400"   },
  diagram:            { label: "Diagrama",     color: "bg-blue-50 text-blue-700"      },
  schematic:          { label: "Esquema",      color: "bg-violet-50 text-violet-700"  },
  flow:               { label: "Flujo",        color: "bg-cyan-50 text-cyan-700"      },
  layout:             { label: "Layout",       color: "bg-teal-50 text-teal-700"      },
  graph:              { label: "Gráfico",      color: "bg-indigo-50 text-indigo-700"  },
  warning:            { label: "Advertencia",  color: "bg-amber-50 text-amber-700"    },
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
  isUseful:    number;
  userComment: string;
  pending:     boolean;
  commentOpen: boolean;
}

function ImagesTab({ images, documentId }: { images: ImageRow[]; documentId: string }) {
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
        isUseful:    img.isUseful ?? 0,
        userComment: img.userComment ?? '',
        pending:     false,
        commentOpen: Boolean(img.userComment),
      };
    });
    return init;
  });

  const commentTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const patchImage = useCallback(async (id: string, payload: object) => {
    try {
      await fetch(`/api/images/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch { /* silencioso */ }
  }, []);

  const setUseful = useCallback((id: string, value: 1 | 0 | -1) => {
    setCardStates(prev => {
      const current = prev[id];
      if (!current) return prev;
      const next = { ...current, isUseful: value, pending: true };
      if (value === 1 && !current.userComment) next.commentOpen = true;
      return { ...prev, [id]: next };
    });
    patchImage(id, { isUseful: value }).then(() => {
      setCardStates(prev => {
        const c = prev[id];
        if (!c) return prev;
        return { ...prev, [id]: { ...c, pending: false } };
      });
    });
  }, [patchImage]);

  const setComment = useCallback((id: string, text: string) => {
    setCardStates(prev => {
      const c = prev[id];
      if (!c) return prev;
      return { ...prev, [id]: { ...c, userComment: text } };
    });
    clearTimeout(commentTimers.current[id]);
    commentTimers.current[id] = setTimeout(() => {
      patchImage(id, { userComment: text });
    }, 1000);
  }, [patchImage]);

  const toggleCommentOpen = useCallback((id: string) => {
    setCardStates(prev => {
      const c = prev[id];
      if (!c) return prev;
      return { ...prev, [id]: { ...c, commentOpen: !c.commentOpen } };
    });
  }, []);

  const visibleImages = images.filter(img => !deletedIds.has(img.id));

  // ── Empty state ───────────────────────────────────────────────────────────
  if (visibleImages.length === 0) {
    return (
      <div className="space-y-5 p-4">
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Eye className="h-8 w-8 opacity-30" />
          <p className="text-sm font-medium">No hay imágenes procesadas aún</p>
          <p className="text-xs text-slate-400 text-center max-w-xs">
            Usa la sección de abajo para indicarle al agente qué páginas auditar y qué buscar.
          </p>
        </div>
        <ManualRecommendationsSection documentId={documentId} />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">

      {/* Resumen */}
      <div className="flex items-center gap-4 px-1 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">{visibleImages.length} imágenes en el repositorio</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-xs text-blue-700 font-medium">HITL Audit Activo</span>
        </div>
      </div>

      {/* Grid de imágenes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleImages.map((img) => {
          const meta        = imageTypeMeta(img.imageType);
          const state       = cardStates[img.id] ?? { isUseful: 1, userComment: '', pending: false, commentOpen: false };
          const isOpen      = expanded === img.id;

          // Imágenes recomendadas por el usuario: identificadas por el prefijo en description
          const isManualRec = img.description?.startsWith('[Recomendación manual]') ?? false;

          // Separar descripción principal de la nota de no-coincidencia del agente
          const rawDesc = img.description ?? '';
          const hasMismatch = rawDesc.includes('⚠ Nota del agente:');
          const mainDesc    = hasMismatch ? rawDesc.split('⚠ Nota del agente:')[0] : rawDesc;
          const agentNote   = hasMismatch ? rawDesc.split('⚠ Nota del agente:')[1] : null;

          return (
            <div
              key={img.id}
              className={cn(
                "group relative bg-white border rounded-xl overflow-hidden shadow-sm transition-all",
                isManualRec ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200 hover:border-slate-300 hover:shadow-md",
              )}
            >
              {/* Eliminar (visible en hover) */}
              <div className="absolute top-2 left-2 z-20">
                <button
                  onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 hover:bg-red-500 hover:text-white text-slate-500 shadow-sm backdrop-blur transition-all opacity-0 group-hover:opacity-100"
                  title="Eliminar imagen permanentemente"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                {img.description?.startsWith('[Recomendación manual]') ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-md">
                    <ScanSearch className="h-2.5 w-2.5" />
                    HITL / Manual
                  </span>
                ) : img.description?.startsWith('[Análisis Masivo Senior]') ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold shadow-md">
                    <Cpu className="h-2.5 w-2.5" />
                    Guiado / Experto
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                    Legado / Auto
                  </span>
                )}
              </div>

              {/* Imagen */}
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

              {/* Metadata */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium", meta.color)}>
                    {meta.label}
                  </span>
                  {img.pageNumber != null && (
                    <span className="text-[10px] text-slate-400 font-mono">Pág. {img.pageNumber}</span>
                  )}
                </div>

                {/* Para imágenes manuales: mostrar el userComment como etiqueta azul */}
                {isManualRec && state.userComment && (
                  <p className="text-[11px] font-semibold text-blue-700 bg-blue-50 rounded-md px-2 py-1">
                    {state.userComment}
                  </p>
                )}

                {/* Botones Útil/No Útil se han eliminado a favor del flujo HITL directo */}
              </div>
            </div>
          );
        })}
      </div>

      {/* Sección de recomendaciones manuales */}
      <ManualRecommendationsSection documentId={documentId} />
    </div>
  );
}

/* ── ManualRecommendationsSection ────────────────────────────────────────── */

interface ManualRec {
  id:          string;
  pageNumber:  number | '';
  contentType: string;
  instruction: string;
}

interface ScanResultItem {
  pageNumber:      number;
  contentType:     string;
  instruction:     string;
  found:           boolean;
  imageId?:        string;
  imageUrl?:       string;
  description?:    string;
  isRelevant?:     boolean;
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
  const [isScanning,  setIsScanning]  = useState(false);
  const [scanResults, setScanResults] = useState<ScanResultItem[] | null>(null);
  const [error, setError]             = useState<string | null>(null);

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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendations: valid.map(r => ({
            pageNumberRaw: String(r.pageNumber),
            contentType:   r.contentType || 'Imagen técnica',
            instruction:   r.instruction,
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

  const found    = scanResults?.filter(r => r.found).length ?? 0;
  const notFound = scanResults ? scanResults.length - found : 0;

  return (
    <div className="mt-2 rounded-2xl border border-blue-200 bg-blue-50/40 overflow-hidden">

      {/* Header */}
      <div className="px-5 py-4 border-b border-blue-200 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 flex-shrink-0">
          <ScanSearch className="h-4 w-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-800">Agente de Visión por Demanda (HITL)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Dile al agente qué páginas auditar. Puedes usar rangos (ej: "1-3") o números separados por comas.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="p-5 space-y-3">

        {/* Cabeceras */}
        <div className="grid grid-cols-[90px_1fr_1fr_32px] gap-2 px-1">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Hojas PDF</p>
            <p className="text-[9px] text-slate-400">(nº, rangos 1-3)</p>
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tipo de contenido</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Instrucción para el agente</p>
          <div />
        </div>

        {/* Nota aclaratoria */}
        <div className="flex items-start gap-2 px-1 py-2 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <span className="font-bold">Hoja física del PDF</span> — el número que aparece en la barra inferior de tu lector (ej: "3 / 48"), no el número impreso dentro del documento.
          </p>
        </div>

        {/* Filas */}
        {recs.map((rec) => (
          <div key={rec.id} className="grid grid-cols-[90px_1fr_1fr_32px] gap-2 items-start">
            <input
              type="text"
              placeholder="Ej: 38, 40-42"
              value={rec.pageNumber}
              onChange={e => updateRow(rec.id, 'pageNumber', e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <input
              type="text"
              placeholder="Ej: Diagrama eléctrico PCB"
              value={rec.contentType}
              onChange={e => updateRow(rec.id, 'contentType', e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <input
              type="text"
              placeholder="Ej: Circuito impreso SNGL2.Q con componentes y conexiones"
              value={rec.instruction}
              onChange={e => updateRow(rec.id, 'instruction', e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <button
              onClick={() => removeRow(rec.id)}
              disabled={recs.length === 1}
              className="flex h-9 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Acciones */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={addRow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar fila
          </button>

          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
          >
            {isScanning ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Escaneando…</>
            ) : (
              <><Send className="h-3.5 w-3.5" /> Analizar mis recomendaciones</>
            )}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
            <XCircle className="h-4 w-4" /> {error}
          </p>
        )}
      </div>

      {/* Resultados del escaneo */}
      {scanResults !== null && (
        <div className="border-t border-blue-200 p-5 space-y-4">

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-800">Resultados del escaneo</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {found} guardada{found !== 1 ? 's' : ''}
              </span>
              {notFound > 0 && (
                <span className="flex items-center gap-1.5 font-semibold text-red-600">
                  <XCircle className="h-3.5 w-3.5" />
                  {notFound} sin imagen en esa página
                </span>
              )}
            </div>
            <button
              onClick={() => setScanResults(null)}
              className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Limpiar
            </button>
          </div>

          <div className="space-y-3">
            {scanResults.map((result, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-xl border p-4 space-y-2",
                  result.found ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/40",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-mono font-bold flex-shrink-0",
                      result.found ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600",
                    )}>
                      {result.pageNumber}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-700">{result.contentType || 'Imagen técnica'}</p>
                      <p className="text-[11px] text-slate-500 italic">"{result.instruction}"</p>
                    </div>
                  </div>
                  <span className={cn(
                    "flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold",
                    result.found
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-red-100 text-red-600 border border-red-200",
                  )}>
                    {result.found
                      ? <><CheckCircle2 className="h-3 w-3" /> Guardada</>
                      : <><XCircle      className="h-3 w-3" /> Sin imagen</>
                    }
                  </span>
                </div>

                {/* Vista previa de imagen guardada */}
                {result.found && result.imageUrl && (
                  <div className="flex gap-3 items-start mt-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.imageUrl}
                      alt={result.description ?? 'Imagen encontrada'}
                      className="w-24 h-16 object-cover rounded-lg border border-emerald-300 flex-shrink-0"
                    />
                    {result.description && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-4">{result.description}</p>
                    )}
                  </div>
                )}

                {/* Nota de no-coincidencia (informativa, no bloquea el guardado) */}
                {result.found && result.mismatchReason && (
                  <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      <span className="font-bold">Nota del agente:</span> {result.mismatchReason}
                    </p>
                  </div>
                )}

                {/* Razón de por qué no había imagen en la página */}
                {!result.found && result.notFoundReason && (
                  <div className="rounded-lg bg-white border border-red-200 p-3 space-y-1">
                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Por qué no hay imagen en esta página
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">{result.notFoundReason}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {notFound > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                <span className="font-bold">Acción recomendada:</span> Las páginas sin imagen son texto puro o tienen gráficos vectoriales no rasterizables.
                Verifica con el número físico de hoja en tu lector PDF.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── RecommendationsTab ──────────────────────────────────────────────────── */

interface AuditorRecommendation {
  pageNumber: number;
  reason:     string;
  context:    string;
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
      <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <Ghost className="h-8 w-8 opacity-30" />
        <p className="text-sm font-medium">Sin fantasmas detectados</p>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          El Auditor no encontró referencias a figuras o diagramas sin imagen correspondiente.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-2 px-1 pb-1">
        <Ghost className="h-4 w-4 text-amber-500" />
        <p className="text-xs text-slate-500">
          El Auditor detectó <span className="font-semibold text-slate-700">{recommendations.length}</span> posible{recommendations.length !== 1 ? "s" : ""} imagen{recommendations.length !== 1 ? "es" : ""} que el texto menciona pero no se pudo extraer.
        </p>
      </div>
      {recommendations.map((rec, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700 flex-shrink-0 font-mono text-xs font-bold">
            {rec.pageNumber}
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold text-amber-800 leading-snug">{rec.reason}</p>
            <p className="text-xs text-slate-600 leading-relaxed">{rec.context}</p>
          </div>
          <div className="flex-shrink-0 self-start">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold border border-amber-200">
              <AlertTriangle className="h-2.5 w-2.5" />
              Fantasma
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── PipelineTab ─────────────────────────────────────────────────────────── */

function PipelineTab({ agentLogs, document }: { agentLogs: AgentLogSummary[]; document: any }) {
  return (
    <div className="p-5 space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timeline de Agentes</h3>
        </div>
        <AgentTimeline agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Diálogo entre Agentes</h3>
        </div>
        <AgentMessage agentLogs={agentLogs} />
      </section>

      <div className="border-t border-slate-100" />

      <section>
        <div className="flex items-center gap-2 mb-3">
          <BarChart2 className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uso de Tokens (estimado)</h3>
        </div>
        <TokenMeter agentLogs={agentLogs} document={document} />
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
}: Props) {
  const [activeTab,  setActiveTab]  = useState<"pipeline" | "chunks" | "images" | "recommendations">("pipeline");
  const [agentLogs,  setAgentLogs]  = useState<AgentLogSummary[]>(initialAgentLogs);
  const [docStatus,  setDocStatus]  = useState(initialDocStatus);
  const [docData,    setDocData]    = useState(initialDoc);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    { key: "pipeline"        as const, label: "Pipeline",        Icon: Cpu,       count: agentLogs.length, live: !TERMINAL_STATUSES.has(docStatus) },
    { key: "chunks"          as const, label: "Texto (Chunks)",  Icon: FileType2, count: chunks.length,    live: false },
    { key: "images"          as const, label: "Imágenes",        Icon: Eye,       count: images.length,    live: false, badge: pendingReview > 0 ? pendingReview : undefined },
    { key: "recommendations" as const, label: "Recomendaciones", Icon: Ghost,     count: auditorCount,     live: false },
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

            {tab.live && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
            )}

            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500",
            )}>
              {tab.count}
            </span>

            {'badge' in tab && tab.badge !== undefined && (
              <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div className="min-h-64">
        {activeTab === "pipeline"        && <PipelineTab agentLogs={agentLogs} document={docData} />}
        {activeTab === "chunks"          && <ChunksTab chunks={chunks} />}
        {activeTab === "images"          && <ImagesTab  images={images} documentId={documentId} />}
        {activeTab === "recommendations" && <RecommendationsTab document={docData} />}
      </div>
    </div>
  );
}

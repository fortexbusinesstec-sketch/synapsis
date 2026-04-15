"use client";

import { useState, useCallback } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLogSummary } from "@/lib/db/schema";

/**
 * FINOPS UI — Visualización de costos reales vs estimados.
 * - Agentes con docField: usa el costo exacto guardado en la tabla documents.
 * - Agente Curioso (background): calcula el costo desde tokens × tasa gpt-4o-mini.
 *
 * Tarifas gpt-4o-mini (OpenAI, USD / 1M tokens):
 *   Input: $0.15   Output: $0.60
 */

// Tasa gpt-4o-mini para calcular costo del curioso desde tokens del log
const CURIOUS_RATE = { input: 0.15 / 1_000_000, output: 0.60 / 1_000_000 };

interface AgentEntry {
  label:    string;
  color:    string;
  docField: string | null;   // null → calcular desde tokens
  model:    string;
}

const AGENT_CONFIG: Record<string, AgentEntry> = {
  orchestrator: { label: "Orchestrator",    color: "bg-blue-400",    docField: "costOrchestrator", model: "gpt-4o-mini"        },
  ocr:          { label: "OCR (Mistral)",   color: "bg-teal-400",    docField: "costOcr",          model: "mistral-ocr-latest" },
  vision:       { label: "Vision (Pixtral)",color: "bg-amber-400",   docField: "costVision",       model: "pixtral-12b"        },
  chunker:      { label: "Chunker",         color: "bg-emerald-400", docField: "costChunker",      model: "gpt-4o-mini"        },
  embedder:     { label: "Embedder",        color: "bg-violet-400",  docField: "costEmbedder",     model: "text-embedding-3-small"},
  curious:      { label: "Curioso",         color: "bg-pink-400",    docField: null,               model: "gpt-4o-mini"        },
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatCost(usd: number): string {
  if (usd === 0 || !usd) return "$0.000000";
  if (usd < 0.000001)    return `$${usd.toExponential(2)}`;
  return `$${usd.toFixed(6)}`;
}

function formatTokens(n: number | null): string {
  if (!n || n === 0) return "0";
  if (n >= 1000)     return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/* ── Tipos de recalculo ──────────────────────────────────────────────────── */

interface RecalcData {
  pageCount:  number;
  hitlImages: number;
  costOcr:    number;
  costVision: number;
  totalCost:  number;
}

/* ── Componente ──────────────────────────────────────────────────────────── */

export function TokenMeter({
  agentLogs,
  document
}: {
  agentLogs: AgentLogSummary[];
  document: any
}) {
  // ── Estado local de costos (se actualiza sin recargar la página) ────────
  const [liveDoc,      setLiveDoc]    = useState<any>(document);
  const [recalcState,  setRecalc]     = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [recalcDetail, setDetail]     = useState<string | null>(null);

  // Inicializar recalcData desde los costos ya guardados en la BD.
  // Si costOcr > 0 ó costVision > 0, el usuario ya había recalculado antes —
  // reconstruimos las métricas por ingeniería inversa de las fórmulas:
  //   pageCount  = costOcr    / 0.001   (inverso de páginas × $0.001)
  //   hitlImages = costVision / 0.0002  (inverso de imgs × $0.0002)
  const [recalcData, setRecalcData] = useState<RecalcData | null>(() => {
    const costOcr    = document?.costOcr    ?? 0;
    const costVision = document?.costVision ?? 0;
    if (costOcr > 0 || costVision > 0) {
      return {
        pageCount:  Math.round(costOcr    / 0.001),
        hitlImages: Math.round(costVision / 0.0002),
        costOcr,
        costVision,
        totalCost:  document?.totalCost ?? 0,
      };
    }
    return null;
  });

  const handleRecalculate = useCallback(async () => {
    setRecalc('loading');
    setDetail(null);
    try {
      const res = await fetch(`/api/documents/${liveDoc.id}/recalculate-costs`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      const r: RecalcData = data.recalculated;

      // Actualizar los campos de costo en el estado local
      setLiveDoc((prev: any) => ({
        ...prev,
        costOcr:    r.costOcr,
        costVision: r.costVision,
        totalCost:  r.totalCost,
      }));
      setRecalcData(r);
      setDetail(
        `OCR: ${r.pageCount} págs × $0.001 = $${r.costOcr.toFixed(4)} · ` +
        `Visión: ${r.hitlImages} imgs × $0.0002 = $${r.costVision.toFixed(4)}`
      );
      setRecalc('ok');
    } catch (e: any) {
      setDetail(e.message ?? 'Error al recalcular.');
      setRecalc('error');
    }
  }, [liveDoc.id]);

  // Usamos liveDoc en vez de document para reflejar datos recalculados
  const doc   = liveDoc;
  const ORDER = ["orchestrator", "ocr", "vision", "chunker", "embedder", "curious"];

  // Agrupamos logs por agente (último log gana si hay reintentos)
  const logsMap = agentLogs.reduce((acc, log) => {
    acc[log.agentName] = log;
    return acc;
  }, {} as Record<string, AgentLogSummary>);

  // Costo del Curioso desde tokens × tasa (no tiene docField)
  const curiousLog  = logsMap["curious"];
  const curiousCost = curiousLog
    ? (curiousLog.inputTokens  ?? 0) * CURIOUS_RATE.input +
      (curiousLog.outputTokens ?? 0) * CURIOUS_RATE.output
    : 0;

  const totalInput  = agentLogs.reduce((s, l) => s + (l.inputTokens  ?? 0), 0);
  const totalOutput = agentLogs.reduce((s, l) => s + (l.outputTokens ?? 0), 0);
  // Total exacto (liveDoc ya tiene los costos recalculados si se presionó el botón)
  const exactTotal  = (doc?.totalCost ?? 0) + curiousCost;

  const maxTokens = Math.max(1, ...agentLogs.map((l) => (l.inputTokens ?? 0) + (l.outputTokens ?? 0)));

  // Para barras de OCR/Vision tras recalculo, escalar por costo relativo al máximo costo de todos los agentes
  const recalcMaxCost = recalcData
    ? Math.max(
        doc?.costOrchestrator ?? 0,
        recalcData.costOcr,
        recalcData.costVision,
        doc?.costChunker      ?? 0,
        doc?.costEmbedder     ?? 0,
        curiousCost,
        0.000001,
      )
    : 1;

  return (
    <div className="space-y-2">
      {/* Cabecera de columnas */}
      <div className="grid grid-cols-[8rem_1fr_6rem_6rem_7rem] items-center gap-3 pb-1 border-b border-slate-100">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Agente</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tokens / Unidad</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Input</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Output</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Costo USD</span>
      </div>

      {/* Filas por agente */}
      {ORDER.map((agentKey) => {
        const log = logsMap[agentKey];
        const cfg = AGENT_CONFIG[agentKey];

        // Costo: docField del liveDoc si existe, o cálculo por tokens (curious)
        const exactCost = cfg.docField !== null
          ? (doc?.[cfg.docField] ?? 0)
          : curiousCost;

        const inputToks   = log?.inputTokens  ?? 0;
        const outputToks  = log?.outputTokens ?? 0;
        const totalTokens = inputToks + outputToks;

        const isCurious    = agentKey === "curious";
        const isBackground = isCurious && !log;
        const isOcr        = agentKey === "ocr";
        const isVision     = agentKey === "vision";

        // Tras recalcular, OCR y Vision usan costo relativo para la barra
        const wasRecalculated = recalcData !== null && (isOcr || isVision);

        let barPct: number;
        if (wasRecalculated) {
          barPct = Math.max(5, (exactCost / recalcMaxCost) * 100);
        } else {
          barPct = Math.max(3, (totalTokens / maxTokens) * 100);
        }

        // Etiqueta de "unidad" para OCR (páginas) y Vision (imágenes)
        const unitLabel = isOcr && recalcData
          ? `${recalcData.pageCount} págs`
          : isVision && recalcData
          ? `${recalcData.hitlImages} imgs`
          : null;

        return (
          <div
            key={agentKey}
            className={cn(
              "grid grid-cols-[8rem_1fr_6rem_6rem_7rem] items-center gap-3 rounded-lg transition-colors duration-300",
              wasRecalculated && "bg-slate-50/80 -mx-1 px-1 py-0.5",
            )}
          >
            {/* Nombre + modelo */}
            <div className="min-w-0">
              <span className="text-xs font-medium text-slate-700 truncate block">
                {cfg.label}
              </span>
              <span className="text-[9px] text-slate-400 truncate block">{cfg.model}</span>
            </div>

            {/* Barra proporcional al costo (OCR/Vision) o a los tokens (resto) */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              {wasRecalculated || totalTokens > 0 ? (
                <div
                  className={cn("h-full rounded-full transition-all duration-700", cfg.color)}
                  style={{ width: `${barPct}%` }}
                />
              ) : (
                <div className={cn(
                  "h-full rounded-full w-[3%]",
                  isBackground ? "bg-pink-100 animate-pulse" : "bg-slate-200",
                )} />
              )}
            </div>

            {/* Columna "Input": tokens normales, o cantidad de páginas/imágenes */}
            <span className={cn(
              "text-right text-[11px] font-mono",
              wasRecalculated ? "text-slate-700 font-semibold" : "text-slate-500",
            )}>
              {wasRecalculated
                ? unitLabel
                : log
                  ? formatTokens(inputToks)
                  : isBackground ? "…" : "—"
              }
            </span>

            {/* Columna "Output": tokens normales, o badge de unidad */}
            <span className="text-right text-[11px] font-mono text-slate-500">
              {wasRecalculated ? (
                <span className={cn(
                  "inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide",
                  isOcr    ? "bg-teal-100 text-teal-700"   : "",
                  isVision ? "bg-amber-100 text-amber-700" : "",
                )}>
                  {isOcr ? "pág" : "img"}
                </span>
              ) : log
                ? formatTokens(outputToks)
                : isBackground ? "…" : "—"
              }
            </span>

            {/* Costo USD */}
            <div className="text-right">
              <span className={cn(
                "text-[11px] font-mono",
                exactCost > 0 ? "text-slate-700" : "text-slate-300",
                wasRecalculated && "font-bold text-slate-900",
              )}>
                {formatCost(exactCost)}
              </span>
              {wasRecalculated && (
                <span className={cn(
                  "block text-[9px] font-bold",
                  isOcr    ? "text-teal-500"   : "",
                  isVision ? "text-amber-500"  : "",
                )}>
                  recalculado ✓
                </span>
              )}
              {isCurious && exactCost > 0 && (
                <span className="block text-[9px] text-pink-400">calculado</span>
              )}
              {isCurious && !log && (
                <span className="block text-[9px] text-slate-300">background</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Separador + Total */}
      <div className="border-t border-slate-100 pt-2 mt-1">
        <div className="grid grid-cols-[8rem_1fr_6rem_6rem_7rem] items-center gap-3">
          <span className="text-xs font-bold text-slate-700">Total</span>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-slate-400 w-full transition-all duration-700" />
          </div>
          <span className="text-right text-[11px] font-mono font-bold text-slate-600">
            {formatTokens(totalInput)}
          </span>
          <span className="text-right text-[11px] font-mono font-bold text-slate-600">
            {formatTokens(totalOutput)}
          </span>
          <span className="text-right text-[11px] font-mono font-bold text-blue-600">
            {formatCost(exactTotal)}
          </span>
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400 text-right">
          Pipeline: costos exactos del backend · Curioso: calculado (tokens × tarifa gpt-4o-mini)
        </p>
      </div>

      {/* ── Botón Recalcular Costos ─────────────────────────────── */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <button
            onClick={handleRecalculate}
            disabled={recalcState === 'loading'}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-sm border",
              recalcState === 'ok'
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : recalcState === 'error'
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                : "bg-blue-600 hover:bg-blue-700 text-white border-transparent disabled:bg-blue-400",
            )}
          >
            {recalcState === 'loading' ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Recalculando…</>
            ) : recalcState === 'ok' ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Costos actualizados</>
            ) : recalcState === 'error' ? (
              <><AlertCircle className="h-3.5 w-3.5" /> Reintentar</>
            ) : (
              <><RefreshCw className="h-3.5 w-3.5" /> Recalcular Costos</>
            )}
          </button>

          <div className="flex items-start gap-1.5 min-w-0">
            <Info className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 mt-0.5" />
            {recalcDetail ? (
              <p className={cn(
                "text-[10px] leading-relaxed",
                recalcState === 'error' ? "text-red-500" : "text-slate-500"
              )}>
                {recalcDetail}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Suma OCR (págs × $0.001) + Visión HITL (imgs × $0.0002). Preserva costos del pipeline automático.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

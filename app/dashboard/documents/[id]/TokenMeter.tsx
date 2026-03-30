"use client";

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
  orchestrator: { label: "Orchestrator",    color: "bg-blue-400",    docField: "costOrchestrator", model: "gpt-4o-mini"       },
  ocr:          { label: "OCR (Mistral)",   color: "bg-teal-400",    docField: "costOcr",          model: "mistral-ocr-latest"},
  vision:       { label: "Vision (Pixtral)",color: "bg-amber-400",   docField: "costVision",       model: "pixtral-12b"       },
  chunker:      { label: "Chunker",         color: "bg-emerald-400", docField: "costChunker",      model: "gpt-4o-mini"       },
  embedder:     { label: "Embedder",        color: "bg-violet-400",  docField: "costEmbedder",     model: "text-embedding-3-small"},
  curious:      { label: "Curioso",         color: "bg-pink-400",    docField: null,               model: "gpt-4o-mini"       },
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

/* ── Componente ──────────────────────────────────────────────────────────── */

export function TokenMeter({
  agentLogs,
  document
}: {
  agentLogs: AgentLogSummary[];
  document: any
}) {
  const ORDER = ["orchestrator", "ocr", "vision", "chunker", "embedder", "curious"];

  // Agrupamos logs por agente (último log gana si hay reintentos)
  const logsMap = agentLogs.reduce((acc, log) => {
    acc[log.agentName] = log;
    return acc;
  }, {} as Record<string, AgentLogSummary>);

  // Costo del Curioso desde tokens × tasa (no tiene docField)
  const curiousLog      = logsMap["curious"];
  const curiousCost     = curiousLog
    ? (curiousLog.inputTokens  ?? 0) * CURIOUS_RATE.input +
      (curiousLog.outputTokens ?? 0) * CURIOUS_RATE.output
    : 0;

  const totalInput  = agentLogs.reduce((s, l) => s + (l.inputTokens  ?? 0), 0);
  const totalOutput = agentLogs.reduce((s, l) => s + (l.outputTokens ?? 0), 0);
  // Total exacto del backend + costo calculado del curioso
  const exactTotal  = (document?.totalCost ?? 0) + curiousCost;

  const maxTokens = Math.max(1, ...agentLogs.map((l) => (l.inputTokens ?? 0) + (l.outputTokens ?? 0)));

  return (
    <div className="space-y-2">
      {/* Cabecera de columnas */}
      <div className="grid grid-cols-[8rem_1fr_6rem_6rem_7rem] items-center gap-3 pb-1 border-b border-slate-100">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Agente</span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tokens</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Input</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Output</span>
        <span className="text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Costo USD</span>
      </div>

      {/* Filas por agente */}
      {ORDER.map((agentKey) => {
        const log = logsMap[agentKey];
        const cfg = AGENT_CONFIG[agentKey];

        // Costo: docField del documento si existe, o cálculo por tokens (curious)
        const exactCost = cfg.docField !== null
          ? (document?.[cfg.docField] ?? 0)
          : curiousCost;

        const inputToks   = log?.inputTokens  ?? 0;
        const outputToks  = log?.outputTokens ?? 0;
        const totalTokens = inputToks + outputToks;
        const barPct      = Math.max(3, (totalTokens / maxTokens) * 100);

        const isCurious   = agentKey === "curious";
        const isBackground = isCurious && !log;

        return (
          <div key={agentKey} className="grid grid-cols-[8rem_1fr_6rem_6rem_7rem] items-center gap-3">
            {/* Nombre + modelo */}
            <div className="min-w-0">
              <span className="text-xs font-medium text-slate-700 truncate block">
                {cfg.label}
              </span>
              <span className="text-[9px] text-slate-400 truncate block">{cfg.model}</span>
            </div>

            {/* Barra de tokens */}
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              {totalTokens > 0 ? (
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

            {/* Tokens input */}
            <span className="text-right text-[11px] font-mono text-slate-500">
              {log ? formatTokens(inputToks) : (isBackground ? "…" : "—")}
            </span>

            {/* Tokens output */}
            <span className="text-right text-[11px] font-mono text-slate-500">
              {log ? formatTokens(outputToks) : (isBackground ? "…" : "—")}
            </span>

            {/* Costo USD */}
            <div className="text-right">
              <span className={cn(
                "text-[11px] font-mono",
                exactCost > 0 ? "text-slate-700" : "text-slate-300",
              )}>
                {formatCost(exactCost)}
              </span>
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
    </div>
  );
}

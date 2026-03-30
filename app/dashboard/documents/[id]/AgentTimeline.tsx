"use client";

import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentLogSummary } from "@/lib/db/schema";

/* ── Metadata de cada agente ─────────────────────────────────────────────── */

const AGENT_META: Record<
  string,
  { label: string; model: string; color: string; bg: string; dot: string }
> = {
  orchestrator: {
    label: "Orchestrator",
    model: "gpt-4o-mini",
    color: "text-blue-700",
    bg:    "bg-blue-50 border-blue-200",
    dot:   "bg-blue-500",
  },
  ocr: {
    label: "OCR",
    model: "mistral-ocr-latest",
    color: "text-teal-700",
    bg:    "bg-teal-50 border-teal-200",
    dot:   "bg-teal-500",
  },
  vision: {
    label: "Vision",
    model: "pixtral-12b-2409",
    color: "text-amber-700",
    bg:    "bg-amber-50 border-amber-200",
    dot:   "bg-amber-500",
  },
  chunker: {
    label: "Chunker",
    model: "local (semántico)",
    color: "text-emerald-700",
    bg:    "bg-emerald-50 border-emerald-200",
    dot:   "bg-emerald-500",
  },
  embedder: {
    label: "Embedder",
    model: "text-embedding-3-small",
    color: "text-violet-700",
    bg:    "bg-violet-50 border-violet-200",
    dot:   "bg-violet-500",
  },
};

const DEFAULT_META = {
  label: "Agente",
  model: "—",
  color: "text-slate-600",
  bg:    "bg-slate-50 border-slate-200",
  dot:   "bg-slate-400",
};

function getAgentMeta(name: string) {
  return AGENT_META[name] ?? { ...DEFAULT_META, label: name };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000)  return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "done")    return <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />;
  if (status === "error")   return <XCircle      className="h-4 w-4 text-red-500 flex-shrink-0" />;
  if (status === "running") return <Loader2      className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />;
  return <span className="h-4 w-4 rounded-full bg-slate-200 flex-shrink-0 inline-block" />;
}

/* ── Componente principal ────────────────────────────────────────────────── */

export function AgentTimeline({ agentLogs }: { agentLogs: AgentLogSummary[] }) {
  // Calcular el máximo durationMs para normalizar las barras
  const maxMs = Math.max(
    1,
    ...agentLogs.map((l) => l.durationMs ?? 0),
  );

  // Orden canónico del pipeline
  const ORDER = ["orchestrator", "ocr", "vision", "chunker", "embedder"];
  const sorted = [...agentLogs].sort(
    (a, b) => ORDER.indexOf(a.agentName) - ORDER.indexOf(b.agentName),
  );

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Esperando inicio del pipeline…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((log) => {
        const meta      = getAgentMeta(log.agentName);
        const barWidth  = log.durationMs != null
          ? Math.max(3, (log.durationMs / maxMs) * 100)
          : 0;
        const isRunning = log.status === "running";
        const isError   = log.status === "error";

        return (
          <div key={log.id} className="space-y-1.5">
            {/* Fila principal */}
            <div className="flex items-center gap-3">
              {/* Dot de color */}
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", meta.dot)} />

              {/* Nombre + modelo */}
              <div className="w-44 flex-shrink-0">
                <p className={cn("text-sm font-semibold leading-none", meta.color)}>
                  {meta.label}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{meta.model}</p>
              </div>

              {/* Barra de duración */}
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                {isRunning ? (
                  <div className="h-full rounded-full bg-blue-400 animate-pulse w-1/3" />
                ) : (
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      isError ? "bg-red-400" : "bg-emerald-400",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                )}
              </div>

              {/* Duración */}
              <span className="w-14 text-right text-xs font-mono text-slate-500 flex-shrink-0">
                {isRunning ? (
                  <span className="text-blue-500 animate-pulse">…</span>
                ) : (
                  formatDuration(log.durationMs)
                )}
              </span>

              {/* Status icon */}
              <StatusIcon status={log.status} />

              {/* Tokens */}
              <span className="w-28 text-right text-[11px] text-slate-400 flex-shrink-0">
                {(log.inputTokens ?? 0) > 0 || (log.outputTokens ?? 0) > 0
                  ? `${log.inputTokens ?? 0} → ${log.outputTokens ?? 0} tok`
                  : "—"}
              </span>
            </div>

            {/* Summaries */}
            {(log.inputSummary || log.outputSummary) && (
              <div className="ml-5 pl-5 border-l-2 border-slate-100 space-y-0.5">
                {log.inputSummary && (
                  <p className="text-[11px] text-slate-400">
                    <span className="font-medium text-slate-500">IN: </span>
                    {log.inputSummary}
                  </p>
                )}
                {log.outputSummary && (
                  <p className="text-[11px] text-slate-500">
                    <span className="font-medium">OUT: </span>
                    {log.outputSummary}
                  </p>
                )}
              </div>
            )}

            {/* Error message */}
            {isError && log.errorMessage && (
              <div className="ml-5 flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-600 font-mono">{log.errorMessage}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

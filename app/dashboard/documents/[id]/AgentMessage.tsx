"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AgentLogSummary } from "@/lib/db/schema";

/* ── Colores por agente ──────────────────────────────────────────────────── */

const AGENT_STYLE: Record<
  string,
  { label: string; iconBg: string; iconText: string; initial: string }
> = {
  orchestrator: {
    label:    "Orchestrator",
    iconBg:   "bg-blue-100",
    iconText: "text-blue-700",
    initial:  "O",
  },
  ocr: {
    label:    "OCR",
    iconBg:   "bg-teal-100",
    iconText: "text-teal-700",
    initial:  "R",
  },
  vision: {
    label:    "Vision",
    iconBg:   "bg-amber-100",
    iconText: "text-amber-700",
    initial:  "V",
  },
  chunker: {
    label:    "Chunker",
    iconBg:   "bg-emerald-100",
    iconText: "text-emerald-700",
    initial:  "C",
  },
  embedder: {
    label:    "Embedder",
    iconBg:   "bg-violet-100",
    iconText: "text-violet-700",
    initial:  "E",
  },
};

const DEFAULT_STYLE = {
  label:    "Agente",
  iconBg:   "bg-slate-100",
  iconText: "text-slate-600",
  initial:  "A",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function relativeTime(isoString: string | null): string {
  if (!isoString) return "";
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffS  = Math.floor(diffMs / 1000);
  if (diffS < 5)   return "ahora";
  if (diffS < 60)  return `hace ${diffS}s`;
  const diffM = Math.floor(diffS / 60);
  if (diffM < 60)  return `hace ${diffM}m`;
  return `hace ${Math.floor(diffM / 60)}h`;
}

// Orden canónico para determinar "siguiente agente"
const PIPELINE_ORDER = ["orchestrator", "ocr", "vision", "chunker", "embedder"];

function getNextAgent(currentName: string): string | null {
  const idx = PIPELINE_ORDER.indexOf(currentName);
  return idx >= 0 && idx < PIPELINE_ORDER.length - 1
    ? PIPELINE_ORDER[idx + 1]
    : null;
}

/* ── Componente ──────────────────────────────────────────────────────────── */

export function AgentMessage({ agentLogs }: { agentLogs: AgentLogSummary[] }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Solo mostrar agentes terminados con outputSummary
  const messages = agentLogs.filter(
    (l) => (l.status === "done" || l.status === "error") && l.outputSummary,
  );

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400 py-6">
        Los mensajes aparecerán conforme los agentes completen su trabajo.
      </p>
    );
  }

  return (
    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
      {messages.map((log) => {
        const style     = AGENT_STYLE[log.agentName] ?? {
          ...DEFAULT_STYLE,
          label: log.agentName,
        };
        const nextAgent = getNextAgent(log.agentName);
        const nextStyle = nextAgent
          ? (AGENT_STYLE[nextAgent] ?? DEFAULT_STYLE)
          : null;
        const isError   = log.status === "error";

        return (
          <div key={log.id} className="flex items-start gap-3">
            {/* Avatar del agente */}
            <div
              className={cn(
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                style.iconBg,
                style.iconText,
              )}
            >
              {style.initial}
            </div>

            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className={cn("text-xs font-semibold", style.iconText)}>
                  {style.label}
                </span>
                {nextStyle && !isError && (
                  <>
                    <span className="text-slate-300 text-xs">→</span>
                    <span className={cn("text-xs font-semibold", nextStyle.iconText)}>
                      {nextStyle.label}
                    </span>
                  </>
                )}
                <span className="text-[10px] text-slate-400 ml-auto">
                  {relativeTime(log.endedAt)}
                </span>
              </div>

              {/* Mensaje */}
              <p
                className={cn(
                  "mt-0.5 text-xs leading-relaxed rounded-lg px-3 py-1.5 inline-block",
                  isError
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-slate-50 text-slate-600",
                )}
              >
                {isError ? (log.errorMessage ?? log.outputSummary) : log.outputSummary}
              </p>
            </div>
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
}

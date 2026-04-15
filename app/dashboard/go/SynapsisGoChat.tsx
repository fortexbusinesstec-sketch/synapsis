"use client";

import {
  useState, useEffect, useRef, useCallback, memo
} from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Loader2, ChevronDown, AlertTriangle,
  Cpu, Trash2, ExternalLink, Zap, Activity, ShieldCheck,
  Layout, Sparkles, FlaskConical, BookMarked,
  Copy, Check, Plus, SlidersHorizontal, X
} from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from "@/lib/utils";
import type { EquipmentModel } from "./page";

/* ── Urgency config ──────────────────────────────────────────────────────── */

const URGENCY = {
  baja: { label: "Baja", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", dot: "bg-emerald-500", pulse: false },
  media: { label: "Media", bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", dot: "bg-blue-500", pulse: false },
  alta: { label: "Alta", bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", dot: "bg-orange-500", pulse: false },
  critica: { label: "Crítica", bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20", dot: "bg-red-500", pulse: true },
} as const;

/* ── Synthetic empty stream (when clarification is intercepted) ──────────── */

function makeEmptyDataStream(): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('0:""\n'));
      controller.enqueue(encoder.encode('d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "x-vercel-ai-data-stream": "v1",
    },
  });
}

/* ── RatingBar ───────────────────────────────────────────────────────────── */

function RatingBar({
  messageId,
  sessionId,
  onRate,
  rated,
}: {
  messageId: string;
  sessionId: string;
  onRate: (rating: number) => void;
  rated: number | null;
}) {
  const [submitting, setSubmitting] = useState(false);

  const handleRate = async (rating: number) => {
    if (rated !== null || submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/chat/metrics/rating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, rating, sessionId }),
      });
      onRate(rating);
    } catch { /* silencioso */ }
    finally { setSubmitting(false); }
  };

  return (
    <div className="flex items-center gap-2 mt-2 pl-1">
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        ¿Fue útil?
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => handleRate(n)}
            disabled={rated !== null || submitting}
            className={cn(
              "w-6 h-6 rounded-lg text-[11px] font-bold transition-all",
              rated === n
                ? "bg-blue-600 text-white shadow-sm"
                : rated !== null
                  ? "bg-slate-100 text-slate-300 cursor-not-allowed"
                  : "bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── UI Components ───────────────────────────────────────────────────────── */

const UserMessageItem = memo(({ content }: { content: string }) => {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    if (textRef.current) {
      setIsClamped(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [content]);

  return (
    <div className="w-full flex flex-col items-end mb-8 group">
      <div className="max-w-[85%] sm:max-w-2xl px-6 py-4 rounded-[2rem] rounded-tr-sm bg-zinc-100 border border-zinc-200/50 text-zinc-800 text-sm leading-relaxed shadow-sm transition-all group-hover:shadow-md">
        <div 
          ref={textRef} 
          className={cn(
            "overflow-hidden transition-all duration-300", 
            !expanded && "line-clamp-3 md:line-clamp-5"
          )}
        >
          {content}
        </div>
        {(isClamped || expanded) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-blue-600 transition-colors"
          >
            {expanded ? "Mostrar menos" : "Ver más"}
          </button>
        )}
      </div>
    </div>
  );
});
UserMessageItem.displayName = "UserMessageItem";

const AiMessageItem = memo(({ m, rated, onRate, sessionMode, servMsgId, sessionId, isStreaming }: any) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "w-full py-8 transition-colors duration-500 rounded-[2rem]",
      isStreaming ? "bg-white" : "bg-zinc-50/30"
    )}>
      <div className="flex items-start gap-5 max-w-4xl mx-auto px-4 md:px-6">
        {/* Logo */}
        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 mt-0.5">
          <Activity className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-relaxed text-zinc-800 w-full font-sans">
            <div className="prose prose-neutral max-w-none text-gray-800 leading-snug prose-p:my-4 prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 prose-li:marker:text-gray-500">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="text-sm font-black text-zinc-900 mt-4 mb-2 uppercase tracking-wider">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-black text-zinc-900 mt-3 mb-1 uppercase tracking-widest">{children}</h3>,
                  strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-outside space-y-2 my-3 ml-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside space-y-2 my-3 ml-4">{children}</ol>,
                  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
                  p: ({ children }) => <p className="leading-relaxed text-zinc-800 mb-4 last:mb-0">{children}</p>,
                  hr: () => <hr className="my-5 border-zinc-100" />
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-1 h-3 mt-1 bg-blue-600 animate-pulse align-middle opacity-50" />
            )}
          </div>

          {/* Action Bar - Only visible when done */}
          {!isStreaming && m.content && (
            <div className="flex items-center justify-between mt-6 text-sm text-zinc-500 border-t border-zinc-100/50 pt-4 animate-in fade-in duration-700">
              <div className="flex-1">
                {sessionMode === "record" && servMsgId && (
                  <RatingBar
                    messageId={servMsgId}
                    sessionId={sessionId ?? ""}
                    onRate={onRate}
                    rated={rated}
                  />
                )}
              </div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all text-[11px] font-black uppercase tracking-widest text-zinc-500 shadow-sm"
                title="Copiar respuesta"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? <span className="text-emerald-500">Copiado</span> : "Copiar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
AiMessageItem.displayName = "AiMessageItem";

/* ── AgentFlags ──────────────────────────────────────────────────────────── */

interface AgentFlags {
  clarifier:  boolean;
  planner:    boolean;
  textSearch: boolean;
  imgSearch:  boolean;
  analyst:    boolean;
  metrifier:  boolean;
}

const DEFAULT_AGENT_FLAGS: AgentFlags = {
  clarifier:  true,
  planner:    true,
  textSearch: true,
  imgSearch:  true,
  analyst:    true,
  metrifier:  true,
};

const AGENT_LABELS: Record<keyof AgentFlags, { label: string; desc: string }> = {
  clarifier:  { label: "Clarificador",       desc: "Expande y clasifica la query (N0)" },
  planner:    { label: "Planificador",        desc: "Genera plan de búsqueda dual (N1)" },
  textSearch: { label: "Búsqueda Texto",      desc: "Retrieval vectorial de chunks (N2A)" },
  imgSearch:  { label: "Búsqueda Imágenes",   desc: "Retrieval vectorial de diagramas (N2B)" },
  analyst:    { label: "Analista",            desc: "Evalúa suficiencia y controla loops (N3)" },
  metrifier:  { label: "Metrificador",        desc: "Persiste métricas y mensajes (N5)" },
};

/* ── SynapsisGoChat ──────────────────────────────────────────────────────── */

export function SynapsisGoChat({ models }: { models: EquipmentModel[] }) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<"test" | "record">("test");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [agentFlags, setAgentFlags] = useState<AgentFlags>(DEFAULT_AGENT_FLAGS);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const agentFlagsRef = useRef<AgentFlags>(DEFAULT_AGENT_FLAGS);
  // messageServerIds[i] maps assistant message index → server messageId for rating
  const messageServerIdsRef = useRef<string[]>([]);
  const assistantMsgIndexRef = useRef(0);

  // Refs used inside fetch override closure (avoid stale closures)
  const sessionIdRef = useRef<string | null>(null);
  const sessionModeRef = useRef<"test" | "record">("test");
  const selectedModelRef = useRef<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep refs in sync
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { sessionModeRef.current = sessionMode; }, [sessionMode]);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
  useEffect(() => { agentFlagsRef.current = agentFlags; }, [agentFlags]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, error } = useChat({
    api: "/api/chat",
    body: {
      equipmentModel: selectedModel,
      sessionId,
      sessionMode,
    },

    fetch: useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
      // Inyectar agentFlags en el body de cada request
      let modifiedInit = init;
      if (init?.body) {
        try {
          const parsed = JSON.parse(init.body as string);
          parsed.agentFlags = agentFlagsRef.current;
          modifiedInit = { ...init, body: JSON.stringify(parsed) };
        } catch { /* silencioso — usar init original */ }
      }

      const res = await fetch(url, modifiedInit);

      // Read metrics headers from streaming response
      try {
        const urgencyLevel = res.headers.get("x-urgency-level");
        const servMsgId    = res.headers.get("x-message-id");

        if (urgencyLevel) setUrgency(urgencyLevel);
        if (servMsgId)    messageServerIdsRef.current.push(servMsgId);

      } catch { /* silencioso */ }

      return res;
    }, []),
  });

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Clear empty assistant messages injected by the synthetic empty stream
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.content === "") {
      setMessages(prev => prev.slice(0, -1));
    }
  }, [messages, setMessages]);

  // ── Create session on first submit ──────────────────────────────────────
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionIdRef.current) return sessionIdRef.current;
    try {
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: sessionModeRef.current,
          equipmentModel: selectedModelRef.current || null,
        }),
      });
      const data = await res.json();
      sessionIdRef.current = data.sessionId;
      setSessionId(data.sessionId);
      return data.sessionId;
    } catch (err) {
      console.error("[session] Error creating session:", err);
      return null;
    }
  }, []);

  const onSubmitWithSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await ensureSession();
    handleSubmit(e);
  }, [input, isLoading, ensureSession, handleSubmit]);

  const toggleAgent = useCallback((key: keyof AgentFlags) => {
    setAgentFlags(prev => {
      const next = { ...prev, [key]: !prev[key] };
      agentFlagsRef.current = next;
      return next;
    });
  }, []);

  const activeCount = Object.values(agentFlags).filter(Boolean).length;



  // ── Clear / reset ────────────────────────────────────────────────────────
  const handleClear = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid && sessionModeRef.current === "test") {
      try {
        await fetch(`/api/chat/sessions/${sid}`, { method: "DELETE" });
      } catch { /* ignore */ }
    }
    // Always clear local state
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setUrgency(null);
    messageServerIdsRef.current = [];
    assistantMsgIndexRef.current = 0;
    setRatings({});
  }, [setMessages]);

  // ── Derive visible messages (skip empty assistant stubs) ─────────────────
  const visibleMessages = messages.filter(m => m.content !== "");
  const assistantMessages = visibleMessages.filter(m => m.role === "assistant");

  const modelLabel = (m: EquipmentModel) => m.equipmentModel || "General";

  // Auto-scroll inteligence: keep scrolled to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl relative">

      {/* ── CSS Reset for Spin Buttons and Scrollbars ── */}
      <style jsx global>{`
        textarea::-webkit-inner-spin-button, 
        textarea::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>

      {/* ── Chat Experience ── */}
      <div className="flex flex-col flex-1 min-w-0 relative">

        {/* Header */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 gap-4">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 tracking-tight">Comité de Diagnóstico</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multimodal Activo</span>
                {urgency && (
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1",
                    URGENCY[urgency as keyof typeof URGENCY]?.text,
                  )}>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      URGENCY[urgency as keyof typeof URGENCY]?.dot,
                      URGENCY[urgency as keyof typeof URGENCY]?.pulse && "animate-pulse",
                    )} />
                    {URGENCY[urgency as keyof typeof URGENCY]?.label}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hidden shrink-0">

            {/* ── Agent Panel Toggle ── */}
            <div className="relative">
              <button
                onClick={() => setAgentPanelOpen(v => !v)}
                title="Configurar agentes"
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border",
                  agentPanelOpen
                    ? "bg-slate-900 text-white border-slate-900"
                    : activeCount < 6
                      ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200",
                )}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{activeCount}/6</span>
              </button>

              {agentPanelOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/60 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                      Agentes del Comité
                    </span>
                    <button
                      onClick={() => setAgentPanelOpen(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(Object.keys(AGENT_LABELS) as Array<keyof AgentFlags>).map(key => {
                      const { label, desc } = AGENT_LABELS[key];
                      const enabled = agentFlags[key];
                      return (
                        <button
                          key={key}
                          onClick={() => toggleAgent(key)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left group",
                            enabled
                              ? "bg-slate-50 hover:bg-slate-100"
                              : "bg-red-50/50 hover:bg-red-50 opacity-70",
                          )}
                        >
                          <div>
                            <p className={cn(
                              "text-[12px] font-bold leading-none",
                              enabled ? "text-slate-800" : "text-slate-400 line-through",
                            )}>
                              {label}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                          </div>
                          <div className={cn(
                            "w-8 h-4.5 rounded-full transition-all flex-shrink-0 relative",
                            enabled ? "bg-blue-600" : "bg-slate-200",
                          )} style={{ height: "18px", width: "32px" }}>
                            <div className={cn(
                              "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-all",
                              enabled ? "left-[14px]" : "left-0.5",
                            )} />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {activeCount < 6 && (
                    <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                        Modo degradado activo
                      </p>
                      <p className="text-[10px] text-amber-600 mt-0.5 leading-tight">
                        Los agentes deshabilitados usan fallbacks automáticos. El flujo no se rompe.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => { setAgentFlags(DEFAULT_AGENT_FLAGS); agentFlagsRef.current = DEFAULT_AGENT_FLAGS; }}
                    className="mt-2 w-full text-[10px] font-bold text-slate-400 hover:text-blue-600 uppercase tracking-widest py-1.5 transition-colors"
                  >
                    Restaurar todos
                  </button>
                </div>
              )}
            </div>

            {/* ── Mode Switcher ── */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => { setSessionMode("test"); sessionModeRef.current = "test"; }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  sessionMode === "test"
                    ? "bg-white text-slate-700 shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <FlaskConical className="w-3 h-3" /> Prueba
              </button>
              <button
                onClick={() => { setSessionMode("record"); sessionModeRef.current = "record"; }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  sessionMode === "record"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                <BookMarked className="w-3 h-3" /> Registro
              </button>
            </div>

          </div>
        </div>

        {/* Message Pool */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-0 py-8 scroll-smooth scrollbar-hidden">
          <div className="max-w-4xl mx-auto px-4 md:px-6 w-full space-y-2">
            {visibleMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-[2.5rem] bg-blue-500/10 blur-2xl animate-pulse" />
                  <div className="relative w-24 h-24 rounded-[2.5rem] bg-white border border-slate-100 flex items-center justify-center shadow-2xl transition-transform hover:scale-105 duration-500">
                    <Activity className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Synapsis Go Intelligence</h3>
                  <p className="text-sm text-slate-400 mt-3 max-w-[340px] leading-relaxed mx-auto font-medium">
                    Selecciona el equipo para iniciar un diagnóstico experto con manuales en tiempo real.
                  </p>
                  
                    {/* Selector de Modelos Estilo Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 w-full">
                      {models
                        .filter(m => m.equipmentModel === "3300" || m.equipmentModel === "5500")
                        .map(m => {
                          const active = selectedModel === m.equipmentModel;
                          return (
                            <button
                              key={m.equipmentModel || "gen"}
                              onClick={() => { setSelectedModel(m.equipmentModel || ""); ensureSession(); }}
                              className={cn(
                                "p-6 rounded-[2rem] border transition-all text-left flex items-center gap-5 group",
                                active
                                  ? "bg-blue-600 border-blue-600 shadow-xl shadow-blue-100" 
                                  : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
                              )}
                            >
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                                active ? "bg-white/10 text-white shadow-lg" : "bg-zinc-100 text-zinc-400"
                              )}>
                                <Cpu className="w-6 h-6" />
                              </div>
                              <div>
                                <p className={cn(
                                  "text-[13px] font-black uppercase tracking-tight",
                                  active ? "text-white" : "text-zinc-900"
                                )}>Schindler {m.equipmentModel}</p>
                                <p className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest mt-1",
                                  active ? "text-blue-100" : "text-zinc-400"
                                )}>Manuales Listos</p>
                              </div>
                            </button>
                          )
                        })}
                    </div>
                  
                  {selectedModel !== "" && (
                    <div className="mt-10 animate-in fade-in slide-in-from-top-4 duration-700">
                      <div className="inline-flex items-center gap-3 bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">
                          Estrategia para Schindler {selectedModel} Cargada
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Render messages */}
            {(() => {
              let assistantIdx = 0;
              return visibleMessages.map((m, idx) => {
                if (m.role === "assistant") {
                  const sIdx = assistantIdx++;
                  const servMsgId = messageServerIdsRef.current[sIdx] ?? null;
                  const rated = servMsgId ? (ratings[servMsgId] ?? null) : null;
                  const isLatest = idx === visibleMessages.length - 1;
                  return (
                    <AiMessageItem
                      key={m.id}
                      m={m}
                      rated={rated}
                      onRate={(r: number) => setRatings(prev => ({ ...prev, [servMsgId]: r }))}
                      sessionMode={sessionMode}
                      servMsgId={servMsgId}
                      sessionId={sessionId}
                      isStreaming={isLatest && isLoading}
                    />
                  );
                }

                // User message
                return <UserMessageItem key={m.id} content={m.content} />;
              });
            })()}

            {isLoading && !messages[messages.length - 1]?.content && (
              <div className="flex justify-start py-8 max-w-4xl mx-auto px-4 md:px-6">
                <div className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center mr-5 flex-shrink-0 animate-pulse">
                  <Activity className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="flex gap-1.5 items-center bg-zinc-50 border border-zinc-100 px-6 py-4 rounded-[2rem] rounded-tl-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-zinc-100 pb-8 pt-4">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <form
              onSubmit={onSubmitWithSession}
              className="group relative flex items-end gap-3 bg-zinc-100/50 border border-zinc-200 rounded-[2rem] px-6 py-4 focus-within:bg-white focus-within:border-blue-400 focus-within:ring-8 focus-within:ring-blue-500/5 transition-all duration-500 shadow-sm"
            >
              <TextareaAutosize
                ref={textareaRef as any}
                value={input}
                onChange={handleInputChange}
                minRows={1}
                maxRows={8}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    if (input.trim()) onSubmitWithSession(e as any);
                  }
                }}
                placeholder="Explica la falla o el código de error..."
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] py-1.5 text-zinc-800 placeholder:text-zinc-400 resize-none selection:bg-blue-100 leading-relaxed font-sans"
              />
              <div className="flex items-center gap-3 mb-1">
                {visibleMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClear}
                    title="Nueva Consulta (Limpia contexto)"
                    className="p-2.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300",
                    !input.trim() || isLoading
                      ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                      : "bg-blue-600 text-white shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95",
                  )}
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>

            <div className="mt-4 flex flex-col items-center justify-center">
              <p className="text-[10px] text-center text-zinc-400 font-bold uppercase tracking-widest opacity-80">
                Diagnóstico basado en manuales. Valide físicamente antes de intervenir.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

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
  Copy, Check, Plus, SlidersHorizontal, X,
  Maximize2, ZoomIn, ZoomOut, RotateCcw,
  History as HistoryIcon, MessageSquare, Clock
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

/* ── ZoomableImage Component ─────────────────────────────────────────────── */

function ZoomableImage({ src, alt }: { src: string; alt?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const reset = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

  return (
    <>
      <div className="relative group cursor-zoom-in my-6 rounded-2xl overflow-hidden border border-zinc-200 shadow-sm transition-all hover:shadow-xl hover:border-blue-400">
        <img
          src={src}
          alt={alt}
          className="w-full h-auto object-contain bg-zinc-50"
          onClick={() => setIsOpen(true)}
        />
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 flex items-center justify-center transition-colors pointer-events-none">
          <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
        {alt && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-white/90 backdrop-blur-sm border-t border-zinc-100 text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">
            {alt}
          </div>
        )}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute top-6 right-6 flex items-center gap-3">
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl backdrop-blur-lg">
              <button onClick={() => setScale(s => Math.min(s + 0.5, 4))} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={() => setScale(s => Math.max(s - 0.5, 1))} className="p-2 text-white hover:bg-white/10 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
              <button onClick={reset} className="p-2 text-white hover:bg-white/10 rounded-lg border-l border-white/10"><RotateCcw className="w-5 h-5" /></button>
            </div>
            <button
              onClick={() => { setIsOpen(false); reset(); }}
              className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="w-full h-full flex items-center justify-center p-8 overflow-hidden">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full transition-transform duration-200 cursor-grab active:cursor-grabbing shadow-2xl"
              style={{
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Dynamic Thinking State ──────────────────────────────────────────────── */

function ThinkingState() {
  const [step, setStep] = useState(0);
  const steps = [
    "Consultando manuales de Schindler...",
    "Analizando diagramas técnicos...",
    "Orquestando comité de agentes...",
    "Validando códigos de error...",
    "Generando diagnóstico experto..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % steps.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-start py-8 max-w-4xl mx-auto px-4 md:px-6 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center mr-5 flex-shrink-0 animate-pulse">
        <Activity className="w-5 h-5 text-zinc-400" />
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center bg-zinc-50 border border-zinc-100 px-6 py-4 rounded-[2rem] rounded-tl-sm shadow-sm">
          <div className="flex gap-1.5 mr-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s] [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-duration:0.8s] [animation-delay:0.4s]" />
          </div>
          <span className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">
            {steps[step]}
          </span>
        </div>
      </div>
    </div>
  );
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
      <div className="max-w-[85%] sm:max-w-2xl px-6 py-4 rounded-[2.5rem] rounded-tr-sm bg-zinc-900 border border-zinc-900 text-white text-sm leading-relaxed shadow-xl shadow-zinc-900/10 transition-all group-hover:scale-[1.01]">
        <div
          ref={textRef}
          className={cn(
            "overflow-hidden transition-all duration-300 font-medium",
            !expanded && "line-clamp-3 md:line-clamp-5"
          )}
        >
          {content}
        </div>
        {(isClamped || expanded) && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-blue-400 transition-colors"
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
      "w-full py-8 transition-colors duration-500 rounded-[2.5rem]",
      isStreaming ? "bg-white" : "bg-zinc-50/20"
    )}>
      <div className="flex items-start gap-5 max-w-4xl mx-auto px-4 md:px-6">
        {/* Logo */}
        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 mt-0.5 border border-blue-400">
          <Activity className="w-5 h-5 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-zinc-800 w-full font-sans">
            <div className="prose prose-neutral max-w-none text-gray-900 leading-[1.8] prose-p:my-5 prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-li:marker:text-blue-600 prose-li:marker:font-black">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="text-[13px] font-black text-zinc-900 mt-8 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                    {children}
                  </h2>,
                  h3: ({ children }) => <h3 className="text-xs font-black text-zinc-900 mt-6 mb-2 uppercase tracking-widest text-blue-700">{children}</h3>,
                  strong: ({ children }) => <strong className="font-extrabold text-zinc-950 bg-blue-50 px-1 rounded-sm">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-outside space-y-3 my-4 ml-6">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside space-y-3 my-4 ml-6">{children}</ol>,
                  li: ({ children }) => <li className="pl-1 leading-relaxed font-medium text-zinc-800">{children}</li>,
                  p: ({ children }) => <p className="leading-relaxed text-zinc-900 mb-5 last:mb-0 font-medium">{children}</p>,
                  hr: () => <hr className="my-8 border-zinc-100" />,
                  img: ({ src, alt }: any) => <ZoomableImage src={String(src || '')} alt={String(alt || '')} />,
                  table: ({ children }) => <div className="overflow-x-auto my-6 border border-zinc-200 rounded-2xl shadow-sm"><table className="w-full text-xs text-left border-collapse">{children}</table></div>,
                  th: ({ children }) => <th className="bg-zinc-50 p-4 font-black uppercase tracking-widest text-[10px] text-zinc-600 border-b border-zinc-200">{children}</th>,
                  td: ({ children }) => <td className="p-4 border-b border-zinc-100 text-zinc-800 font-bold">{children}</td>
                }}
              >
                {m.content}
              </ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-1 h-4 mt-1 bg-blue-600 animate-pulse align-middle opacity-50" />
            )}
          </div>

          {!isStreaming && m.content && (
            <div className="flex items-center justify-between mt-8 text-sm text-zinc-500 border-t border-zinc-100/80 pt-6 animate-in fade-in duration-700">
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
                className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-blue-400 transition-all text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-600 shadow-sm active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? <span className="text-emerald-500">Copiado</span> : "Copiar Diagnóstico"}
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
  clarifier: boolean;
  planner: boolean;
  textSearch: boolean;
  imgSearch: boolean;
  analyst: boolean;
  metrifier: boolean;
}

const DEFAULT_AGENT_FLAGS: AgentFlags = {
  clarifier: true,
  planner: false,
  textSearch: true,
  imgSearch: true,
  analyst: true,
  metrifier: true,
};

const AGENT_LABELS: Record<keyof AgentFlags, { label: string; desc: string }> = {
  clarifier: { label: "Clarificador", desc: "Expande y clasifica la query (N0)" },
  planner: { label: "Planificador", desc: "Genera plan de búsqueda dual (N1)" },
  textSearch: { label: "Búsqueda Texto", desc: "Retrieval vectorial de chunks (N2A)" },
  imgSearch: { label: "Búsqueda Imágenes", desc: "Retrieval vectorial de diagramas (N2B)" },
  analyst: { label: "Analista", desc: "Evalúa suficiencia y controla loops (N3)" },
  metrifier: { label: "Metrificador", desc: "Persiste métricas y mensajes (N5)" },
};

/* ── SynapsisGoChat ──────────────────────────────────────────────────────── */

export function SynapsisGoChat({
  models,
  userRole = null,
  isDevMode = false
}: {
  models: EquipmentModel[];
  userRole?: string | null;
  isDevMode?: boolean;
}) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<"test" | "record">("test");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [agentFlags, setAgentFlags] = useState<AgentFlags>(DEFAULT_AGENT_FLAGS);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const agentFlagsRef = useRef<AgentFlags>(DEFAULT_AGENT_FLAGS);
  const messageServerIdsRef = useRef<string[]>([]);

  const sessionIdRef = useRef<string | null>(null);
  const sessionModeRef = useRef<"test" | "record">("test");
  const selectedModelRef = useRef<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      let modifiedInit = init;
      if (init?.body) {
        try {
          const parsed = JSON.parse(init.body as string);
          parsed.agentFlags = agentFlagsRef.current;
          modifiedInit = { ...init, body: JSON.stringify(parsed) };
        } catch { /* ignore */ }
      }
      const res = await fetch(url, modifiedInit);
      try {
        const urgencyLevel = res.headers.get("x-urgency-level");
        const servMsgId = res.headers.get("x-message-id");
        if (urgencyLevel) setUrgency(urgencyLevel);
        if (servMsgId) messageServerIdsRef.current.push(servMsgId);
      } catch { /* ignore */ }
      return res;
    }, []),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading) return;
    const last = messages[messages.length - 1];
    if (last && last.role === "assistant" && last.content === "") {
      setMessages(prev => prev.slice(0, -1));
    }
  }, [messages, isLoading, setMessages]);

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
      console.error("[session] Error:", err);
      return null;
    }
  }, []);

  const onSubmitWithSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    await ensureSession();
    handleSubmit(e);
  }, [input, isLoading, ensureSession, handleSubmit]);

  const handleClear = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid && sessionModeRef.current === "test") {
      try { await fetch(`/api/chat/sessions/${sid}`, { method: "DELETE" }); } catch { /* ignore */ }
    }
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setUrgency(null);
    messageServerIdsRef.current = [];
    setRatings({});
  }, [setMessages]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    setHistoryOpen(true);
    try {
      const res = await fetch("/api/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessionHistory(data);
      }
    } catch { }
    finally { setHistoryLoading(false); }
  };

  const loadSession = async (sid: string) => {
    setHistoryOpen(false);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/chat/sessions/${sid}`);
      if (res.ok) {
        const data = await res.json();
        setSessionId(data.session.id);
        setSessionMode(data.session.mode);
        setSelectedModel(data.session.equipment_model || "");
        setMessages(data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })));
      }
    } catch { }
    finally { setHistoryLoading(false); }
  };

  const visibleMessages = messages.filter(m => m.content !== "");

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative">
      <style jsx global>{`
        textarea::-webkit-inner-spin-button, textarea::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .scrollbar-hidden::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* Header */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-8 py-5 bg-white/90 backdrop-blur-xl border-b border-slate-100 gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.25rem] bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/10">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[15px] font-black text-slate-950 tracking-tight leading-none">Comité Synapsis Go</h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Pipeline Multi-Agente Activo</span>
                {urgency && URGENCY[urgency as keyof typeof URGENCY] && (
                  <div className={cn(
                    "px-2.5 py-1 rounded-full text-[9px] font-black flex items-center gap-1.5 uppercase tracking-widest bg-white shadow-sm border",
                    URGENCY[urgency as keyof typeof URGENCY]?.text,
                    URGENCY[urgency as keyof typeof URGENCY]?.border,
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", URGENCY[urgency as keyof typeof URGENCY]?.dot)} />
                    {URGENCY[urgency as keyof typeof URGENCY]?.label}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-2xl border border-zinc-200/50">
              <button
                onClick={() => { setSessionMode("test"); sessionModeRef.current = "test"; }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all",
                  sessionMode === "test" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600",
                )}
              >
                <FlaskConical className="w-3.5 h-3.5" /> Prueba
              </button>
              <button
                onClick={() => { setSessionMode("record"); sessionModeRef.current = "record"; }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black tracking-widest uppercase transition-all",
                  sessionMode === "record" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600",
                )}
              >
                <BookMarked className="w-3.5 h-3.5" /> Registro
              </button>
            </div>

            <button
              onClick={fetchHistory}
              className="w-11 h-11 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm"
              title="Historial de diagnóstico"
            >
              <HistoryIcon className="w-5 h-5" />
            </button>

            <button
              onClick={() => setAgentPanelOpen(v => !v)}
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center transition-all border shadow-sm",
                agentPanelOpen ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600"
              )}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agent Panel Overlay - Editable for Admin/Auditor DevMode */}
        {agentPanelOpen && (
          <div className="absolute right-8 top-20 z-50 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Configuración del Comité</span>
              <button onClick={() => setAgentPanelOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-4 px-1">
              {(userRole === "Admin" || (userRole === "Auditor" && isDevMode))
                ? "Ajusta la respuesta del sistema activando o desactivando agentes."
                : "Estado actual de los agentes (Solo lectura)."
              }
            </p>
            <div className="space-y-2">
              {(Object.keys(AGENT_LABELS) as Array<keyof AgentFlags>).map(key => {
                const canEdit = userRole === "Admin" || (userRole === "Auditor" && isDevMode);

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (canEdit) {
                        setAgentFlags(prev => ({ ...prev, [key]: !prev[key] }));
                      }
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl transition-all border",
                      agentFlags[key] ? "bg-blue-50/50 border-blue-100" : "bg-slate-50 border-slate-100",
                      canEdit && "cursor-pointer hover:border-blue-400"
                    )}
                  >
                    <div className="text-left">
                      <p className={cn("text-[10px] font-black uppercase tracking-tight", agentFlags[key] ? "text-blue-700" : "text-slate-400")}>{AGENT_LABELS[key].label}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{AGENT_LABELS[key].desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-black uppercase", agentFlags[key] ? "text-blue-600" : "text-slate-300")}>
                        {agentFlags[key] ? "Activo" : "Inactivo"}
                      </span>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        agentFlags[key] ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse" : "bg-slate-300"
                      )} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History Sidebar/Overlay */}
        {historyOpen && (
          <div className="absolute right-8 top-20 z-50 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Sesiones Recientes</span>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="text-slate-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {historyLoading && sessionHistory.length === 0 ? (
                <div className="py-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>
              ) : sessionHistory.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 font-bold uppercase">No hay sesiones grabadas</div>
              ) : (
                sessionHistory.map(s => (
                  <button
                    key={s.id}
                    onClick={() => loadSession(s.id)}
                    className="w-full p-4 rounded-2xl text-left hover:bg-blue-50 border border-transparent hover:border-blue-100 transition-all group"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md", s.mode === 'record' ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-500')}>
                        {s.mode === 'record' ? 'Registro' : 'Prueba'}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-bold">{new Date(s.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700">Modelo {s.equipment_model || 'Gral.'}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{s.message_count} mensajes en el hilo</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Message Pool */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-0 py-8 scroll-smooth scrollbar-hidden">
          <div className="max-w-4xl mx-auto px-4 md:px-6 w-full space-y-4">
            {visibleMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center animate-in zoom-in duration-700">
                <div className="relative">
                  <div className="absolute inset-0 rounded-[3rem] bg-blue-500/20 blur-3xl animate-pulse" />
                  <div className="relative w-28 h-28 rounded-[3rem] bg-zinc-900 text-white flex items-center justify-center shadow-2xl border border-white/5 group transition-transform hover:scale-110 duration-500">
                    <Activity className="w-14 h-14" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-slate-950 tracking-tight">IA Multimodal de Diagnóstico</h3>
                  <p className="text-[13px] text-slate-500 mt-3 max-w-[360px] leading-relaxed mx-auto font-bold uppercase tracking-tight">
                    Elige un modelo operativo para activar el comité de agentes expertos.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 w-full max-w-md">
                    {models.filter(m => m.equipmentModel === "3300" || m.equipmentModel === "5500").map(m => (
                      <button
                        key={m.equipmentModel}
                        onClick={() => { setSelectedModel(m.equipmentModel || ""); ensureSession(); }}
                        className={cn(
                          "p-6 rounded-[2.5rem] border-2 transition-all text-left flex items-center gap-5 shadow-sm group active:scale-95",
                          selectedModel === m.equipmentModel ? "bg-blue-600 border-blue-600 shadow-blue-200" : "bg-white border-slate-100 hover:border-blue-400 hover:shadow-xl"
                        )}
                      >
                        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all", selectedModel === m.equipmentModel ? "bg-white/20 text-white" : "bg-blue-50 text-blue-500")}>
                          <Cpu className="w-6 h-6" />
                        </div>
                        <div>
                          <p className={cn("text-lg font-black tracking-tight", selectedModel === m.equipmentModel ? "text-white" : "text-slate-900")}>Schindler {m.equipmentModel}</p>
                          <p className={cn("text-[9px] font-black uppercase tracking-widest mt-0.5", selectedModel === m.equipmentModel ? "text-blue-100" : "text-slate-400")}>Base Lista</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {visibleMessages.map((m, idx) => {
              if (m.role === "assistant") {
                const isLatest = idx === visibleMessages.length - 1;
                const sIdx = visibleMessages.filter((msg, i) => msg.role === 'assistant' && i <= idx).length - 1;
                const servMsgId = messageServerIdsRef.current[sIdx] ?? null;
                return (
                  <AiMessageItem key={m.id} m={m} rated={ratings[servMsgId!] ?? null} onRate={(r: number) => setRatings(p => ({ ...p, [servMsgId!]: r }))} sessionMode={sessionMode} servMsgId={servMsgId} sessionId={sessionId} isStreaming={isLatest && isLoading} />
                );
              }
              return <UserMessageItem key={m.id} content={m.content} />;
            })}

            {isLoading && !messages[messages.length - 1]?.content && <ThinkingState />}
            <div ref={messagesEndRef} className="h-10" />
          </div>
        </div>

        {/* Input Bar */}
        <div className="bg-white border-t border-slate-100 pb-10 pt-4 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Quick Actions (HU0031) */}
            {selectedModel && visibleMessages.length === 0 && (
              <div className="flex flex-wrap gap-2 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-700">
                {[
                  { label: "Tengo un problema...", text: "Tengo un problema con " },
                  { label: "Quiero consultar...", text: "Quiero consultar sobre " },
                  { label: "Existe algún error...", text: "Existe algún error relacionado a " },
                  { label: "Cómo reseteo...", text: "Solicito procedimiento para resetear " }
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => {
                      handleInputChange({ target: { value: action.text } } as any);
                      textareaRef.current?.focus();
                    }}
                    className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={onSubmitWithSession} className={cn("group flex items-end gap-3 border-2 rounded-[2.5rem] px-8 py-5 transition-all duration-500 shadow-sm", !selectedModel ? "bg-slate-50 border-slate-100 opacity-60" : "bg-zinc-100 border-zinc-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-[12px] focus-within:ring-blue-500/5 focus-within:shadow-2xl")}>
              <TextareaAutosize
                ref={textareaRef as any}
                value={input}
                onChange={handleInputChange}
                minRows={1} maxRows={8}
                disabled={!selectedModel}
                placeholder={!selectedModel ? "Seleccione un modelo operativo..." : "Indica la falla, código de error o comportamiento..."}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (input.trim() && selectedModel) onSubmitWithSession(e as any); } }}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] py-1 text-slate-900 placeholder:text-slate-400 resize-none font-bold disabled:cursor-not-allowed leading-relaxed"
              />
              <div className="flex items-center gap-4 mb-0.5">
                {visibleMessages.length > 0 && (
                  <button type="button" onClick={handleClear} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm"><Plus className="w-6 h-6" /></button>
                )}
                <button type="submit" disabled={!input.trim() || isLoading || !selectedModel} className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500", !input.trim() || isLoading || !selectedModel ? "bg-slate-200 text-slate-400" : "bg-zinc-950 text-white shadow-2xl shadow-zinc-950/20 hover:scale-105 active:scale-95")}>
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                </button>
              </div>
            </form>
            <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.2em] mt-6 flex items-center justify-center gap-3">
              <ShieldCheck className="w-3.5 h-3.5" /> Conocimiento Verificado por Ingenieros Jefe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

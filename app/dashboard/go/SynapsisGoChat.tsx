"use client";

import {
  useState, useEffect, useRef, useCallback, memo
} from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Loader2, ChevronDown, AlertTriangle, Brain,
  Cpu, Trash2, ExternalLink, Zap, Activity, ShieldCheck,
  Layout, Sparkles, FlaskConical, BookMarked,
  PanelRightOpen, PanelRightClose, X, Copy, Check, Plus
} from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from "@/lib/utils";
import type { EquipmentModel } from "./page";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface RetrievedImageHeader {
  url: string | null;
  description: string | null;
  image_type: string | null;
  is_critical: boolean;
}

interface SideContext {
  images: RetrievedImageHeader[];
  urgency: string | null;
  reasoning: string | null;
}

/* ── Urgency config ──────────────────────────────────────────────────────── */

const URGENCY = {
  baja: { label: "Baja", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", dot: "bg-emerald-500", pulse: false },
  media: { label: "Media", bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", dot: "bg-blue-500", pulse: false },
  alta: { label: "Alta", bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", dot: "bg-orange-500", pulse: false },
  critica: { label: "Crítica", bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20", dot: "bg-red-500", pulse: true },
} as const;

const IMAGE_TYPE_LABEL: Record<string, string> = {
  diagram: "Diagrama Técnico",
  schematic: "Esquema Eléctrico",
  warning: "Advertencia Seguridad",
  table: "Tabla Especificación",
  photo: "Fotografía Campo",
};

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

/* ── ContextPanel ────────────────────────────────────────────────────────── */

function ContextPanel({ context, isLoading }: { context: SideContext; isLoading: boolean }) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const urgencyKey = (context.urgency ?? "media") as keyof typeof URGENCY;
  const urgencyCfg = URGENCY[urgencyKey];
  const hasData = context.urgency || context.images.length > 0 || context.reasoning;

  if (!hasData && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 opacity-40">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center border border-slate-200">
          <Brain className="h-8 w-8 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500">Inteligencia en Reposo</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
            Inicia una consulta para activar el análisis multimodal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 overflow-y-auto h-full scrollbar-hidden">
      {(context.urgency || context.reasoning) && (
        <div className="space-y-4">
          {context.urgency && (
            <div className={cn(
              "p-4 rounded-2xl border flex flex-col gap-3 transition-all",
              urgencyCfg.bg, urgencyCfg.border,
            )}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Status de Falla
                </span>
                <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5", urgencyCfg.text)}>
                  <div className={cn("w-1.5 h-1.5 rounded-full", urgencyCfg.dot, urgencyCfg.pulse && "animate-pulse")} />
                  {urgencyCfg.label}
                </div>
              </div>
              {context.reasoning && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setAnalysisOpen(!analysisOpen)}
                    className="flex items-center gap-3 w-full text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/70 flex items-center justify-center flex-shrink-0 shadow-sm border border-white/50 group-hover:bg-white transition-colors">
                      <Brain className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors">
                        Ver Guía Estratégica
                      </p>
                    </div>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", analysisOpen && "rotate-180")} />
                  </button>
                  
                  {analysisOpen && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs text-slate-700 leading-relaxed font-bold italic pl-11 pr-2 border-l-2 border-indigo-100/50 py-1">
                        "{context.reasoning}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {context.images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Evidencia Multimodal
            </h4>
            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md text-[9px] font-bold">
              {context.images.length} ARCHIVOS
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {context.images.map((img, i) => (
              <div key={i} className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300">
                {img.url && (
                  <div className="relative aspect-video bg-slate-100">
                    <img src={img.url} alt="technical" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <a href={img.url} target="_blank" className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                      <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                    </a>
                    {img.is_critical && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center gap-1 shadow-lg">
                        <AlertTriangle className="w-2.5 h-2.5" /> CRÍTICO
                      </div>
                    )}
                  </div>
                )}
                <div className="p-3">
                  <span className="text-[9px] font-black text-blue-500 uppercase tracking-tight bg-blue-50 px-1.5 py-0.5 rounded-md">
                    {IMAGE_TYPE_LABEL[img.image_type ?? ""] ?? "Referencia"}
                  </span>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2 italic">
                    {img.description ?? "Sin descripción disponible."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-20 bg-slate-100 rounded-2xl" />
          <div className="h-32 bg-slate-100 rounded-2xl" />
        </div>
      )}
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
            <div className="prose prose-neutral max-w-none text-gray-800 leading-snug prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0 prose-li:marker:text-gray-500">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => <h2 className="text-sm font-black text-zinc-900 mt-4 mb-2 uppercase tracking-wider">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-xs font-black text-zinc-900 mt-3 mb-1 uppercase tracking-widest">{children}</h3>,
                  strong: ({ children }) => <strong className="font-bold text-zinc-900">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc list-outside space-y-1 my-2 ml-4">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside space-y-1 my-2 ml-4">{children}</ol>,
                  li: ({ children }) => <li className="pl-1">{children}</li>,
                  p: ({ children }) => <p className="leading-snug text-zinc-800">{children}</p>,
                  hr: () => <hr className="my-4 border-zinc-100" />
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

/* ── SynapsisGoChat ──────────────────────────────────────────────────────── */

export function SynapsisGoChat({ models }: { models: EquipmentModel[] }) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<"test" | "record">("test");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sideContext, setSideContext] = useState<SideContext>({ images: [], urgency: null, reasoning: null });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showIntelligence, setShowIntelligence] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({});
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

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages, append, error } = useChat({
    api: "/api/chat",
    body: {
      equipmentModel: selectedModel,
      sessionId,
      sessionMode,
    },

    fetch: useCallback(async (url: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetch(url, init);

      // Read metrics headers from streaming response
      try {
        const rawImages = res.headers.get("x-retrieved-images");
        const urgency = res.headers.get("x-urgency-level");
        const reasoning = res.headers.get("x-analyst-reasoning");
        const servMsgId = res.headers.get("x-message-id");

        if (rawImages) {
          setSideContext({
            images: JSON.parse(decodeURIComponent(rawImages)) as RetrievedImageHeader[],
            urgency,
            reasoning: reasoning ? decodeURIComponent(reasoning) : null,
          });
        }
        if (servMsgId) {
          messageServerIdsRef.current.push(servMsgId);
        }
        // Auto-show intelligence when reasoning comes in
        if (reasoning) setShowIntelligence(true);
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
    setSideContext({ images: [], urgency: null, reasoning: null });
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
    <div className="flex flex-col lg:flex-row h-full max-h-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-2xl relative">

      {/* ── CSS Reset for Spin Buttons and Scrollbars ── */}
      <style jsx global>{`
        textarea::-webkit-inner-spin-button, 
        textarea::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
      `}</style>

      {/* ── LEFT: Chat Experience ── */}
      <div className="flex flex-col flex-[1.5] min-w-0 border-r border-slate-100 relative">

        {/* Header */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex flex-col md:flex-row md:items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-100 gap-4">

          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight">Comité de Diagnóstico</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Multimodal Activo</span>
                </div>
              </div>
            </div>

            {/* Toggle Intelligence (Mobile) */}
            <button
              onClick={() => setShowIntelligence(!showIntelligence)}
              className={cn(
                "lg:hidden w-10 h-10 flex items-center justify-center rounded-xl transition-all border",
                showIntelligence 
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm" 
                  : "bg-white border-slate-200 text-slate-500 hover:text-blue-500"
              )}
              title={showIntelligence ? "Ocultar Análisis" : "Mostrar Análisis"}
            >
              <Brain className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hidden shrink-0">

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

            {/* Toggle Intelligence (Desktop) */}
            <button
              onClick={() => setShowIntelligence(!showIntelligence)}
              title={showIntelligence ? "Ocultar Análisis" : "Mostrar Análisis"}
              className={cn(
                "hidden lg:flex w-10 h-10 items-center justify-center rounded-xl border transition-all ml-4",
                showIntelligence
                  ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm"
                  : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-500"
              )}
            >
              <Brain className="w-5 h-5" />
            </button>
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
                    <button
                      onClick={() => { setSelectedModel(""); ensureSession(); }}
                      className={cn(
                        "p-6 rounded-[2rem] border transition-all text-left flex items-center gap-5 group",
                        selectedModel === "" 
                          ? "bg-zinc-900 border-zinc-900 shadow-xl shadow-zinc-200" 
                          : "bg-white border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                        selectedModel === "" ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-400"
                      )}>
                        <Layout className="w-6 h-6" />
                      </div>
                      <div>
                        <p className={cn(
                          "text-[13px] font-black uppercase tracking-tight",
                          selectedModel === "" ? "text-white" : "text-zinc-900"
                        )}>Todos los Equipos</p>
                        <p className={cn(
                          "text-[9px] font-bold uppercase tracking-widest mt-1",
                          selectedModel === "" ? "text-zinc-400" : "text-zinc-400"
                        )}>Búqueda Global</p>
                      </div>
                    </button>

                    {models.map(m => {
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

      {/* ── RIGHT/OVERLAY: Documentation Intelligence ── */}
      <div className={cn(
        "flex flex-col bg-white border-l border-slate-100 transition-all duration-500 ease-in-out overflow-hidden",
        // Desktop
        showIntelligence ? "lg:w-[400px]" : "lg:w-0 lg:border-none",
        // Mobile (Overlay Drawer)
        showIntelligence
          ? "fixed inset-y-0 right-0 w-[90%] sm:w-[400px] shadow-2xl z-[100] translate-x-0"
          : "fixed inset-y-0 right-0 w-[90%] sm:w-[400px] z-[100] translate-x-full lg:translate-x-0 lg:w-0"
      )}>
        {/* Mobile Backdrop */}
        {showIntelligence && (
          <div 
            className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[-1]" 
            onClick={() => setShowIntelligence(false)}
          />
        )}
        {/* Botón de cierre explícito para todas las vistas */}
        <button
          onClick={() => setShowIntelligence(false)}
          className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full border border-slate-200 flex items-center justify-center shadow-lg z-[110] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          title="Cerrar panel"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[120px] pointer-events-none rounded-full" />
        <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200/60 bg-white shadow-sm lg:shadow-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
              <Brain className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase">Dashboard Intelligence</h2>
              <p className="text-[9px] font-bold text-slate-500 tracking-widest mt-0.5">CONTEXTO EN TIEMPO REAL</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-hidden select-none bg-white lg:bg-transparent">
          <ContextPanel context={sideContext} isLoading={isLoading} />
        </div>
      </div>

    </div>
  );
}

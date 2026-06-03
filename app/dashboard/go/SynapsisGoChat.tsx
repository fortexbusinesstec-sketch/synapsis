"use client";

import {
  useState, useEffect, useRef, useCallback, memo
} from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Loader2, ChevronDown, AlertTriangle,
  Cpu, Trash2, Zap, Activity, ShieldCheck,
  Copy, Check, Plus, X,
  Maximize2, ZoomIn, ZoomOut, RotateCcw,
  History as HistoryIcon, Clock,
  GraduationCap, Search, Lightbulb,
  ArrowRight, HelpCircle,
  CheckCircle, Mic, Info,
  BrainCircuit, BookOpen, Microscope, Cog, FileText
} from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { EquipmentModel } from "./page";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type ModoUI = 'mentor' | 'analisis';
type ConversationPhase = 'selecting_mode' | 'waiting_query' | 'orchestrating' | 'streaming_response' | 'awaiting_feedback';
type BackendModo = 'teorico' | 'procedimental' | 'diagnostico';

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface AgentTrace {
  serverMessageId: string;
  enrichedQuery: string;
  detectedIntent: string;
  chunksRetrieved: number;
  imagesRetrieved: number;
  imagesShown: number;
  retrievedImages: Array<{ url: string; description: string; image_type: string; is_critical: boolean }> | null;
  analystReasoning: string;
  urgencyLevel: string;
  phase0Used: boolean;
  phase2Used: boolean;
  plannerUsed: boolean;
  phase1Ms: number;
  phase2Ms: number;
  phase3Ms: number;
  phase2Tokens: number;
  phase3InputTokens: number;
  phase3OutputTokens: number;
  enrichmentsUsed: boolean;
  confidence: string;
  bestDistance: number;
  componentMismatch: boolean;
  rescueUsed: boolean;
  docBaseUsed: boolean;
  docTitulos: string[];
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const MODE_CARDS = [
  {
    value: 'mentor' as ModoUI,
    icon: GraduationCap,
    color: 'amber',
    colorHex: '#f59e0b',
    title: 'Mentor',
    subtitle: 'Aprender conceptos y procedimientos',
    example: '¿Qué es el sistema de tracción 1:1?',
    description: 'Entiende cómo funciona cada componente del ascensor',
    placeholder: '¿Qué concepto o procedimiento quieres aprender?',
  },
  {
    value: 'analisis' as ModoUI,
    icon: Search,
    color: 'blue',
    colorHex: '#3b82f6',
    title: 'Análisis',
    subtitle: 'Diagnosticar una falla',
    example: 'Ascensor se detiene en piso 3, código E07',
    description: 'Descubre qué puede estar fallando paso a paso',
    placeholder: 'Describe la falla: código de error, síntomas, modelo de equipo...',
  },
] as const;

const MENTOR_DETECT_TEORICO = [
  'qué es', 'qué son', 'qué significa', 'definición', 'explique', 'explica',
  'concepto', 'teoría', 'funcionamiento', 'propósito', 'para qué sirve',
  'cuál es la función', 'cómo funciona', 'diferencia entre',
];

const MENTOR_DETECT_PROCEDIMENTAL = [
  'cómo', 'cómo se', 'cómo hacer', 'pasos', 'procedimiento',
  'calibrar', 'configurar', 'resetear', 'acceder', 'instalar',
  'reemplazar', 'ajustar', 'secuencia', 'instrucciones',
];

const AGENT_STEPS = [
  "Clarificador analizando tu consulta...",
  "Bibliotecario buscando en manuales...",
  "Analista evaluando información...",
  "Ingeniero Jefe preparando respuesta...",
];

const URGENCY = {
  baja: { label: "Baja", bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20", dot: "bg-emerald-500", pulse: false },
  media: { label: "Media", bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-500/20", dot: "bg-blue-500", pulse: false },
  alta: { label: "Alta", bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20", dot: "bg-orange-500", pulse: false },
  critica: { label: "Crítica", bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20", dot: "bg-red-500", pulse: true },
} as const;

/* ── Helpers ───────────────────────────────────────────────────────────────── */

function detectBackendModo(modo: ModoUI, query: string): BackendModo {
  if (modo === 'analisis') return 'diagnostico';
  const q = query.toLowerCase();
  const hasTeorico = MENTOR_DETECT_TEORICO.some(k => q.includes(k));
  const hasProcedimental = MENTOR_DETECT_PROCEDIMENTAL.some(k => q.includes(k));
  if (hasProcedimental && !hasTeorico) return 'procedimental';
  return 'teorico';
}

function getModeColor(modo: ModoUI): string {
  return modo === 'mentor' ? 'amber' : 'blue';
}

/* ── ModeCard ──────────────────────────────────────────────────────────────── */

function ModeCard({
  mode, onSelect
}: {
  mode: typeof MODE_CARDS[number];
  onSelect: (v: ModoUI) => void;
}) {
  const isMentor = mode.value === 'mentor';
  const accentColor = isMentor ? 'amber' : 'blue';

  return (
    <motion.button
      onClick={() => onSelect(mode.value)}
      className={cn(
        "group relative flex flex-col items-center text-center p-8 sm:p-10 rounded-3xl border-2 transition-all duration-300 w-full sm:w-80",
        "bg-white hover:shadow-xl active:scale-[0.98] cursor-pointer",
        isMentor
          ? "border-amber-200 hover:border-amber-400 hover:bg-amber-50/30"
          : "border-blue-200 hover:border-blue-400 hover:bg-blue-50/30",
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      aria-label={`Seleccionar modo ${mode.title}`}
    >
      <div className={cn(
        "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 shadow-lg",
        isMentor ? "bg-amber-500 shadow-amber-500/20 group-hover:shadow-amber-500/40" : "bg-blue-500 shadow-blue-500/20 group-hover:shadow-blue-500/40",
      )}>
        <mode.icon className="w-8 h-8 text-white" />
      </div>

      <h3 className={cn(
        "text-2xl font-black tracking-tight mb-2",
        isMentor ? "text-amber-700" : "text-blue-700",
      )}>
        {mode.title}
      </h3>

      <p className="text-sm font-bold text-slate-500 mb-1">
        {mode.subtitle}
      </p>

      <p className="text-xs text-slate-400 font-medium mb-5 leading-relaxed">
        {mode.description}
      </p>

      <div className={cn(
        "px-4 py-2 rounded-xl text-xs font-bold italic",
        isMentor ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600",
      )}>
        "{mode.example}"
      </div>
    </motion.button>
  );
}

/* ── ModeBadge ──────────────────────────────────────────────────────────────── */

function ModeBadge({
  modo, onExit
}: {
  modo: ModoUI;
  onExit: () => void;
}) {
  const isMentor = modo === 'mentor';
  const config = MODE_CARDS.find(c => c.value === modo)!;
  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black border",
      isMentor
        ? "bg-amber-50 border-amber-200 text-amber-700"
        : "bg-blue-50 border-blue-200 text-blue-700",
    )}>
      <config.icon className="w-3.5 h-3.5" />
      <span>{modo === 'mentor' ? 'Modo Mentor' : 'Modo Análisis'}</span>
      <button
        onClick={onExit}
        className={cn(
          "ml-1 p-0.5 rounded-full transition-colors",
          isMentor ? "hover:bg-amber-200 text-amber-400 hover:text-amber-700" : "hover:bg-blue-200 text-blue-400 hover:text-blue-700",
        )}
        aria-label="Cambiar modo"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

/* ── ZoomableImage ──────────────────────────────────────────────────────────── */

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

/* ── ThinkingState ─────────────────────────────────────────────────────────── */

function ThinkingState() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStep(s => (s + 1) % AGENT_STEPS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="flex justify-start py-8 max-w-4xl mx-auto px-4 md:px-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="w-full">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-zinc-400" />
          </div>
          <div className="flex-1">
            <div className="bg-zinc-50 border border-zinc-100 px-6 py-5 rounded-2xl rounded-tl-sm shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex gap-1.5">
                  <motion.span
                    className="w-2 h-2 rounded-full bg-blue-500"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.span
                    className="w-2 h-2 rounded-full bg-blue-500"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  />
                  <motion.span
                    className="w-2 h-2 rounded-full bg-blue-500"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                  />
                </div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">
                  Orquestando comité de agentes...
                </span>
              </div>

              <div className="space-y-1">
                {AGENT_STEPS.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all duration-500",
                      i === step
                        ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                        : i < step
                          ? "bg-emerald-400"
                          : "bg-zinc-200",
                    )} />
                    <span className={cn(
                      "text-[11px] font-semibold transition-all duration-500",
                      i === step
                        ? "text-slate-800"
                        : i < step
                          ? "text-emerald-600"
                          : "text-slate-400",
                    )}>
                      {s}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-1 bg-zinc-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  style={{ width: "60%" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── RatingBar ──────────────────────────────────────────────────────────────── */

function RatingBar({
  messageId, sessionId, onRate, rated,
}: {
  messageId: string; sessionId: string; onRate: (rating: number) => void; rated: number | null;
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
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">¿Fue útil?</span>
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

/* ── UserMessageItem ───────────────────────────────────────────────────────── */

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
    <motion.div
      className="w-full flex flex-col items-end mb-8 group"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
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
    </motion.div>
  );
});
UserMessageItem.displayName = "UserMessageItem";

/* ── AiMessageItem (Mentor) ────────────────────────────────────────────────── */

const AiMessageMentor = memo(({
  content, isStreaming, onCopy, copied
}: {
  content: string; isStreaming: boolean; onCopy: () => void; copied: boolean;
}) => {
  return (
    <motion.div
      className="w-full py-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start gap-5 max-w-4xl mx-auto px-4 md:px-6">
        <div className="w-9 h-9 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0 mt-0.5">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-50 text-amber-700 border border-amber-200">
              <GraduationCap className="w-3 h-3" />
              Mentor
            </span>
          </div>
          <div className="text-sm text-zinc-800 w-full font-sans">
            <div className="prose prose-neutral max-w-none text-gray-900 leading-[1.8] prose-p:my-5 prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-li:marker:text-amber-500 prose-li:marker:font-black">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-[13px] font-black text-zinc-900 mt-8 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-amber-500 rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-black text-zinc-900 mt-6 mb-2 uppercase tracking-widest text-amber-700">
                      {children}
                    </h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-extrabold text-zinc-950 bg-amber-50 px-1 rounded-sm">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-outside space-y-3 my-4 ml-6">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-outside space-y-3 my-4 ml-6">{children}</ol>,
                  li: ({ children }) => <li className="pl-1 leading-relaxed font-medium text-zinc-800">{children}</li>,
                  p: ({ children }) => <p className="leading-relaxed text-zinc-900 mb-5 last:mb-0 font-medium">{children}</p>,
                  hr: () => <hr className="my-8 border-zinc-100" />,
                  img: ({ src, alt }: any) => <ZoomableImage src={String(src || '')} alt={String(alt || '')} />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 border border-zinc-200 rounded-2xl shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="bg-zinc-50 p-4 font-black uppercase tracking-widest text-[10px] text-zinc-600 border-b border-zinc-200">{children}</th>,
                  td: ({ children }) => <td className="p-4 border-b border-zinc-100 text-zinc-800 font-bold">{children}</td>,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-amber-400 bg-amber-50/50 pl-4 py-3 pr-4 rounded-r-xl my-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-semibold text-amber-800">{children}</span>
                      </div>
                    </blockquote>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-1 h-4 mt-1 bg-amber-500 animate-pulse align-middle opacity-50" />
            )}
          </div>
          {!isStreaming && content && (
            <div className="flex items-center justify-end mt-6">
              <CopyButton onClick={onCopy} copied={copied} label="Copiar" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
AiMessageMentor.displayName = "AiMessageMentor";

/* ── AiMessageItem (Análisis) ──────────────────────────────────────────────── */

const AiMessageAnalisis = memo(({
  content, isStreaming, onCopy, copied, onVerify, onQuickReply
}: {
  content: string; isStreaming: boolean; onCopy: () => void; copied: boolean;
  onVerify?: () => void; onQuickReply?: (reply: string) => void;
}) => {
  const lastSentence = content.split('\n').filter(l => l.trim().endsWith('?')).pop() || '';
  const hasQuestion = lastSentence.length > 0 && lastSentence.length < 200;

  return (
    <motion.div
      className="w-full py-6"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="flex items-start gap-5 max-w-4xl mx-auto px-4 md:px-6">
        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 mt-0.5">
          <Search className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-200">
              <Search className="w-3 h-3" />
              Análisis
            </span>
          </div>
          <div className="text-sm text-zinc-800 w-full font-sans">
            <div className="prose prose-neutral max-w-none text-gray-900 leading-[1.8] prose-p:my-5 prose-ul:my-5 prose-ol:my-5 prose-li:my-1 prose-li:marker:text-blue-600 prose-li:marker:font-black">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h2: ({ children }) => (
                    <h2 className="text-[13px] font-black text-zinc-900 mt-8 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-blue-600 rounded-full" />
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-black text-zinc-900 mt-6 mb-2 uppercase tracking-widest text-blue-700">
                      {children}
                    </h3>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-extrabold text-zinc-950 bg-blue-50 px-1 rounded-sm">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => <ul className="list-disc list-outside space-y-3 my-4 ml-6">{children}</ul>,
                  ol: ({ children }) => (
                    <ol className="list-decimal list-outside space-y-4 my-4 ml-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="pl-2 leading-relaxed font-medium text-zinc-800">
                      {children}
                    </li>
                  ),
                  p: ({ children }) => <p className="leading-relaxed text-zinc-900 mb-5 last:mb-0 font-medium">{children}</p>,
                  hr: () => <hr className="my-8 border-zinc-100" />,
                  img: ({ src, alt }: any) => <ZoomableImage src={String(src || '')} alt={String(alt || '')} />,
                  blockquote: ({ children }) => (
                    <div className="border-l-4 border-blue-400 bg-blue-50/50 pl-4 py-3 pr-4 rounded-r-xl my-4">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm font-semibold text-blue-800">{children}</span>
                      </div>
                    </div>
                  ),
                  table: ({ children }) => (
                    <div className="overflow-x-auto my-6 border border-zinc-200 rounded-2xl shadow-sm">
                      <table className="w-full text-xs text-left border-collapse">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => <th className="bg-zinc-50 p-4 font-black uppercase tracking-widest text-[10px] text-zinc-600 border-b border-zinc-200">{children}</th>,
                  td: ({ children }) => <td className="p-4 border-b border-zinc-100 text-zinc-800 font-bold">{children}</td>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
            {isStreaming && (
              <span className="inline-block w-1 h-4 mt-1 bg-blue-600 animate-pulse align-middle opacity-50" />
            )}
          </div>

          {!isStreaming && content && (
            <motion.div
              className="mt-6 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={onVerify}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <CheckCircle className="w-4 h-4" />
                  Ya verifiqué esto
                </button>
                <CopyButton onClick={onCopy} copied={copied} label="Copiar diagnóstico" />
              </div>

              {hasQuestion && onQuickReply && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-[11px] font-bold text-slate-500 mb-3 flex items-center gap-2">
                    <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                    {lastSentence}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {["Sí", "No", "No sé"].map(reply => (
                      <button
                        key={reply}
                        onClick={() => onQuickReply(reply)}
                        className="px-4 py-2 rounded-xl border text-xs font-bold transition-all bg-white hover:bg-blue-50 hover:border-blue-300 border-slate-200 text-slate-700 active:scale-95"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
AiMessageAnalisis.displayName = "AiMessageAnalisis";

/* ── CopyButton ────────────────────────────────────────────────────────────── */

const CopyButton = memo(({ onClick, copied, label }: { onClick: () => void; copied: boolean; label: string }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-blue-400 transition-all text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-600 shadow-sm active:scale-95"
  >
    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
    {copied ? <span className="text-emerald-500">Copiado</span> : label}
  </button>
));
CopyButton.displayName = "CopyButton";

/* ── LowConfidenceCard ─────────────────────────────────────────────────────── */

function LowConfidenceCard({
  onContinue,
}: {
  onContinue: (query: string) => void;
}) {
  const [input, setInput] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) onContinue(input.trim());
  };

  return (
    <motion.div
      className="w-full py-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <div className="border-l-4 border-amber-400 bg-amber-50/80 rounded-r-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-black text-amber-800 mb-1">
                Necesito más precisión
              </h4>
              <p className="text-xs font-semibold text-amber-700 mb-4 leading-relaxed">
                Para no dar pasos irrelevantes, necesito más información: código de error, modelo de equipo o componente específico.
              </p>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: código E07, modelo 3300..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-black uppercase tracking-widest hover:bg-amber-600 transition-all disabled:opacity-50 shadow-sm active:scale-95"
                >
                  Continuar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── AgentFlags Panel ──────────────────────────────────────────────────────── */

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

/* ── AgentTraceModal ──────────────────────────────────────────────────────── */

function CopyBlock({ content, label }: { content: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative bg-slate-50 rounded-xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-700 leading-relaxed flex-1 min-w-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</span>
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
        <button
          onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1.5 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-300 opacity-0 group-hover:opacity-100 transition-all"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

function AgentTraceModal({
  trace, onClose
}: {
  trace: AgentTrace | null;
  onClose: () => void;
}) {
  if (!trace) return null;

  const agents = [
    {
      name: "Clarificador",
      model: "gpt-4o-mini",
      Icon: BrainCircuit,
      color: "amber",
      active: trace.phase0Used,
      latency: null,
      tokens: null,
      detail: trace.phase0Used ? (
        <div className="space-y-2">
          <CopyBlock content={trace.detectedIntent || "N/A"} label="Intención Detectada" />
          {trace.enrichedQuery && trace.enrichedQuery !== trace.detectedIntent && (
            <CopyBlock content={trace.enrichedQuery} label="Query Expandida" />
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No participó en esta consulta</p>
      ),
      used: trace.phase0Used ? `Intención: ${trace.detectedIntent}${trace.enrichedQuery ? `\nQuery: ${trace.enrichedQuery}` : ""}` : "",
    },
    {
      name: "Bibliotecario",
      model: "text-embedding-3-small + Turso Vector",
      Icon: BookOpen,
      color: "blue",
      active: true,
      latency: trace.phase1Ms,
      tokens: null,
      detail: (
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <span className="text-lg font-black text-blue-700">{trace.chunksRetrieved}</span>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Chunks</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <span className="text-lg font-black text-blue-700">{trace.imagesRetrieved}</span>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Imágenes</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <span className="text-lg font-black text-blue-700">{trace.imagesShown}</span>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Mostradas</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
              <span className="text-lg font-black text-blue-700">{trace.bestDistance.toFixed(2)}</span>
              <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest mt-0.5">Distancia</p>
            </div>
          </div>
          {trace.enrichmentsUsed && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Notas de experto incluidas (enriquecimiento)
            </div>
          )}
          {trace.retrievedImages && trace.retrievedImages.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Imágenes Recuperadas</span>
              <div className="space-y-1">
                {trace.retrievedImages.slice(0, 3).map((img, i) => (
                  <CopyBlock key={i} content={img.description} label={`Imagen ${i + 1}`} />
                ))}
              </div>
            </div>
          )}
          {/* Curador: Documento base usado */}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Documento Base</span>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border",
                trace.docBaseUsed ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-400"
              )}>Proc. Mantenimiento</span>
            </div>
          </div>
          {(trace.componentMismatch || trace.rescueUsed) && (
            <div className="space-y-1">
              {trace.componentMismatch && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-orange-700 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Mismatch de componente — documentos no coinciden con el componente indicado
                </div>
              )}
              {trace.rescueUsed && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  Rescate activado — baja similitud, se usó búsqueda de rescate
                </div>
              )}
            </div>
          )}
          {trace.docTitulos.length > 0 && (
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Documentos Fuente</span>
              <div className="space-y-1">
                {trace.docTitulos.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] font-medium text-slate-600 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
      used: `${trace.chunksRetrieved} chunks, ${trace.imagesShown} imágenes de ${trace.imagesRetrieved}${trace.enrichmentsUsed ? " + enriquecimiento" : ""}${trace.rescueUsed ? " + rescate" : ""}${trace.componentMismatch ? " ⚠ mismatch" : ""}`,
    },
    {
      name: "Analista",
      model: "gpt-4o-mini",
      Icon: Microscope,
      color: "violet",
      active: trace.phase2Used,
      latency: trace.phase2Ms,
      tokens: trace.phase2Tokens,
      detail: trace.phase2Used ? (
        <div className="space-y-2">
          {trace.analystReasoning && (
            <CopyBlock content={trace.analystReasoning} label="Razonamiento" />
          )}
          <div className="flex gap-2">
            {trace.confidence && (
              <div className="flex-1 bg-violet-50 rounded-xl p-3 text-center border border-violet-100">
                <span className="text-lg font-black text-violet-700">{trace.confidence}</span>
                <p className="text-[9px] font-bold text-violet-500 uppercase tracking-widest mt-0.5">Confianza</p>
              </div>
            )}
            {trace.urgencyLevel && (
              <div className="flex-1 rounded-xl p-3 text-center border" style={{
                backgroundColor: trace.urgencyLevel === "critica" ? "#fef2f2" : trace.urgencyLevel === "alta" ? "#fff7ed" : "#eff6ff",
                borderColor: trace.urgencyLevel === "critica" ? "#fecaca" : trace.urgencyLevel === "alta" ? "#fed7aa" : "#bfdbfe",
              }}>
                <span className={cn(
                  "text-lg font-black",
                  trace.urgencyLevel === "critica" ? "text-red-700" :
                  trace.urgencyLevel === "alta" ? "text-orange-700" : "text-blue-700"
                )}>
                  {trace.urgencyLevel.charAt(0).toUpperCase() + trace.urgencyLevel.slice(1)}
                </span>
                <p className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{
                  color: trace.urgencyLevel === "critica" ? "#dc2626" : trace.urgencyLevel === "alta" ? "#ea580c" : "#2563eb",
                }}>Urgencia</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">No participó en esta consulta</p>
      ),
      used: trace.phase2Used ? (trace.analystReasoning || "Sin razonamiento") : "",
    },
    {
      name: "Ingeniero Jefe",
      model: "gpt-4o-mini",
      Icon: Cog,
      color: "zinc",
      active: true,
      latency: trace.phase3Ms,
      tokens: trace.phase3InputTokens + trace.phase3OutputTokens,
      detail: (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
              <span className="text-lg font-black text-zinc-700">{trace.phase3InputTokens}</span>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Tokens In</p>
            </div>
            <div className="bg-zinc-50 rounded-xl p-3 text-center border border-zinc-100">
              <span className="text-lg font-black text-zinc-700">{trace.phase3OutputTokens}</span>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">Tokens Out</p>
            </div>
          </div>
          <p className="text-xs font-medium text-slate-500">
            Recibió contexto del Bibliotecario + análisis del Analista para generar la respuesta final.
          </p>
        </div>
      ),
      used: `${trace.phase3InputTokens} tokens in, ${trace.phase3OutputTokens} tokens out`,
    },
  ];

  const totalMs = trace.phase1Ms + trace.phase2Ms + trace.phase3Ms;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto border border-slate-200 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-lg">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Trazabilidad de Agentes</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Pipeline del Comité Multi-Agente · {totalMs > 0 ? `${totalMs}ms` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Pipeline Flow */}
          <div className="flex items-center justify-between gap-1 px-2">
            {["Clarificador", "Bibliotecario", "Analista", "Ingeniero Jefe"].map((name, i) => {
              const agent = agents.find(a => a.name === name)!;
              const AgentIcon = agent.Icon;
              return (
                <div key={name} className="flex items-center gap-1 flex-1">
                  <div className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                    agent.active
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : "bg-slate-50 border-slate-200 text-slate-400"
                  )}>
                    <AgentIcon className="w-3 h-3" />
                    {name}
                  </div>
                  {i < 3 && (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Agent Cards */}
          {agents.filter(a => a.active).map((agent) => {
            const AgentIcon = agent.Icon;
            const colorMap: Record<string, string> = {
              amber: "bg-amber-500",
              blue: "bg-blue-500",
              violet: "bg-violet-500",
              zinc: "bg-zinc-500",
            };
            return (
              <div key={agent.name} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", colorMap[agent.color] || "bg-zinc-500")}>
                      <AgentIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-black text-slate-900">{agent.name}</span>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{agent.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {agent.latency !== null && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {agent.latency}ms
                      </span>
                    )}
                    {agent.tokens !== null && (
                      <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                        {agent.tokens} tokens
                      </span>
                    )}
                  </div>
                </div>
                <div className="px-5 py-4">
                  {agent.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── SynapsisGoChat ────────────────────────────────────────────────────────── */

export function SynapsisGoChat({
  models, userRole = null, isDevMode = false
}: {
  models: EquipmentModel[]; userRole?: string | null; isDevMode?: boolean;
}) {
  const [uiMode, setUiMode] = useState<ModoUI | null>(null);
  const [phase, setPhase] = useState<ConversationPhase>('selecting_mode');
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [sessionMode, setSessionMode] = useState<"test" | "record">("test");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [agentFlags, setAgentFlags] = useState<AgentFlags>(DEFAULT_AGENT_FLAGS);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentBackendModo, setCurrentBackendModo] = useState<BackendModo>('diagnostico');
  const [traces, setTraces] = useState<Record<string, AgentTrace>>({});
  const [traceModalMessageId, setTraceModalMessageId] = useState<string | null>(null);

  const agentFlagsRef = useRef<AgentFlags>(DEFAULT_AGENT_FLAGS);
  const messageServerIdsRef = useRef<string[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const sessionModeRef = useRef<"test" | "record">("test");
  const selectedModelRef = useRef<string>("");
  const modoRef = useRef<BackendModo>('diagnostico');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingTraceRef = useRef<AgentTrace | null>(null);

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
      modo: currentBackendModo,
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
        const getHeader = (name: string) => {
          try { return res.headers.get(name) ?? ""; } catch { return ""; }
        };
        const urgencyLevel = getHeader("x-urgency-level");
        const servMsgId = getHeader("x-message-id");
        const confidence = getHeader("x-confidence");
        if (urgencyLevel) setUrgency(urgencyLevel);
        if (servMsgId) messageServerIdsRef.current.push(servMsgId);

        const rawImages = getHeader("x-retrieved-images");
        let retrievedImagesParsed = null;
        try {
          if (rawImages) retrievedImagesParsed = JSON.parse(decodeURIComponent(rawImages));
        } catch { /* ignore */ }

        const traceData = {
          serverMessageId: servMsgId || "",
          enrichedQuery: decodeURIComponent(getHeader("x-enriched-query") || ""),
          detectedIntent: getHeader("x-detected-intent"),
          chunksRetrieved: parseInt(getHeader("x-chunks-retrieved")) || 0,
          imagesRetrieved: parseInt(getHeader("x-images-retrieved")) || 0,
          imagesShown: parseInt(getHeader("x-images-shown")) || 0,
          retrievedImages: retrievedImagesParsed,
          analystReasoning: decodeURIComponent(getHeader("x-analyst-reasoning") || ""),
          urgencyLevel: getHeader("x-urgency-level"),
          phase0Used: getHeader("x-phase0-used") === "1",
          phase2Used: getHeader("x-phase2-used") === "1",
          plannerUsed: getHeader("x-planner-used") === "1",
          phase1Ms: parseInt(getHeader("x-phase1-ms")) || 0,
          phase2Ms: parseInt(getHeader("x-phase2-ms")) || 0,
          phase3Ms: parseInt(getHeader("x-phase3-ms")) || 0,
          phase2Tokens: parseInt(getHeader("x-phase2-tokens")) || 0,
          phase3InputTokens: parseInt(getHeader("x-phase3-input-tokens")) || 0,
          phase3OutputTokens: parseInt(getHeader("x-phase3-output-tokens")) || 0,
          enrichmentsUsed: getHeader("x-enrichments-used") === "1",
          confidence: confidence || "",
          bestDistance: parseFloat(getHeader("x-best-distance")) || 0,
          componentMismatch: getHeader("x-component-mismatch") === "1",
          rescueUsed: getHeader("x-rescue-used") === "1",
          docBaseUsed: getHeader("x-doc-base-used") === "1",
          docTitulos: (() => { try { return JSON.parse(decodeURIComponent(getHeader("x-doc-titulos") || "[]")); } catch { return []; } })(),
        };
        pendingTraceRef.current = traceData;
      } catch { /* ignore */ }
      return res;
    }, []),
    onFinish: () => {
      const trace = pendingTraceRef.current;
      if (trace) {
        pendingTraceRef.current = null;
        const msgs = messagesRef.current;
        const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          setTraces(prev => ({ ...prev, [lastAssistant.id]: trace }));
        }
      }
      if (uiMode === 'analisis') {
        setPhase('awaiting_feedback');
      } else {
        setPhase('waiting_query');
      }
    },
  });

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isLoading) {
      setPhase('orchestrating');
    } else if (phase === 'orchestrating') {
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant" && last.content) {
        setPhase('streaming_response');
      }
    }
  }, [isLoading, phase, messages]);

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

  const selectMode = useCallback((mode: ModoUI) => {
    setUiMode(mode);
    setPhase('waiting_query');
    setTimeout(() => textareaRef.current?.focus(), 400);
  }, []);

  const exitMode = useCallback(() => {
    setUiMode(null);
    setPhase('selecting_mode');
    setMessages([]);
    setSessionId(null);
    sessionIdRef.current = null;
    setUrgency(null);
    messageServerIdsRef.current = [];
    setRatings({});
  }, [setMessages]);

  const onSubmitWithSession = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !uiMode) return;
    const backendModo = detectBackendModo(uiMode, input);
    modoRef.current = backendModo;
    setCurrentBackendModo(backendModo);
    await ensureSession();
    handleSubmit(e);
  }, [input, isLoading, uiMode, ensureSession, handleSubmit]);

  const handleQuickReply = useCallback(async (reply: string, query?: string) => {
    if (!sessionIdRef.current) await ensureSession();
    const content = query || reply;
    const backendModo = detectBackendModo(uiMode || 'analisis', content);
    modoRef.current = backendModo;
    setCurrentBackendModo(backendModo);
    await append({
      role: 'user',
      content,
    });
    setPhase('orchestrating');
  }, [uiMode, ensureSession, append]);

  const handleVerify = useCallback(() => {
    setPhase('awaiting_feedback');
  }, []);

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
    setPhase('waiting_query');
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

  const handleCopy = useCallback((id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const visibleMessages = messages.filter(m => m.content !== "");
  const modeColor = uiMode ? getModeColor(uiMode) : 'blue';

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl relative">
      <style jsx global>{`
        textarea::-webkit-inner-spin-button, textarea::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        .scrollbar-hidden::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="flex flex-col flex-1 min-w-0 relative">
        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 flex-shrink-0 flex flex-col bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-4 sm:px-8 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-[1.25rem] bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/10 flex-shrink-0">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-black text-slate-950 tracking-tight leading-none truncate">
                  Synapsis Go
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">
                    Asistente Técnico
                  </span>
                  {urgency && URGENCY[urgency as keyof typeof URGENCY] && (
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-[8px] font-black flex items-center gap-1 uppercase tracking-widest bg-white shadow-sm border",
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

            <div className="flex items-center gap-2">
              {uiMode && (
                <ModeBadge modo={uiMode} onExit={exitMode} />
              )}

              <button
                onClick={fetchHistory}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600 flex items-center justify-center transition-all shadow-sm"
                title="Historial de diagnóstico"
              >
                <HistoryIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => setAgentPanelOpen(v => !v)}
                className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all border shadow-sm",
                  agentPanelOpen ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-600"
                )}
              >
                <Cpu className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Agent Panel ─────────────────────────────────────────── */}
        {agentPanelOpen && (
          <div className="absolute right-8 top-20 z-50 w-80 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-3xl shadow-2xl p-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                Configuración del Comité
              </span>
              <button onClick={() => setAgentPanelOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
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
                    onClick={() => { if (canEdit) setAgentFlags(prev => ({ ...prev, [key]: !prev[key] })); }}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl transition-all border",
                      agentFlags[key] ? "bg-blue-50/50 border-blue-100" : "bg-slate-50 border-slate-100",
                      canEdit && "cursor-pointer hover:border-blue-400"
                    )}
                  >
                    <div className="text-left">
                      <p className={cn("text-[10px] font-black uppercase tracking-tight", agentFlags[key] ? "text-blue-700" : "text-slate-400")}>
                        {AGENT_LABELS[key].label}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{AGENT_LABELS[key].desc}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[9px] font-black uppercase", agentFlags[key] ? "text-blue-600" : "text-slate-300")}>
                        {agentFlags[key] ? "Activo" : "Inactivo"}
                      </span>
                      <div className={cn("w-2 h-2 rounded-full", agentFlags[key] ? "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)] animate-pulse" : "bg-slate-300")} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── History Panel ───────────────────────────────────────── */}
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
                    <p className="text-[11px] font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700">
                      Modelo {s.equipment_model || 'Gral.'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{s.message_count} mensajes</p>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Main Content ────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {phase === 'selecting_mode' ? (
            /* ── Mode Selection Screen ─────────────────────────────── */
            <motion.div
              key="mode-selection"
              className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-12"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="text-center mb-10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-3">
                  ¿Qué necesitas hacer?
                </h2>
                <p className="text-sm font-semibold text-slate-500 max-w-md mx-auto">
                  Selecciona el modo según tu objetivo en campo
                </p>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-6 items-stretch justify-center w-full max-w-2xl">
                {MODE_CARDS.map((mode, i) => (
                  <motion.div
                    key={mode.value}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
                  >
                    <ModeCard mode={mode} onSelect={selectMode} />
                  </motion.div>
                ))}
              </div>

              <motion.p
                className="mt-10 text-[11px] text-slate-400 font-semibold text-center max-w-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                ¿No sabes qué elegir? Si tienes una falla, usa <strong className="text-blue-600">Análisis</strong>.
                Si quieres aprender cómo funciona algo, usa <strong className="text-amber-600">Mentor</strong>.
              </motion.p>
            </motion.div>
          ) : (
            /* ── Chat View ─────────────────────────────────────────── */
            <motion.div
              key="chat-view"
              className="flex-1 flex flex-col min-h-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {/* Model selector bar */}
              <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-slate-100 bg-white/50">
                <div className="relative flex-shrink-0">
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      if (e.target.value) ensureSession();
                    }}
                    className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-[11px] font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer hover:border-blue-400"
                  >
                    <option value="">Modelo...</option>
                    {models.map(m => (
                      <option key={m.equipmentModel} value={m.equipmentModel ?? ''}>
                        Schindler {m.equipmentModel}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {selectedModel && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 flex-shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-semibold text-emerald-700 whitespace-nowrap">
                      Schindler {selectedModel}
                    </span>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 bg-zinc-100 p-0.5 rounded-xl border border-zinc-200/50">
                    <button
                      onClick={() => { setSessionMode("test"); sessionModeRef.current = "test"; }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-[0.625rem] text-[10px] font-black tracking-widest uppercase transition-all",
                        sessionMode === "test" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      Prueba
                    </button>
                    <button
                      onClick={() => { setSessionMode("record"); sessionModeRef.current = "record"; }}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-[0.625rem] text-[10px] font-black tracking-widest uppercase transition-all",
                        sessionMode === "record" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-600",
                      )}
                    >
                      Registro
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col px-0 py-6 scroll-smooth scrollbar-hidden">
                <div className="max-w-4xl mx-auto px-4 md:px-6 w-full">
                  {visibleMessages.length === 0 && (
                    <motion.div
                      className="flex flex-col items-center justify-center min-h-[50vh] gap-5 text-center px-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className={cn(
                        "w-20 h-20 rounded-[2.5rem] flex items-center justify-center shadow-2xl border border-white/5",
                        uiMode === 'mentor' ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-600 shadow-blue-500/20",
                      )}>
                        {uiMode === 'mentor'
                          ? <GraduationCap className="w-10 h-10 text-white" />
                          : <Search className="w-10 h-10 text-white" />
                        }
                      </div>
                      <div className="space-y-2 max-w-md">
                        <h3 className="text-xl font-black text-slate-950 tracking-tight">
                          {uiMode === 'mentor' ? '¿Qué quieres aprender?' : 'Describe la falla'}
                        </h3>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          {uiMode === 'mentor'
                            ? 'Pregunta sobre conceptos, componentes o procedimientos técnicos'
                            : 'Cuéntame los síntomas: código de error, comportamiento del equipo, modelo...'
                          }
                        </p>
                      </div>
                      {visibleMessages.length === 0 && selectedModel && (
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {(uiMode === 'analisis'
                            ? [
                              "El ascensor no se mueve, código E-07",
                              "Falla intermitente en el panel",
                              "Ruido extraño en sala de máquinas",
                            ]
                            : [
                              "¿Qué es el sistema de tracción?",
                              "¿Cómo funciona el variador?",
                              "Explica el freno de seguridad",
                            ]
                          ).map((placeholder, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                handleInputChange({ target: { value: placeholder } } as any);
                                textareaRef.current?.focus();
                              }}
                              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-[10px] font-bold tracking-wide text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                            >
                              {placeholder}
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {visibleMessages.map((m, idx) => {
                    const isLatest = idx === visibleMessages.length - 1;
                    if (m.role === "assistant") {
                      const hasTrace = !!traces[m.id];
                      const showDetails = userRole === "Auditor" && hasTrace && !isLoading;

                      const msgComponent = uiMode === 'analisis' ? (
                        <AiMessageAnalisis
                          key={m.id}
                          content={m.content}
                          isStreaming={isLatest && isLoading}
                          onCopy={() => handleCopy(m.id, m.content)}
                          copied={copiedId === m.id}
                          onVerify={handleVerify}
                          onQuickReply={phase === 'awaiting_feedback' ? (reply) => handleQuickReply(reply) : undefined}
                        />
                      ) : (
                        <AiMessageMentor
                          key={m.id}
                          content={m.content}
                          isStreaming={isLatest && isLoading}
                          onCopy={() => handleCopy(m.id, m.content)}
                          copied={copiedId === m.id}
                        />
                      );
                      return (
                        <div key={m.id} className="relative group">
                          {msgComponent}
                          {showDetails && (
                            <div className="flex justify-start max-w-4xl mx-auto px-4 md:px-6 -mt-2">
                              <button
                                onClick={() => setTraceModalMessageId(m.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm"
                              >
                                <Activity className="w-3 h-3" />
                                Ver Detalles
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return <UserMessageItem key={m.id} content={m.content} />;
                  })}

                  {isLoading && phase === 'orchestrating' && <ThinkingState />}

                  <div ref={messagesEndRef} className="h-6" />
                </div>
              </div>

              {/* Input Bar */}
              <div className="bg-white border-t border-slate-100 pb-8 pt-4 px-4 flex-shrink-0">
                <div className="max-w-4xl mx-auto">
                  <form onSubmit={onSubmitWithSession} className={cn(
                    "group flex items-end gap-3 border-2 rounded-[2.5rem] px-6 py-4 transition-all duration-500 shadow-sm",
                    !selectedModel
                      ? "bg-slate-50 border-slate-100 opacity-60"
                      : cn(
                        "bg-zinc-100 border-zinc-200 focus-within:bg-white focus-within:ring-[12px] focus-within:shadow-2xl",
                        uiMode === 'mentor' && "focus-within:border-amber-500 focus-within:ring-amber-500/5",
                        uiMode === 'analisis' && "focus-within:border-blue-500 focus-within:ring-blue-500/5",
                      )
                  )}>
                    <TextareaAutosize
                      ref={textareaRef as any}
                      value={input}
                      onChange={handleInputChange}
                      minRows={1} maxRows={6}
                      disabled={!selectedModel}
                      placeholder={
                        !selectedModel
                          ? "Seleccione un modelo operativo..."
                          : uiMode === 'mentor'
                            ? "¿Qué concepto o procedimiento quieres aprender?"
                            : "Describe la falla: código de error, síntomas, modelo de equipo..."
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (input.trim() && selectedModel) onSubmitWithSession(e as any);
                        }
                      }}
                      className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] py-1 text-slate-900 placeholder:text-slate-400 resize-none font-bold disabled:cursor-not-allowed leading-relaxed"
                    />
                    <div className="flex items-center gap-3 mb-0.5">
                      {visibleMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClear}
                          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm"
                          title="Nueva consulta"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={!input.trim() || isLoading || !selectedModel}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          !input.trim() || isLoading || !selectedModel
                            ? "bg-slate-200 text-slate-400"
                            : cn(
                              "text-white shadow-2xl hover:scale-105 active:scale-95",
                              uiMode === 'mentor' ? "bg-amber-500 shadow-amber-500/20" : "bg-blue-600 shadow-blue-600/20",
                            )
                        )}
                      >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </form>
                  <p className="text-[10px] text-center text-slate-400 font-black uppercase tracking-[0.2em] mt-5 flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5" /> Conocimiento Verificado por Ingenieros Jefe
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Agent Trace Modal */}
        <AgentTraceModal
          trace={traceModalMessageId ? traces[traceModalMessageId] ?? null : null}
          onClose={() => setTraceModalMessageId(null)}
        />
      </div>
    </div>
  );
}

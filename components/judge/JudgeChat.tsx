"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useChat } from "ai/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send, Loader2, Activity, ShieldCheck,
  FlaskConical, CheckCircle2, AlertTriangle,
  Copy, Check
} from "lucide-react";
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from "@/lib/utils";

// --- Components Reused from SynapsisGoChat (Simplified for this version) ---

const UserMessageItem = memo(({ content }: { content: string }) => (
    <div className="w-full flex flex-col items-end mb-8 group">
      <div className="max-w-[85%] sm:max-w-2xl px-6 py-4 rounded-[2.5rem] rounded-tr-sm bg-zinc-900 text-white text-sm leading-relaxed shadow-xl shadow-zinc-900/10 transition-all group-hover:scale-[1.01]">
        <div className="font-medium">{content}</div>
      </div>
    </div>
));
UserMessageItem.displayName = "UserMessageItem";

const AiMessageItem = memo(({ content, isStreaming }: { content: string; isStreaming: boolean }) => (
    <div className={cn("w-full py-8 transition-colors duration-500 rounded-[2.5rem]", isStreaming ? "bg-white" : "bg-zinc-50/20")}>
      <div className="flex items-start gap-5 max-w-4xl mx-auto px-4 md:px-6">
        <div className="w-9 h-9 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0 mt-0.5 border border-blue-400">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="prose prose-neutral max-w-none text-gray-900 leading-[1.8]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
          {isStreaming && <span className="inline-block w-1 h-4 mt-1 bg-blue-600 animate-pulse align-middle opacity-50" />}
        </div>
      </div>
    </div>
));
AiMessageItem.displayName = "AiMessageItem";

function ThinkingState() {
    return (
      <div className="flex justify-start py-8 max-w-4xl mx-auto px-4 md:px-6 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="w-9 h-9 rounded-2xl bg-zinc-100 flex items-center justify-center mr-5 flex-shrink-0 animate-pulse">
          <Activity className="w-5 h-5 text-zinc-400" />
        </div>
        <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 px-6 py-4 rounded-[2rem] rounded-tl-sm shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">La IA está procesando el manual...</span>
        </div>
      </div>
    );
}

interface JudgeChatProps {
    caseId: string | null;
    sessionId: string | null;
    equipmentModel: string | null;
    caseTitle: string;
    messagesUsed: number;
    status: string;
    onFinish: () => void;
    onRefresh: () => void;
}

export function JudgeChat({ 
    caseId, 
    sessionId: initialSessionId, 
    equipmentModel, 
    caseTitle, 
    messagesUsed, 
    status,
    onFinish,
    onRefresh
}: JudgeChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(initialSessionId);
  const isLimitReached = messagesUsed >= 10;
  const isLocked = status !== 'in_progress' || isLimitReached;

  // Sync session ID from props
  useEffect(() => {
    setCurrentSessionId(initialSessionId);
  }, [initialSessionId]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    api: "/api/judge/chat",
    body: {
      equipmentModel,
      judgeSessionId: currentSessionId,
      judgeCaseId: caseId
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Fetch existing messages when sessionId is available
  useEffect(() => {
      const fetchMessages = async () => {
          if (!currentSessionId) {
              setMessages([]);
              return;
          }
          console.log("Fetching messages for session:", currentSessionId);
          try {
              const res = await fetch(`/api/judge/messages?sessionId=${currentSessionId}`);
              if (res.ok) {
                  const data = await res.json();
                  const chatMessages = data.map((m: any) => ({
                      id: m.id,
                      role: m.role,
                      content: m.content
                  }));
                  setMessages(chatMessages);
              }
          } catch (e) {
              console.error("Error fetching messages:", e);
          }
      };

      fetchMessages();
  }, [currentSessionId, setMessages]);

  const handleCustomSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || isLoading || isLocked || isSending) return;

      setIsSending(true);
      try {
          const res = await fetch("/api/judge/messages", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  sessionId: currentSessionId,
                  role: 'user',
                  content: input,
                  judgeCaseId: caseId
              })
          });
          
          if (res.ok) {
            onRefresh();
            handleSubmit(e);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsSending(false);
      }
  };

  return (
    <div className="flex flex-col h-full bg-white lg:rounded-[2.5rem] border border-slate-200 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 lg:px-8 py-4 lg:py-5 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between shadow-sm gap-4">
        <div className="flex items-center gap-3 lg:gap-4 min-w-0">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-[1.25rem] bg-zinc-900 flex items-center justify-center shadow-xl shadow-zinc-900/10 text-white flex-shrink-0">
            <FlaskConical className="w-5 h-5 lg:w-6 lg:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm lg:text-[15px] font-black text-slate-950 tracking-tight leading-none truncate">
                🔬 {caseTitle || 'Modo Jurado'}
            </h1>
            <div className="flex items-center gap-2 mt-1 lg:mt-1.5">
              <span className="w-1.5 h-1.5 lg:w-2 lg:h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                  Modelo: {equipmentModel || '...'} · Activa
              </span>
            </div>
          </div>
        </div>

        {status === 'in_progress' && (
            <button
                onClick={onFinish}
                className="px-4 lg:px-6 py-2 lg:py-2.5 rounded-xl lg:rounded-2xl bg-red-600 text-white text-[9px] lg:text-[11px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
            >
                <CheckCircle2 className="w-3 h-3 lg:w-4 lg:h-4" />
                <span className="hidden sm:inline">Finalizar</span>
                <span className="sm:hidden">Fin</span>
            </button>
        )}
      </div>

      {/* Message Pool */}
      <div className="flex-1 overflow-y-auto px-0 py-8 scrollbar-hidden">
        <div className="max-w-4xl mx-auto px-4 md:px-6 w-full space-y-4">
          {!caseId && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4 opacity-40">
                  <Activity className="w-16 h-16 text-slate-300" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Selecciona o inicia un caso para chatear</p>
              </div>
          )}

          {messages.map((m, idx) => (
            m.role === "assistant" 
              ? <AiMessageItem key={m.id} content={m.content} isStreaming={idx === messages.length - 1 && isLoading} />
              : <UserMessageItem key={m.id} content={m.content} />
          ))}

          {isLoading && !messages[messages.length - 1]?.content && <ThinkingState />}
          <div ref={messagesEndRef} className="h-10" />
        </div>
      </div>

      {/* Banner de Límite */}
      {isLimitReached && status === 'in_progress' && (
          <div className="mx-8 mb-2 p-3 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-bottom-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <p className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">Límite de 10 mensajes alcanzado. Por favor, finaliza la sesión para evaluar.</p>
          </div>
      )}

      {/* Input Bar */}
      <div className="bg-white border-t border-slate-100 pb-10 pt-4 px-4">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleCustomSubmit} className={cn(
              "group flex items-end gap-3 border-2 rounded-[2.5rem] px-8 py-5 transition-all duration-500 shadow-sm",
              isLocked || isSending ? "bg-slate-50 border-slate-100 opacity-60" : "bg-zinc-100 border-zinc-200 focus-within:bg-white focus-within:border-blue-500 focus-within:ring-[12px] focus-within:ring-blue-500/5 focus-within:shadow-2xl"
          )}>
            <TextareaAutosize
              ref={textareaRef as any}
              value={input}
              onChange={handleInputChange}
              minRows={1} maxRows={8}
              disabled={isLocked || isSending}
              placeholder={isLocked ? "Sesión bloqueada o finalizada..." : isSending ? "Enviando..." : "Escribe tu consulta para evaluar a la IA..."}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[15px] py-1 text-slate-900 placeholder:text-slate-400 resize-none font-bold disabled:cursor-not-allowed leading-relaxed"
            />
            <button 
                type="submit" 
                disabled={!input.trim() || isLoading || isLocked || isSending} 
                className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    !input.trim() || isLoading || isLocked || isSending ? "bg-slate-200 text-slate-400" : "bg-zinc-950 text-white shadow-2xl shadow-zinc-950/20 hover:scale-105 active:scale-95"
                )}
            >
              {isLoading || isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

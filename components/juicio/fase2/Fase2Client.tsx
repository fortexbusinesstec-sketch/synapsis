"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Send, Star, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, MessagesSquare, MessageSquare, Trash2, Wrench, Cpu, Info,
} from "lucide-react";
import ModoSelector from "@/components/juicio/ModoSelector";
import { MINI_ENCUESTA_LABELS, type ModoType } from "@/lib/agents/prompts";

const inputBase = "w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white dark:text-slate-900 dark:border-slate-200";

const modelos = ["3300", "5500"] as const;

interface ActividadState {
  numero: number;
  tipo: "sesion" | "pregunta_individual";
  sesionId?: number;
  modelo?: string;
  estado: "pendiente" | "completada";
  miniEncuesta?: { utilidad: number };
}

interface Message {
  emisor: "experto" | "sistema";
  contenido: string;
  turno: number;
}

interface Props {
  expertoCodigo: string;
}

const actividadesBase = [
  { tipo: "pregunta_individual" as const, numero: 1, obligatorio: true },
  { tipo: "pregunta_individual" as const, numero: 2, obligatorio: true },
  { tipo: "pregunta_individual" as const, numero: 3, obligatorio: true },
  { tipo: "pregunta_individual" as const, numero: 4, obligatorio: true },
  { tipo: "pregunta_individual" as const, numero: 5, obligatorio: true },
  { tipo: "sesion" as const, numero: 6, obligatorio: false },
];

function StarRating({ value, onChange, label, leyenda }: { value: number; onChange: (v: number) => void; label: string; leyenda?: string }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="space-y-3">
      <Label className="text-sm font-bold text-slate-700">{label} <span className="text-red-500">*</span></Label>
      {leyenda && <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{leyenda}</p>}
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} type="button" onClick={() => onChange(v)} onMouseEnter={() => setHover(v)} onMouseLeave={() => setHover(0)} className="p-1 transition-all hover:scale-110">
            <Star className={`h-10 w-10 transition-colors ${v <= (hover || value) ? "text-amber-400 fill-amber-400" : "text-slate-200"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleFrecuencia({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700">{label} <span className="text-red-500">*</span></Label>
      <div className="flex rounded-lg overflow-hidden border border-slate-200 w-fit">
        {[
          { val: "0", label: "No" },
          { val: "1", label: "Parcial" },
          { val: "2", label: "Sí" },
        ].map((opt) => (
          <button key={opt.val} type="button" onClick={() => onChange(opt.val)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${value === opt.val ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleSiNo({ value, onChange, label }: { value: number | null; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700">{label} <span className="text-red-500">*</span></Label>
      <div className="flex rounded-lg overflow-hidden border border-slate-200 w-fit">
        <button type="button" onClick={() => onChange(1)} className={`px-5 py-2 text-sm font-medium transition-colors ${value === 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>Sí</button>
        <button type="button" onClick={() => onChange(0)} className={`px-5 py-2 text-sm font-medium transition-colors ${value === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>No</button>
      </div>
    </div>
  );
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ChatMessage({ emisor, contenido }: { emisor: string; contenido: string }) {
  const isExpert = emisor === "experto";
  return (
    <div className={`flex ${isExpert ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isExpert ? "bg-blue-600 text-white rounded-tr-sm" : "bg-white border border-slate-200 text-slate-900 rounded-tl-sm"}`}>
        {isExpert ? (
          contenido
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              strong: ({ children }) => <strong className="font-bold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
              code: ({ children }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
            }}
          >
            {contenido}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}

export default function Fase2Client({ expertoCodigo }: Props) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  type Pantalla = "dashboard" | "pickModelo" | "chat" | "miniEncuesta" | "encuestaFinal";
  const [pantalla, setPantalla] = useState<Pantalla>("dashboard");

  const [escenario, setEscenario] = useState("");
  const [actividades, setActividades] = useState<ActividadState[]>(
    actividadesBase.map((a) => ({ numero: a.numero, tipo: a.tipo, estado: "pendiente" as const }))
  );
  const [loadingAct, setLoadingAct] = useState(false);

  // Model picker
  const [pendingActividadIdx, setPendingActividadIdx] = useState(-1);
  const [selectedModelo, setSelectedModelo] = useState("");

  // Chat
  const [currentActividadIdx, setCurrentActividadIdx] = useState(-1);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [turno, setTurno] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<ModoType>('diagnostico');
  const [infoOpen, setInfoOpen] = useState(false);

  // Mini encuesta
  const [miniUtilidad, setMiniUtilidad] = useState(0);

  // Final survey
  const [surveyP1, setSurveyP1] = useState("");
  const [surveyP2, setSurveyP2] = useState(0);
  const [surveyP3, setSurveyP3] = useState<number | null>(null);
  const [surveyP4, setSurveyP4] = useState("");
  const [surveyP5, setSurveyP5] = useState("");
  const [surveyComentario, setSurveyComentario] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const obligatoriasOk = actividades.filter((a) => a.tipo === "pregunta_individual" && a.estado === "completada").length;
  const totalOk = actividades.filter((a) => a.estado === "completada").length;
  const puedeFinalizar = obligatoriasOk === 5;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const stored = localStorage.getItem("f2_escenario");
    if (stored) setEscenario(stored);
    loadActividades();
  }, []);

  async function loadActividades() {
    setLoadingAct(true);
    try {
      const { getActividadesFase2 } = await import("@/app/dashboard/juicio/fase2/actions");
      const result = await getActividadesFase2(expertoCodigo);
      if (result.success) {
        const serverActs = result.actividades ?? [];
        const merged = actividadesBase.map((slot) => {
          const match = serverActs.find(
            (a: any) => a.tipoActividad === slot.tipo && a.numeroActividad === slot.numero
          );
          if (match) {
            return {
              numero: slot.numero,
              tipo: slot.tipo,
              sesionId: match.sesionId,
              modelo: match.modelo ?? undefined,
              estado: (match.miniEncuesta ? "completada" : "pendiente") as "pendiente" | "completada",
              miniEncuesta: match.miniEncuesta || undefined,
            };
          }
          return { numero: slot.numero, tipo: slot.tipo, estado: "pendiente" as const };
        });
        setActividades(merged);
      }
    } catch (e) {
      console.error("Error loading F2 activities:", e);
    } finally {
      setLoadingAct(false);
    }
  }

  function handleEscenarioChange(val: string) {
    setEscenario(val);
    localStorage.setItem("f2_escenario", val);
  }

  async function handleStartActivity(idx: number) {
    const activity = actividades[idx];
    if (!activity || activity.estado === "completada") return;
    if (!escenario.trim()) {
      setErrorMessage("Describe el escenario técnico antes de iniciar.");
      return;
    }

    // If activity already has a session and modelo, load it directly
    if (activity.sesionId && activity.modelo) {
      setCurrentActividadIdx(idx);
      setSessionId(activity.sesionId);
      setErrorMessage("");

      const res = await fetch(`/api/juicio/mensajes?sesionId=${activity.sesionId}`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
        const maxTurno = data.length > 0 ? Math.max(...data.map((m) => m.turno)) : 0;
        setTurno(maxTurno + 1);
      } else {
        setMessages([]);
        setTurno(1);
      }
      setPantalla("chat");
      return;
    }

    // If session exists but no modelo (migration), or no session at all
    if (activity.sesionId) {
      // Has session from before modelo column — use default model
      setCurrentActividadIdx(idx);
      setSessionId(activity.sesionId);
      setErrorMessage("");

      const res = await fetch(`/api/juicio/mensajes?sesionId=${activity.sesionId}`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages(data);
        const maxTurno = data.length > 0 ? Math.max(...data.map((m) => m.turno)) : 0;
        setTurno(maxTurno + 1);
      } else {
        setMessages([]);
        setTurno(1);
      }
      setPantalla("chat");
      return;
    }

    // Show model picker
    setPendingActividadIdx(idx);
    setSelectedModelo("");
    setPantalla("pickModelo");
  }

  async function handleConfirmModel() {
    if (!selectedModelo) {
      setErrorMessage("Selecciona el modelo de ascensor (3300 o 5500).");
      return;
    }

    const idx = pendingActividadIdx;
    if (idx < 0) return;

    const activity = actividades[idx];
    if (!activity) return;

    if (!escenario.trim()) {
      setErrorMessage("Describe el escenario técnico antes de iniciar.");
      setPantalla("dashboard");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      const { startFase2Activity } = await import("@/app/dashboard/juicio/fase2/actions");
      const result = await startFase2Activity(expertoCodigo, activity.tipo, activity.numero, selectedModelo);
      if (result.success) {
        const sid = result.sessionId!;
        setSessionId(sid);
        setMessages([]);
        setTurno(1);
        setCurrentActividadIdx(idx);

        setActividades((prev) => {
          const next = [...prev];
          next[idx] = { ...next[idx], sesionId: sid, modelo: selectedModelo };
          return next;
        });

        setPantalla("chat");
      } else {
        setErrorMessage(result.message || "Error al iniciar.");
        setPantalla("dashboard");
      }
    } catch {
      setErrorMessage("Error al iniciar.");
      setPantalla("dashboard");
    } finally {
      setLoading(false);
      setPendingActividadIdx(-1);
    }
  }

  function handleCancelModelPick() {
    setPendingActividadIdx(-1);
    setSelectedModelo("");
    setPantalla("dashboard");
  }

  async function callSynapsisApi(userText: string, modelo: string): Promise<string> {
    const allMessages: { role: "user" | "assistant"; content: string }[] = messages.map((m) => ({
      role: m.emisor === "experto" ? "user" : "assistant",
      content: m.contenido,
    }));

    allMessages.unshift({ role: "user", content: `Escenario técnico: ${escenario}` });
    allMessages.push({ role: "user", content: userText });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: allMessages,
        equipmentModel: modelo,
        sessionId: null,
        sessionMode: "test",
        agentFlags: { planner: false, clarifier: true, analyst: true },
        modo,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || "Error al contactar el comité de diagnóstico.");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Sin respuesta del servidor.");

    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (line.startsWith("0:")) {
          try {
            fullText += JSON.parse(line.slice(2));
          } catch {
            // skip
          }
        }
      }
    }

    return fullText.trim() || "No se obtuvo respuesta del comité de diagnóstico.";
  }

  const handleSendMessage = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || !sessionId) return;
    const activity = actividades[currentActividadIdx];
    const maxTurnos = activity?.tipo === "sesion" ? 5 : 1;
    if (turno > maxTurnos) return;

    setEnviando(true);
    setErrorMessage("");

    try {
      const { sendChatMessageFase2, saveSystemMessageFase2 } = await import("@/app/dashboard/juicio/fase2/actions");

      const saveResult = await sendChatMessageFase2(sessionId, text, turno);
      if (!saveResult.success) {
        setErrorMessage(saveResult.message || "Error al guardar mensaje.");
        setEnviando(false);
        return;
      }

      setMessages((prev) => [...prev, { emisor: "experto", contenido: text, turno }]);
      setChatInput("");

      const modelo = activity?.modelo || "3300";
      const startTime = performance.now();
      const respuesta = await callSynapsisApi(text, modelo);
      const elapsed = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

      await saveSystemMessageFase2(sessionId, respuesta, turno, elapsed);

      setMessages((prev) => [...prev, { emisor: "sistema", contenido: respuesta, turno }]);
      setTurno(turno + 1);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al enviar mensaje.");
    } finally {
      setEnviando(false);
    }
  }, [chatInput, sessionId, turno, currentActividadIdx, actividades, messages, escenario]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  async function handleSaveMiniEncuesta() {
    if (!miniUtilidad || !sessionId) {
      setErrorMessage("Selecciona una puntuación.");
      return;
    }
    setLoading(true);
    setErrorMessage("");

    try {
      const { saveMiniEncuestaFase2 } = await import("@/app/dashboard/juicio/fase2/actions");
      const result = await saveMiniEncuestaFase2(sessionId, miniUtilidad, modo);
      if (result.success) {
        setActividades((prev) => {
          const next = [...prev];
          next[currentActividadIdx] = { ...next[currentActividadIdx], estado: "completada", miniEncuesta: { utilidad: miniUtilidad } };
          return next;
        });
        setPantalla("dashboard");
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Error al guardar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteActividad(idx: number) {
    const activity = actividades[idx];
    if (!activity.sesionId) return;
    setLoading(true);

    try {
      const { deleteActividadFase2 } = await import("@/app/dashboard/juicio/fase2/actions");
      const result = await deleteActividadFase2(activity.sesionId);
      if (result.success) {
        setActividades((prev) => {
          const next = [...prev];
          next[idx] = { numero: activity.numero, tipo: activity.tipo, estado: "pendiente" };
          return next;
        });
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Error al eliminar.");
    } finally {
      setLoading(false);
    }
  }

  function handleChatDone() {
    const activity = actividades[currentActividadIdx];
    if (activity?.miniEncuesta) {
      setPantalla("dashboard");
    } else {
      setMiniUtilidad(0);
      setPantalla("miniEncuesta");
    }
  }

  async function handleSubmitSurvey() {
    setErrorMessage("");

    if (!surveyP1 || !surveyP2 || surveyP3 === null || !surveyP4 || !surveyP5) {
      setErrorMessage("Responde todas las preguntas obligatorias.");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      const sesionRef = actividades.find(a => a.sesionId)?.sesionId || 0;
      fd.set("sesionId", sesionRef.toString());
      fd.set("p1_resolvio_acerco", surveyP1);
      fd.set("p2_momento_falla", surveyP2.toString());
      fd.set("p3_algo_peligroso", surveyP3.toString());
      fd.set("p4_viabilidad_junior", surveyP4);
      fd.set("p5_recomendaria", surveyP5);
      fd.set("comentario_adicional", surveyComentario);

      const evaluaciones = actividades
        .filter((a) => a.miniEncuesta)
        .map((a) => ({
          numero: a.numero,
          tipo: a.tipo,
          sesion_id: a.sesionId,
          utilidad: a.miniEncuesta?.utilidad,
        }));
      fd.set("evaluaciones_actividades", JSON.stringify(evaluaciones));

      const { submitFase2Survey } = await import("@/app/dashboard/juicio/fase2/actions");
      const result = await submitFase2Survey(fd);
      if (result.success) {
        localStorage.removeItem("f2_escenario");
        setSubmitted(true);
      } else {
        setErrorMessage(result.message);
      }
    } catch {
      setErrorMessage("Error al guardar la evaluación.");
    } finally {
      setLoading(false);
    }
  }

  const maxTurnos = (() => {
    const activity = actividades[currentActividadIdx];
    return activity?.tipo === "sesion" ? 5 : 1;
  })();

  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Fase 2 Completada</h2>
        <p className="text-slate-500 mt-2">Gracias por tu participación en el Escenario Libre.</p>
        <Button onClick={() => router.push(`/dashboard/juicio/fases?expertoId=${expertoCodigo}`)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 font-semibold">
          Volver a Fases
        </Button>
      </div>
    );
  }

  // ── PICK MODEL ──
  if (pantalla === "pickModelo") {
    const activity = actividades[pendingActividadIdx];
    const idx = pendingActividadIdx;
    return (
      <div>
        <div className="mb-6">
          <button onClick={handleCancelModelPick} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Volver al panel
          </button>
          <h2 className="text-xl font-bold text-slate-900">Seleccionar Modelo</h2>
          <p className="text-sm text-slate-500 mt-1">
            Para {idx < 5 ? `Pregunta Individual ${idx + 1}` : "Sesión Opcional"}, elige el modelo de ascensor.
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Modelo de Ascensor <span className="text-red-500">*</span></h3>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            {modelos.map((m) => (
              <button key={m} type="button" onClick={() => setSelectedModelo(m)}
                className={`flex items-center gap-3 px-4 sm:px-6 py-4 rounded-xl border-2 transition-all flex-1 sm:flex-none ${selectedModelo === m ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20" : "border-slate-200 bg-white hover:border-blue-400"}`}
              >
                <Cpu className={`h-6 w-6 ${selectedModelo === m ? "text-blue-600" : "text-slate-400"}`} />
                <div>
                  <p className={`font-bold text-sm ${selectedModelo === m ? "text-blue-700" : "text-slate-900"}`}>Schindler {m}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Manuales técnicos</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={handleCancelModelPick} variant="outline" className="rounded-lg px-6 py-2.5">Cancelar</Button>
          <Button onClick={handleConfirmModel} disabled={!selectedModelo || loading}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-8 py-2.5 font-medium disabled:opacity-50"
          >
            {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Iniciando...</span> : "Iniciar Actividad"}
          </Button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──
  if (pantalla === "dashboard") {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Escenario Libre</h2>
          <p className="text-sm text-slate-500 mt-1">Describe un escenario técnico real y evalúa cómo responde el sistema.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <Label className="text-sm font-bold text-slate-700 mb-2 block">Describe tu escenario técnico</Label>
          <Textarea
            placeholder="Ej: Ascensor Schindler 3300 de 8 pisos, error 32 en variador, se para entre pisos con carga media..."
            value={escenario}
            onChange={(e) => handleEscenarioChange(e.target.value)}
            className={inputBase + " min-h-[100px]"}
            disabled={obligatoriasOk === 5 && !actividades[5]?.sesionId}
          />
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-slate-700">Actividades</p>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">{totalOk}<span className="text-lg text-slate-400">/6</span></div>
            <p className="text-xs text-slate-500">Actividades completadas</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {actividades.map((act, idx) => {
            const isDone = act.estado === "completada";
            const isObligatorio = idx < 5;
            return (
              <div key={act.numero}
                className={`bg-white border rounded-xl p-4 flex items-center justify-between transition-all ${isDone ? "border-green-200 bg-green-50/30" : idx === 5 && obligatoriasOk < 5 ? "border-slate-200 opacity-60" : "border-slate-200 hover:border-blue-300"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${act.tipo === "sesion" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {act.tipo === "sesion" ? <MessagesSquare className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {isObligatorio ? `Pregunta Individual ${idx + 1}` : "Sesión Opcional"}
                      {isObligatorio && <span className="text-xs text-red-500 ml-1">*</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDone ? "text-green-600" : "text-slate-400"}`}>
                      {isDone
                        ? `Completada${act.miniEncuesta ? ` · Utilidad: ${act.miniEncuesta.utilidad}/5` : ""}`
                        : idx === 5 ? "Opcional" : "Pendiente"
                      }
                    </p>
                    {act.modelo && !isDone && (
                      <p className="text-[10px] text-slate-400 mt-0.5">Schindler {act.modelo}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isDone && (
                    <button type="button" onClick={() => handleDeleteActividad(idx)} disabled={loading}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Rehacer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <Button onClick={() => handleStartActivity(idx)}
                    disabled={isDone || loading || (idx === 5 && obligatoriasOk < 5) || !escenario.trim()}
                    className={`rounded-lg text-sm font-medium ${isDone ? "opacity-0 pointer-events-none" : "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"}`}
                  >
                    {act.sesionId ? "Continuar" : idx === 5 ? "Iniciar (opcional)" : "Iniciar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {puedeFinalizar && (
          <div className="flex justify-center">
            <Button onClick={() => setPantalla("encuestaFinal")}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 py-3 font-semibold flex items-center gap-2 text-base"
            >
              Ir a Encuesta Final <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // ── CHAT ──
  if (pantalla === "chat") {
    const activity = actividades[currentActividadIdx];
    return (
      <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[400px]">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <button onClick={() => setPantalla("dashboard")} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-1">
              <ArrowLeft className="h-3 w-3" /> Volver al panel
            </button>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {activity?.tipo === "sesion" ? "Sesión de Diagnóstico" : `Pregunta Individual ${activity?.numero}`}
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Synapsis Go
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                modo === 'teorico' ? 'bg-blue-100 text-blue-700' :
                modo === 'procedimental' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {modo === 'teorico' ? 'Teórico' : modo === 'procedimental' ? 'Procedimental' : 'Diagnóstico'}
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setInfoOpen(!infoOpen)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Información de modos"
                >
                  <Info className="h-4 w-4" />
                </button>
                {infoOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setInfoOpen(false)} />
                    <div className="absolute left-1/2 -translate-x-1/2 sm:left-0 sm:translate-x-0 top-full mt-2 z-20 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modos de consulta</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Teórico</p>
                            <p className="text-xs text-slate-500">Pregunta sobre conceptos, definiciones o funcionamiento del equipo.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Procedimental</p>
                            <p className="text-xs text-slate-500">Pregunta sobre cómo hacer algo, pasos o procedimientos técnicos.</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                          <div>
                            <p className="text-sm font-semibold text-slate-800">Diagnóstico</p>
                            <p className="text-xs text-slate-500">Reporta un síntoma o falla para que el sistema diagnostique la causa raíz.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </h2>
            <p className="text-xs text-slate-500">
              Schindler {activity?.modelo || "—"} · {escenario.slice(0, 50)}...
            </p>
          </div>
          {turno <= maxTurnos && (
            <span className="text-sm font-medium text-slate-500 shrink-0">Pregunta {turno} de {maxTurnos}</span>
          )}
        </div>

        <div className="flex-1 bg-slate-50 rounded-xl overflow-y-auto p-4 space-y-4 border border-slate-200 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">Describe tu problema técnico para esta actividad.</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <ChatMessage key={i} emisor={msg.emisor} contenido={msg.contenido} />
          ))}
          {enviando && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-sm px-4 py-3 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando comité de diagnóstico...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {errorMessage && (
          <div role="alert" className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex gap-3 mt-4">
        <ModoSelector value={modo} onChange={setModo} disabled={enviando || messages.length > 0} />
      </div>

      {turno <= maxTurnos ? (
          <div className="flex gap-3 mt-3 bg-white border border-slate-200 rounded-xl p-4">
            <Textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe el detalle técnico..."
              className="flex-1 bg-white text-slate-900 border-slate-200 resize-none min-h-[44px] max-h-[120px]"
              rows={1}
              disabled={enviando}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || enviando}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex justify-center">
            <Button onClick={handleChatDone}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 py-3 font-semibold flex items-center gap-2"
            >
              {activity?.miniEncuesta ? "Volver al Panel" : "Evaluar Actividad"} <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── MINI ENCUESTA ──
  if (pantalla === "miniEncuesta") {
    const activity = actividades[currentActividadIdx];
    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Evaluar Actividad</h2>
          <p className="text-sm text-slate-500 mt-1">
            {activity?.tipo === "sesion" ? "Sesión" : `Pregunta Individual ${activity?.numero}`}
            {activity?.modelo && ` · Schindler ${activity.modelo}`}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <StarRating
            value={miniUtilidad}
            onChange={setMiniUtilidad}
            label={MINI_ENCUESTA_LABELS[modo].label}
            leyenda={MINI_ENCUESTA_LABELS[modo].leyenda}
          />

          {errorMessage && (
            <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <Button onClick={handleSaveMiniEncuesta} disabled={!miniUtilidad || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-50 transition-all active:scale-[0.98]"
          >
            {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</span> : "Guardar y Volver al Panel"}
          </Button>
        </div>
      </div>
    );
  }

  // ── ENCUESTA FINAL ──
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Encuesta Final — Fase 2</h2>
        <p className="text-sm text-slate-500 mt-1">Completaste las actividades. Responde esta encuesta para finalizar.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
        <div className="space-y-2">
          <ToggleFrecuencia
            label="1. ¿El sistema resolvió o se acercó al diagnóstico de tu escenario?"
            value={surveyP1}
            onChange={setSurveyP1}
          />
        </div>

        <StarRating
          value={surveyP2}
          onChange={setSurveyP2}
          label="2. ¿En qué momento del diagnóstico falló el sistema?"
          leyenda="1 = Desde el principio / 5 = No falló, acertó"
        />

        <ToggleSiNo
          value={surveyP3}
          onChange={setSurveyP3}
          label="3. ¿El sistema sugirió algo peligroso o fuera de norma?"
        />

        <div className="space-y-2">
          <ToggleFrecuencia
            label="4. ¿Crees que un técnico junior podría seguir el diagnóstico?"
            value={surveyP4}
            onChange={setSurveyP4}
          />
        </div>

        <div className="space-y-2">
          <ToggleFrecuencia
            label="5. ¿Recomendarías este sistema a otro técnico?"
            value={surveyP5}
            onChange={setSurveyP5}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold text-slate-700">6. Comentario adicional (opcional)</Label>
          <Textarea
            placeholder="Cualquier observación o sugerencia..."
            value={surveyComentario}
            onChange={(e) => setSurveyComentario(e.target.value)}
            className={inputBase + " min-h-[100px]"}
          />
        </div>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Button onClick={handleSubmitSurvey} disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2.5 font-medium disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</span> : "Guardar Evaluación Final"}
        </Button>
      </div>
    </div>
  );
}

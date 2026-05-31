"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Send, Star, Loader2, AlertCircle, CheckCircle2,
  ChevronRight, MessagesSquare, MessageSquare, Trash2, Cpu, Info,
} from "lucide-react";
import ModoSelector from "@/components/juicio/ModoSelector";
import { MINI_ENCUESTA_LABELS, type ModoType } from "@/lib/agents/prompts";

const inputBase = "w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white dark:text-slate-900 dark:border-slate-200";

const categorias = [
  { id: "CAT-01", nombre: "Sistema de Tracción, Frenado y Control de Potencia Dinámica", tipo: "Mecánico/Eléctrico/Electrónico", frecuencia: "Alta" },
  { id: "CAT-02", nombre: "Lógica de Control Central, Distribución de Energía y Redes de Comunicación Bus", tipo: "Electrónico/Eléctrico", frecuencia: "Media" },
  { id: "CAT-03", nombre: "Cadena de Seguridad, Monitoreo Estático y Dispositivos de Emergencia Activa", tipo: "Seguridad/Eléctrico", frecuencia: "Alta" },
  { id: "CAT-04", nombre: "Cadenas cinemáticas, Operadores, Interconexión y Protecciones de Puertas", tipo: "Mecánico/Electrónico/Seguridad", frecuencia: "Alta" },
  { id: "CAT-05", nombre: "Sistemas de Posicionamiento Geométrico en Hueco, Pesaje de Carga e Interfaz de Usuario", tipo: "Electrónico", frecuencia: "Media" },
];

const freqColor: Record<string, string> = {
  Alta: "bg-red-50 text-red-700 border-red-200",
  Media: "bg-amber-50 text-amber-700 border-amber-200",
  Baja: "bg-green-50 text-green-700 border-green-200",
};

const modelos = ["3300", "5500"] as const;

const emptyActividadesTemplate = [
  { tipo: "sesion" as const, numero: 1 },
  { tipo: "pregunta_individual" as const, numero: 2 },
  { tipo: "pregunta_individual" as const, numero: 3 },
  { tipo: "pregunta_individual" as const, numero: 4 },
  { tipo: "pregunta_individual" as const, numero: 5 },
  { tipo: "pregunta_individual" as const, numero: 6 },
];

interface ActividadState {
  numero: number;
  tipo: "sesion" | "pregunta_individual";
  sesionId?: number;
  categoriaId?: string;
  categoriaNombre?: string;
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

function RadioGroup({ options, value, onChange, label }: { options: { val: string; label: string }[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-bold text-slate-700">{label} <span className="text-red-500">*</span></Label>
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt.val} className="flex items-center gap-2 group cursor-pointer">
            <input type="radio" name="p5_usaria_manana" value={opt.val} checked={value === opt.val} onChange={() => onChange(opt.val)} className="w-5 h-5 text-blue-600 border-slate-300 focus:ring-blue-500" />
            <span className="text-sm text-slate-900 group-hover:text-blue-600 transition-colors">{opt.label}</span>
          </label>
        ))}
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

export default function Fase1Client({ expertoCodigo }: Props) {
  const router = useRouter();
  const chatEndRef = useRef<HTMLDivElement>(null);

  type Pantalla = "dashboard" | "pickCategoria" | "chat" | "miniEncuesta" | "encuestaFinal";
  const [pantalla, setPantalla] = useState<Pantalla>("dashboard");
  const [actividades, setActividades] = useState<ActividadState[]>([]);
  const [loadingActividades, setLoadingActividades] = useState(false);

  // Pick category+model state
  const [pendingCategoriaIdx, setPendingCategoriaIdx] = useState<number>(-1);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");

  // Chat state
  const [currentActividadIdx, setCurrentActividadIdx] = useState<number>(-1);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [catNombre, setCatNombre] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [turno, setTurno] = useState(1);
  const [chatInput, setChatInput] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<ModoType>('diagnostico');
  const [infoOpen, setInfoOpen] = useState(false);

  // Mini encuesta
  const [miniUtilidad, setMiniUtilidad] = useState(0);

  // Final survey
  const [s1, setS1] = useState(0);
  const [s2, setS2] = useState(0);
  const [s3, setS3] = useState<number | null>(null);
  const [s3Texto, setS3Texto] = useState("");
  const [s4, setS4] = useState(0);
  const [s5, setS5] = useState("");
  const [comentario, setComentario] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const completadas = actividades.filter(a => a.estado === "completada").length;

  useEffect(() => {
    loadActividades();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadActividades() {
    setLoadingActividades(true);
    try {
      const { getActividadesFase1 } = await import("@/app/dashboard/juicio/fase1/actions");
      const result = await getActividadesFase1(expertoCodigo);
      if (result.success) {
        const serverActs = result.actividades ?? [];
        const merged = emptyActividadesTemplate.map((slot) => {
          const match = serverActs.find(
            (a: any) => a.tipoActividad === slot.tipo && a.numeroActividad === slot.numero
          );
          if (match) {
            const cat = categorias.find((c) => c.id === match.categoriaId);
            return {
              numero: slot.numero,
              tipo: slot.tipo,
              sesionId: match.sesionId,
              categoriaId: match.categoriaId ?? undefined,
              categoriaNombre: cat?.nombre ?? match.categoriaId ?? undefined,
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
      console.error("Error loading activities:", e);
    } finally {
      setLoadingActividades(false);
    }
  }

  async function handleStartActivity(idx: number) {
    const activity = actividades[idx];
    if (!activity) return;

    // If activity already has a session, load it directly
    if (activity.sesionId) {
      setCurrentActividadIdx(idx);
      setSessionId(activity.sesionId);
      setCatNombre(activity.categoriaNombre || "");
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

    // Otherwise, show picker for category + model
    setPendingCategoriaIdx(idx);
    setSelectedCatId("");
    setSelectedModelo("");
    setPantalla("pickCategoria");
  }

  async function handleConfirmPick() {
    const idx = pendingCategoriaIdx;
    if (idx < 0) return;

    if (!selectedCatId) {
      setErrorMessage("Selecciona una categoría.");
      return;
    }
    if (!selectedModelo) {
      setErrorMessage("Selecciona el modelo de ascensor (3300 o 5500).");
      return;
    }

    const activity = actividades[idx];
    if (!activity) return;

    const cat = categorias.find((c) => c.id === selectedCatId);
    if (!cat) return;

    setErrorMessage("");
    setLoading(true);

    try {
      const { startFase1Activity } = await import("@/app/dashboard/juicio/fase1/actions");
      const result = await startFase1Activity(
        expertoCodigo,
        selectedCatId,
        cat.nombre,
        activity.tipo,
        activity.numero,
        selectedModelo,
      );

      if (result.success) {
        const sid = result.sessionId!;
        setSessionId(sid);
        setCatNombre(cat.nombre);
        setMessages([]);
        setTurno(1);
        setCurrentActividadIdx(idx);

        setActividades((prev) => {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            sesionId: sid,
            categoriaId: selectedCatId,
            categoriaNombre: cat.nombre,
            modelo: selectedModelo,
          };
          return next;
        });

        setPantalla("chat");
      } else {
        setErrorMessage(result.message || "Error al iniciar actividad.");
        setPantalla("dashboard");
      }
    } catch (err) {
      setErrorMessage("Error al iniciar actividad.");
      setPantalla("dashboard");
    } finally {
      setLoading(false);
      setPendingCategoriaIdx(-1);
    }
  }

  function handleCancelPick() {
    setPendingCategoriaIdx(-1);
    setSelectedCatId("");
    setSelectedModelo("");
    setPantalla("dashboard");
  }

  async function callSynapsisApi(userText: string): Promise<string> {
    // Build message history in the format expected by /api/chat
    const currentActivity = actividades[currentActividadIdx];
    const model = currentActivity?.modelo || "3300";

    // Gather all previous messages as context
    const allMessages: { role: "user" | "assistant"; content: string }[] = messages.map((m) => ({
      role: m.emisor === "experto" ? "user" : "assistant",
      content: m.contenido,
    }));

    // Add the new user message
    allMessages.push({ role: "user", content: userText });

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: allMessages,
        equipmentModel: model,
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

    // Parse streaming AI SDK data protocol: lines like 0:"text"
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
            // skip malformed lines
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
      const { sendChatMessage, saveSystemMessage } = await import("@/app/dashboard/juicio/fase1/actions");

      // 1. Save user message to DB
      const saveResult = await sendChatMessage(sessionId, text, turno);
      if (!saveResult.success) {
        setErrorMessage(saveResult.message || "Error al guardar mensaje.");
        setEnviando(false);
        return;
      }

      // 2. Add user message to local state immediately
      setMessages((prev) => [...prev, { emisor: "experto", contenido: text, turno }]);
      setChatInput("");

      // 3. Call Synapsis Go API for response
      const startTime = performance.now();
      const respuesta = await callSynapsisApi(text);
      const elapsed = parseFloat(((performance.now() - startTime) / 1000).toFixed(2));

      // 4. Save system response to DB
      await saveSystemMessage(sessionId, respuesta, turno, elapsed);

      // 5. Add system response to local state
      setMessages((prev) => [...prev, { emisor: "sistema", contenido: respuesta, turno }]);
      setTurno(turno + 1);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al enviar mensaje.");
    } finally {
      setEnviando(false);
    }
  }, [chatInput, sessionId, turno, currentActividadIdx, actividades, messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  function handleChatDone() {
    const activity = actividades[currentActividadIdx];
    if (activity?.miniEncuesta) {
      setPantalla("dashboard");
    } else {
      setMiniUtilidad(0);
      setPantalla("miniEncuesta");
    }
  }

  async function handleSaveMiniEncuesta() {
    if (!miniUtilidad || !sessionId) {
      setErrorMessage("Selecciona una puntuación.");
      return;
    }
    setLoading(true);
    setErrorMessage("");

    try {
      const { saveMiniEncuesta } = await import("@/app/dashboard/juicio/fase1/actions");
      const result = await saveMiniEncuesta(sessionId, miniUtilidad, modo);
      if (result.success) {
        setActividades((prev) => {
          const next = [...prev];
          next[currentActividadIdx] = {
            ...next[currentActividadIdx],
            estado: "completada",
            miniEncuesta: { utilidad: miniUtilidad },
          };
          return next;
        });
        setPantalla("dashboard");
      } else {
        setErrorMessage(result.message || "Error al guardar.");
      }
    } catch {
      setErrorMessage("Error al guardar mini encuesta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteActividad(idx: number) {
    const activity = actividades[idx];
    if (!activity.sesionId) return;
    setLoading(true);

    try {
      const { deleteActividad } = await import("@/app/dashboard/juicio/fase1/actions");
      const result = await deleteActividad(activity.sesionId);
      if (result.success) {
        setActividades((prev) => {
          const next = [...prev];
          next[idx] = { numero: activity.numero, tipo: activity.tipo, estado: "pendiente" };
          return next;
        });
      } else {
        setErrorMessage(result.message || "Error al eliminar.");
      }
    } catch {
      setErrorMessage("Error al eliminar actividad.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitSurvey() {
    setErrorMessage("");

    if (!s1 || !s2 || s3 === null || !s4 || !s5) {
      setErrorMessage("Responde todas las preguntas obligatorias.");
      return;
    }
    if (s3 === 1 && !s3Texto.trim()) {
      setErrorMessage("Indica qué faltó preguntar.");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.set("sesionId", (actividades[0]?.sesionId || sessionId || 0).toString());
      fd.set("p1_sistema_entendio", s1.toString());
      fd.set("p2_respuesta_correcta", s2.toString());
      fd.set("p3_falto_preguntar", s3.toString());
      fd.set("p3_falto_texto", s3Texto);
      fd.set("p4_claridad_junior", s4.toString());
      fd.set("p5_usaria_manana", s5);
      fd.set("comentario_adicional", comentario);

      const evaluaciones = actividades
        .filter((a) => a.miniEncuesta)
        .map((a) => ({
          numero: a.numero,
          tipo: a.tipo,
          categoria_id: a.categoriaId,
          sesion_id: a.sesionId,
          utilidad: a.miniEncuesta?.utilidad,
        }));
      fd.set("evaluaciones_actividades", JSON.stringify(evaluaciones));

      const { submitFase1Survey } = await import("@/app/dashboard/juicio/fase1/actions");
      const result = await submitFase1Survey(fd);
      if (result.success) {
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

  // ── SUCCESS ──
  if (submitted) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Fase 1 Completada</h2>
        <p className="text-slate-500 mt-2">Gracias por tu participación.</p>
        <Button onClick={() => router.push(`/dashboard/juicio/fases?expertoId=${expertoCodigo}`)} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 font-semibold">
          Volver a Fases
        </Button>
      </div>
    );
  }

  // ── PICK CATEGORY + MODEL ──
  if (pantalla === "pickCategoria") {
    const activity = actividades[pendingCategoriaIdx];
    return (
      <div>
        <div className="mb-6">
          <button onClick={handleCancelPick} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mb-3">
            <ArrowLeft className="h-3 w-3" /> Volver al panel
          </button>
          <h2 className="text-xl font-bold text-slate-900">Configurar Actividad {activity?.numero}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {activity?.tipo === "sesion" ? "Sesión de Diagnóstico" : "Pregunta Individual"} — elige el sistema y el modelo de ascensor.
          </p>
        </div>

        {/* Category grid */}
        <div className="mb-8">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Sistema a evaluar <span className="text-red-500">*</span></h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categorias.map((cat) => {
              const sel = selectedCatId === cat.id;
              return (
                <button key={cat.id} type="button" onClick={() => setSelectedCatId(cat.id)}
                  className={`text-left w-full bg-white border rounded-xl p-5 transition-all cursor-pointer ${sel ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md" : "border-slate-200 hover:border-blue-500 hover:shadow-md"}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-mono font-medium bg-slate-100 text-slate-600 px-2 py-1 rounded">{cat.id}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${freqColor[cat.frecuencia] || "bg-slate-100 text-slate-500"}`}>{cat.frecuencia}</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{cat.nombre}</p>
                  <p className="text-xs text-slate-500 mt-1">{cat.tipo}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model selection */}
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
          <Button onClick={handleCancelPick} variant="outline" className="rounded-lg px-6 py-2.5">
            Cancelar
          </Button>
          <Button onClick={handleConfirmPick} disabled={!selectedCatId || !selectedModelo || loading}
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Panel de Actividades</h2>
            <p className="text-sm text-slate-500 mt-1">Completa las 6 actividades para finalizar la Fase 1.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">{completadas}<span className="text-lg text-slate-400">/6</span></div>
            <p className="text-xs text-slate-500">Actividades completadas</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {actividades.map((act, idx) => {
            const isDone = act.estado === "completada";
            const hasSession = !!act.sesionId;
            return (
              <div key={act.numero}
                className={`bg-white border rounded-xl p-4 flex items-center justify-between transition-all ${isDone ? "border-green-200 bg-green-50/30" : "border-slate-200 hover:border-blue-300"}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${act.tipo === "sesion" ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    {act.tipo === "sesion" ? <MessagesSquare className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      Actividad {act.numero}: {act.tipo === "sesion" ? "Sesión" : "Pregunta Individual"}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDone ? "text-green-600" : "text-slate-400"}`}>
                      {isDone
                        ? `Completada${act.miniEncuesta ? ` · Utilidad: ${act.miniEncuesta.utilidad}/5` : ""}`
                        : hasSession ? "En progreso" : "Pendiente"
                      }
                    </p>
                    {act.categoriaNombre && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {act.categoriaNombre} · Schindler {act.modelo || "—"}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {(isDone || hasSession) && (
                    <button type="button" onClick={() => handleDeleteActividad(idx)} disabled={loading}
                      className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="Rehacer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <Button onClick={() => handleStartActivity(idx)} disabled={isDone || loading}
                    className={`rounded-lg text-sm font-medium ${isDone ? "opacity-0 pointer-events-none" : "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"}`}
                  >
                    {hasSession ? "Continuar" : "Iniciar"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {completadas === 6 && (
          <div className="flex justify-center">
            <Button onClick={() => setPantalla("encuestaFinal")}
              className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8 py-3 font-semibold flex items-center gap-2 text-base"
            >
              Ir a Encuesta Final <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}

        {loadingActividades && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
              Actividad {activity?.numero}: {activity?.tipo === "sesion" ? "Sesión de Diagnóstico" : "Pregunta Individual"}
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
            <p className="text-xs text-slate-500">{catNombre} · Schindler {activity?.modelo || "—"}</p>
          </div>
          {turno <= maxTurnos && (
            <span className="text-sm font-medium text-slate-500 shrink-0">Pregunta {turno} de {maxTurnos}</span>
          )}
        </div>

        <div className="flex-1 bg-slate-50 rounded-xl overflow-y-auto p-4 space-y-4 border border-slate-200 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <p className="text-sm">Escribe tu {activity?.tipo === "sesion" ? "primera" : ""} pregunta sobre {catNombre} (Schindler {activity?.modelo || "—"}).</p>
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
              placeholder={`Ej: ¿Cómo diagnosticar fallas en ${catNombre}?`}
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
          <h2 className="text-xl font-bold text-slate-900">Evaluar Actividad {activity?.numero}</h2>
          <p className="text-sm text-slate-500 mt-1">{catNombre} · Schindler {activity?.modelo || "—"}</p>
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
        <h2 className="text-xl font-bold text-slate-900">Encuesta Final — Fase 1</h2>
        <p className="text-sm text-slate-500 mt-1">Has completado las 6 actividades. Responde esta encuesta para finalizar.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
        <StarRating value={s1} onChange={setS1} label="1. ¿El sistema entendió el problema que planteaste en general?" leyenda="1 = Confundió todo / 5 = Captó exacto" />
        <StarRating value={s2} onChange={setS2} label="2. ¿Las respuestas fueron técnicamente correctas?" leyenda="1 = Peligrosas/Erróneas / 5 = Perfectas" />

        <div className="space-y-3">
          <ToggleSiNo value={s3} onChange={setS3} label="3. ¿Faltó que el sistema preguntara algo que un junior no sabe decir?" />
          {s3 === 1 && (
            <Textarea placeholder="¿Qué faltó preguntar?" value={s3Texto} onChange={(e) => setS3Texto(e.target.value)} className={inputBase} rows={2} />
          )}
        </div>

        <StarRating value={s4} onChange={setS4} label="4. ¿La forma de responder sirve para un técnico junior en campo?" leyenda="1 = Demasiado técnica / 5 = Paso a paso, clara para novato" />

        <RadioGroup
          label="5. ¿Usarías esto mañana con tu técnico junior en un caso real?"
          options={[
            { val: "1", label: "Sí" },
            { val: "0", label: "No" },
            { val: "2", label: "Con dudas" },
          ]}
          value={s5}
          onChange={setS5}
        />

        <div className="space-y-2">
          <Label className="text-sm font-bold text-slate-700">6. Comentario adicional (opcional)</Label>
          <Textarea placeholder="Cualquier observación o sugerencia..." value={comentario} onChange={(e) => setComentario(e.target.value)} className={inputBase + " min-h-[100px]"} />
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

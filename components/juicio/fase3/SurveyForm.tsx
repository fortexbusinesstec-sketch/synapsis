"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";

const inputBase = "w-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-white dark:text-slate-900 dark:border-slate-200";

const mercadoOptions = [
  { value: "empresas_mantenimiento", label: "Empresas de mantenimiento de ascensores" },
  { value: "tecnicos_independientes", label: "Técnicos independientes" },
  { value: "edificios", label: "Edificios / Administradores (clientes finales)" },
  { value: "constructoras", label: "Constructoras (preventa)" },
  { value: "capacitacion", label: "Para capacitar técnicos nuevos" },
];

const cobroOptions = [
  { value: "suscripcion_mensual", label: "Suscripción mensual por técnico" },
  { value: "por_diagnostico", label: "Por diagnóstico realizado" },
  { value: "incluido_contrato", label: "Incluido en contrato de mantenimiento" },
  { value: "licencia_anual", label: "Licencia anual por empresa" },
  { value: "no_vendible", label: "No es vendible aún" },
];

const sections = [
  { title: "Comprensión del Producto", range: [0, 0] },
  { title: "Mercado y Modelo de Negocio", range: [1, 2] },
  { title: "Disposición e Impacto Comercial", range: [3, 6] },
  { title: "Comentario Final", range: [7, 7] },
];

interface SurveyFormProps {
  expertoCodigo: string;
  onSuccess?: () => void;
}

export default function SurveyForm({ expertoCodigo, onSuccess }: SurveyFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [p1, setP1] = useState("");
  const [p2, setP2] = useState<string[]>([]);
  const [p2Otro, setP2Otro] = useState("");
  const [p3, setP3] = useState<string[]>([]);
  const [p4, setP4] = useState("");
  const [p5, setP5] = useState<number | null>(null);
  const [p5Condiciones, setP5Condiciones] = useState("");
  const [p6, setP6] = useState<number | null>(null);
  const [p6Modificaciones, setP6Modificaciones] = useState("");
  const [p7, setP7] = useState<number | null>(null);
  const [p7Detalle, setP7Detalle] = useState("");
  const [comentario, setComentario] = useState("");

  const answered = [
    p1.trim() !== "",
    p2.length > 0,
    p3.length > 0,
    p4.trim() !== "",
    p5 !== null,
    p6 !== null,
    p7 !== null,
    true,
  ];
  const answeredCount = answered.filter(Boolean).length;

  const getCurrentSection = () => {
    if (p1.trim() === "") return sections[0].title;
    if (p2.length === 0 && p3.length === 0) return sections[1].title;
    if (p4.trim() === "" && p5 === null && p6 === null && p7 === null) return sections[2].title;
    return sections[3].title;
  };

  const toggleP2 = (val: string) => {
    setP2((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const toggleP3 = (val: string) => {
    setP3((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleSubmit = async (formData: FormData) => {
    setErrorMessage("");

    if (!p1.trim() || p2.length === 0 || p3.length === 0 || !p4.trim() || p5 === null || p6 === null || p7 === null) {
      setErrorMessage("Por favor responde todas las preguntas obligatorias antes de enviar.");
      return;
    }
    if (p5 === 2 && !p5Condiciones.trim()) {
      setErrorMessage("Indica qué condiciones pondrías para comprar.");
      return;
    }
    if (p6 === 2 && !p6Modificaciones.trim()) {
      setErrorMessage("Indica qué modificarías para recomendar.");
      return;
    }
    if (p7 === 1 && !p7Detalle.trim()) {
      setErrorMessage("Describe qué servicio o negocio nuevo abriría.");
      return;
    }

    setSubmitting(true);

    const p2Final = p2.includes("__otro__")
      ? [...p2.filter((v) => v !== "__otro__"), `otro:${p2Otro}`]
      : p2;

    formData.set("expertoCodigo", expertoCodigo);
    formData.set("p1_comprende_producto", p1);
    formData.set("p2_mercado_objetivo", JSON.stringify(p2Final));
    formData.set("p3_modelo_cobro", JSON.stringify(p3));
    formData.set("p4_falta_para_vender", p4);
    formData.set("p5_compraria", p5.toString());
    formData.set("p5_condiciones", p5Condiciones);
    formData.set("p6_recomendaria", p6.toString());
    formData.set("p6_modificaciones", p6Modificaciones);
    formData.set("p7_abre_servicio", p7.toString());
    formData.set("p7_servicio_nuevo_detalle", p7Detalle);
    formData.set("comentario_adicional", comentario);

    try {
      const { submitFase3Action } = await import("@/app/dashboard/juicio/fase3/actions");
      const result = await submitFase3Action(formData);
      if (result.success) {
        onSuccess?.();
      } else {
        setErrorMessage(result.message);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error al enviar la encuesta. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const checkClass = "w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500";
  const radioClass = "w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500";
  const labelClass = "text-sm text-slate-900 group-hover:text-blue-600 transition-colors cursor-pointer";

  return (
    <form action={handleSubmit} className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-slate-500">{getCurrentSection()}</span>
          <span className="text-xs font-medium text-slate-500">{answeredCount} de 8 respondidas</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${(answeredCount / 8) * 100}%` }} />
        </div>
      </div>

      {/* ─── Sección 1: Evaluación del Producto ──────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Comprensión del Producto</h3>

        {/* P1 */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            1. ¿En qué fase consideras que está Synapsis? <span className="text-red-500">*</span>
          </Label>
          <div className="flex flex-col gap-2">
            {['Básica', 'Intermedia', 'Avanzada'].map((opt) => (
              <label
                key={opt}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all text-sm font-semibold ${
                  p1 === opt
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="p1_comprende_producto"
                  value={opt}
                  checked={p1 === opt}
                  onChange={() => setP1(opt)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    p1 === opt ? 'border-blue-500' : 'border-slate-300'
                  }`}
                >
                  {p1 === opt && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ─── Sección 2: Mercado ──────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Mercado y Modelo de Negocio</h3>
        <p className="text-xs text-slate-400 mb-4">Define el público objetivo y cómo monetizar</p>

        {/* P2 */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            2. ¿A quién le vendería esto? <span className="text-red-500">*</span>
          </Label>
          <span className="text-xs text-slate-400 block -mt-1">Marque todo lo que aplique</span>
          <div className="space-y-2">
            {mercadoOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 group">
                <input type="checkbox" checked={p2.includes(opt.value)} onChange={() => toggleP2(opt.value)} className={checkClass} />
                <span className={labelClass}>{opt.label}</span>
              </label>
            ))}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 group">
                <input type="checkbox" checked={p2.includes("__otro__")} onChange={() => toggleP2("__otro__")} className={checkClass} />
                <span className={labelClass}>Otro:</span>
              </label>
              {p2.includes("__otro__") && (
                <input
                  value={p2Otro}
                  onChange={(e) => setP2Otro(e.target.value)}
                  placeholder="Especificar..."
                  className={inputBase + " flex-1"}
                />
              )}
            </div>
          </div>
          <input type="hidden" name="p2_mercado_objetivo" value={JSON.stringify(p2)} />
        </div>

        {/* P3 */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            3. ¿Cómo cree que se debería cobrar? <span className="text-red-500">*</span>
          </Label>
          <span className="text-xs text-slate-400 block -mt-1">Marque todo lo que aplique</span>
          <div className="space-y-2">
            {cobroOptions.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 group">
                <input type="checkbox" checked={p3.includes(opt.value)} onChange={() => toggleP3(opt.value)} className={checkClass} />
                <span className={labelClass}>{opt.label}</span>
              </label>
            ))}
          </div>
          <input type="hidden" name="p3_modelo_cobro" value={JSON.stringify(p3)} />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ─── Sección 3: Disposición ──────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Disposición e Impacto Comercial</h3>
        <p className="text-xs text-slate-400 mb-4">Evalúa la intención de compra y el potencial del producto</p>

        {/* P4 */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            4. ¿Qué le falta al sistema para que usted diga &quot;esto se vende&quot;? <span className="text-red-500">*</span>
          </Label>
          <Textarea
            name="p4_falta_para_vender"
            placeholder="Describe lo que haría falta..."
            value={p4}
            onChange={(e) => setP4(e.target.value)}
            className={inputBase}
            rows={3}
          />
        </div>

        {/* P5 */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            5. ¿Compraría esto para su empresa o equipo? <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            {[
              { val: 1, label: "Sí" },
              { val: 0, label: "No" },
              { val: 2, label: "Con condiciones" },
            ].map((opt) => (
              <label key={opt.val} className="flex items-center gap-2 group">
                <input
                  type="radio"
                  name="p5_compraria"
                  value={opt.val}
                  checked={p5 === opt.val}
                  onChange={() => setP5(opt.val)}
                  className={radioClass}
                />
                <span className={labelClass}>{opt.label}</span>
              </label>
            ))}
          </div>
          {p5 === 2 && (
            <Textarea
              name="p5_condiciones"
              placeholder="¿Qué condiciones? (obligatorio)"
              value={p5Condiciones}
              onChange={(e) => setP5Condiciones(e.target.value)}
              className={inputBase}
              rows={2}
            />
          )}
        </div>

        {/* P6 */}
        <div className="space-y-3 mb-6">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            6. ¿Recomendaría esto a un colega del rubro? <span className="text-red-500">*</span>
          </Label>
          <div className="space-y-2">
            {[
              { val: 1, label: "Sí" },
              { val: 0, label: "No" },
              { val: 2, label: "Con modificaciones" },
            ].map((opt) => (
              <label key={opt.val} className="flex items-center gap-2 group">
                <input
                  type="radio"
                  name="p6_recomendaria"
                  value={opt.val}
                  checked={p6 === opt.val}
                  onChange={() => setP6(opt.val)}
                  className={radioClass}
                />
                <span className={labelClass}>{opt.label}</span>
              </label>
            ))}
          </div>
          {p6 === 2 && (
            <Textarea
              name="p6_modificaciones"
              placeholder="¿Qué modificaría? (obligatorio)"
              value={p6Modificaciones}
              onChange={(e) => setP6Modificaciones(e.target.value)}
              className={inputBase}
              rows={2}
            />
          )}
        </div>

        {/* P7 */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            7. ¿Esto abre algún servicio o negocio nuevo que no tenga hoy? <span className="text-red-500">*</span>
          </Label>
          <div className="flex gap-4">
            {[
              { val: 1, label: "Sí" },
              { val: 0, label: "No" },
            ].map((opt) => (
              <label key={opt.val} className="flex items-center gap-2 group">
                <input
                  type="radio"
                  name="p7_abre_servicio"
                  value={opt.val}
                  checked={p7 === opt.val}
                  onChange={() => setP7(opt.val)}
                  className={radioClass}
                />
                <span className={labelClass}>{opt.label}</span>
              </label>
            ))}
          </div>
          {p7 === 1 && (
            <Textarea
              name="p7_servicio_nuevo_detalle"
              placeholder="¿Cuál servicio o negocio? (obligatorio)"
              value={p7Detalle}
              onChange={(e) => setP7Detalle(e.target.value)}
              className={inputBase}
              rows={2}
            />
          )}
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* ─── Sección 4: Comentario ────────────────────────────────── */}
      <div>
        <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Comentario Final</h3>
        <p className="text-xs text-slate-400 mb-4">Espacio abierto para cualquier observación</p>

        {/* P8 */}
        <div className="space-y-3">
          <Label className="text-sm font-bold text-slate-700 leading-relaxed">
            8. Comentario adicional:
          </Label>
          <Textarea
            name="comentario_adicional"
            placeholder="Cualquier observación, sugerencia o comentario..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            className={inputBase}
            rows={3}
          />
        </div>
      </div>

      {errorMessage && (
        <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-4 border-t border-slate-100">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
            </span>
          ) : (
            "Enviar Encuesta"
          )}
        </Button>
      </div>
    </form>
  );
}

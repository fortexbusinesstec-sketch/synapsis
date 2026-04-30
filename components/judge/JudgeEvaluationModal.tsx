"use client";

import { useState } from "react";
import { Star, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  judgeCaseId: string | null;
  judgeSessionId: string | null;
  judgeProfileId: string | null;
  sessionMetrics?: {
    loop_count?: number;
    total_ms?: number;
    final_confidence?: number;
    stopped_reason?: string;
  };
  onEvaluationComplete: () => void;
}

export function JudgeEvaluationModal({ 
  isOpen, 
  onClose, 
  judgeCaseId, 
  judgeSessionId, 
  judgeProfileId,
  sessionMetrics,
  onEvaluationComplete 
}: EvaluationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    q1_resolved: "", // Sí, No, Parcialmente
    q2_helpful: 0,
    q3_would_use: 0,
    q4_would_recommend: 0,
    q5_clarity: 0,
    q6_time_save: 0,
    missing_info: "",
  });

  if (!isOpen) return null;

  const validate = () => {
    if (!form.q1_resolved) return "Por favor, responde si se resolvió el problema.";
    if (form.q2_helpful === 0 || form.q3_would_use === 0 || form.q4_would_recommend === 0 || form.q5_clarity === 0 || form.q6_time_save === 0) {
        return "Por favor, completa todas las calificaciones de estrellas.";
    }
    if (!form.missing_info.trim()) return "Por favor, describe qué le faltó a la IA.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
        setError(err);
        return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      // 1. Submit Evaluation
      const evalRes = await fetch("/api/judge/evaluations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          judge_case_id: judgeCaseId,
          judge_session_id: judgeSessionId,
          judge_profile_id: judgeProfileId,
          ...form,
          loop_count: sessionMetrics?.loop_count || 0,
          total_ms: sessionMetrics?.total_ms || 0,
          final_confidence: sessionMetrics?.final_confidence || 0,
          stopped_reason: sessionMetrics?.stopped_reason || "finished_by_user"
        })
      });

      if (!evalRes.ok) throw new Error("Error saving evaluation");

      // 2. Mark Case as Completed
      const caseRes = await fetch(`/api/judge/cases/${judgeCaseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: 'completed' })
      });

      if (!caseRes.ok) throw new Error("Error updating case status");

      // 3. Finalize
      onEvaluationComplete();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Hubo un error al guardar la evaluación. Inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <p className="text-sm font-bold text-slate-700">{label}</p>
        <span className={cn("text-[10px] font-black uppercase tracking-widest", value > 0 ? "text-blue-600" : "text-slate-300")}>
            {value > 0 ? `${value} / 5` : "Pendiente"}
        </span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className="flex flex-col items-center group"
          >
            <div className={cn(
              "p-2 rounded-xl transition-all",
              star <= value ? "text-yellow-400 bg-yellow-50" : "text-slate-200 hover:bg-slate-50 hover:text-slate-300"
            )}>
              <Star className={cn("w-6 h-6", star <= value && "fill-current")} />
            </div>
            <span className="text-[8px] font-bold text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {star === 1 ? 'Muy mal' : star === 5 ? 'Excelente' : ''}
            </span>
          </button>
        ))}
      </div>
      <div className="flex justify-between px-1">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Muy mal</span>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Excelente</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-900">Evaluación del Caso</h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Auditando la precisión de la IA</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-white rounded-xl border border-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hidden">
          {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-in shake duration-300">
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-xs font-bold">{error}</p>
              </div>
          )}

          {/* Q1 */}
          <div className="space-y-4">
            <p className="text-sm font-bold text-slate-700">1. ¿Resolvió la IA el problema?</p>
            <div className="flex gap-3">
              {['Sí', 'No', 'Parcialmente'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setForm({ ...form, q1_resolved: opt })}
                  className={cn(
                    "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                    form.q1_resolved === opt 
                      ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              <StarRating label="2. ¿Pudo apoyarte en el diagnóstico?" value={form.q2_helpful} onChange={(v) => setForm({ ...form, q2_helpful: v })} />
              <StarRating label="3. ¿Lo usarías en campo?" value={form.q3_would_use} onChange={(v) => setForm({ ...form, q3_would_use: v })} />
              <StarRating label="4. ¿Lo recomendarías?" value={form.q4_would_recommend} onChange={(v) => setForm({ ...form, q4_would_recommend: v })} />
              <StarRating label="5. ¿Fue clara la información?" value={form.q5_clarity} onChange={(v) => setForm({ ...form, q5_clarity: v })} />
              <StarRating label="6. ¿Te hubiera ahorrado tiempo?" value={form.q6_time_save} onChange={(v) => setForm({ ...form, q6_time_save: v })} />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-slate-700">7. ¿Qué le faltó a la IA? (Información faltante)</p>
            <textarea
              required
              value={form.missing_info}
              onChange={(e) => setForm({ ...form, missing_info: e.target.value })}
              className="w-full h-28 p-5 rounded-[2rem] bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all text-sm font-medium resize-none text-slate-800 placeholder:text-slate-400"
              placeholder="Describe qué información técnica o específica le faltó mencionar a la IA..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 flex justify-end items-center gap-6 flex-shrink-0 bg-slate-50/50">
          <button
            onClick={onClose}
            className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
          >
            Cancelar
          </button>
          <button
            disabled={isSubmitting}
            onClick={handleSave}
            className={cn(
              "flex items-center gap-2 px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
              isSubmitting
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-zinc-900 text-white shadow-xl shadow-zinc-950/20 hover:scale-105 active:scale-95"
            )}
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Finalizar Evaluación
          </button>
        </div>
      </div>
    </div>
  );
}

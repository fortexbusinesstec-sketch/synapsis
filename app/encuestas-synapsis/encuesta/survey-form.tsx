'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Send, Star,
  CheckCircle2, Circle, AlertCircle, Loader2, RefreshCw,
} from 'lucide-react';

type QData = {
  id: number;
  texto: string;
  categoria: string | null;
  referencia: string | null;
  respuestas: { config: string; texto: string }[];
};

type Ratings = Record<string, number>;
type Selections = Record<number, string>;

interface SavedState {
  currentIdx: number;
  ratings: Ratings;
  selections: Selections;
  c1: number | null;
  c2: number | null;
}

const STORAGE_KEY_PREFIX = 'synapsis_encuesta_';

const CONFIG_COLORS: Record<string, string> = {
  B5: 'border-l-blue-500 bg-blue-50/30',
  E: 'border-l-emerald-500 bg-emerald-50/30',
  D: 'border-l-amber-500 bg-amber-50/30',
};

const CONFIG_LABELS: Record<string, string> = {
  B5: 'Versión Completa (B5)',
  E: 'Versión Simplificada (E)',
  D: 'Solo RAG (D)',
};

function storageKey(codigo: string) {
  return `${STORAGE_KEY_PREFIX}${codigo}`;
}

function loadState(codigo: string): SavedState | null {
  try {
    const raw = localStorage.getItem(storageKey(codigo));
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch {
    return null;
  }
}

function saveState(codigo: string, state: SavedState) {
  try {
    localStorage.setItem(storageKey(codigo), JSON.stringify(state));
  } catch {
  }
}

function clearState(codigo: string) {
  try {
    localStorage.removeItem(storageKey(codigo));
  } catch {
  }
}

export default function SurveyForm({
  preguntas,
  codigo,
  totalPreguntas,
}: {
  preguntas: QData[];
  codigo: string;
  totalPreguntas: number;
}) {
  const [initialized, setInitialized] = useState(false);
  const [currentIdx, setCurrentIdxRaw] = useState(0);
  const [ratings, setRatings] = useState<Ratings>({});
  const [selections, setSelections] = useState<Selections>({});
  const [c1, setC1] = useState<number | null>(null);
  const [c2, setC2] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hasSavedProgress, setHasSavedProgress] = useState(false);

  const totalSteps = totalPreguntas + 2; // 11 preguntas + C1 + C2
  const isC1Step = currentIdx === totalPreguntas;
  const isC2Step = currentIdx === totalPreguntas + 1;
  const isExtraStep = isC1Step || isC2Step;
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === totalSteps - 1;

  // Restore saved state on mount
  useEffect(() => {
    const saved = loadState(codigo);
    if (saved) {
      setCurrentIdxRaw(saved.currentIdx);
      setRatings(saved.ratings);
      setSelections(saved.selections);
      if (saved.c1 !== undefined) setC1(saved.c1);
      if (saved.c2 !== undefined) setC2(saved.c2);
      setHasSavedProgress(true);
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist state on every change (only after initial restore)
  useEffect(() => {
    if (!initialized) return;
    saveState(codigo, { currentIdx, ratings, selections, c1, c2 });
  }, [currentIdx, ratings, selections, c1, c2, codigo, initialized]);

  // Clear saved state on successful submit
  useEffect(() => {
    if (submitDone) {
      clearState(codigo);
    }
  }, [submitDone, codigo]);

  const setCurrentIdx = useCallback((fn: number | ((prev: number) => number)) => {
    setCurrentIdxRaw(fn);
  }, []);

  const q = preguntas[currentIdx];

  const allRated = preguntas.every((p) =>
    p.respuestas.every((r) => ratings[`${p.id}-${r.config}`] !== undefined),
  );
  const allSelected = preguntas.every((p) => selections[p.id] !== undefined);
  const allExtraAnswered = c1 !== null && c2 !== null;

  const setRating = useCallback(
    (pregId: number, config: string, val: number) => {
      setRatings((prev) => ({ ...prev, [`${pregId}-${config}`]: val }));
    },
    [],
  );

  const toggleSelection = useCallback((pregId: number, config: string) => {
    setSelections((prev) => {
      if (prev[pregId] === config) {
        const { [pregId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [pregId]: config };
    });
  }, []);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const respuestas = preguntas.flatMap((p) =>
      p.respuestas.map((r) => ({
        codigo_tecnico: codigo,
        id_pregunta: p.id,
        configuracion: r.config,
        respuesta_texto: r.texto,
        puntuacion_utilidad: ratings[`${p.id}-${r.config}`] ?? 1,
        es_seleccionada: selections[p.id] === r.config ? 1 : 0,
      })),
    );

    try {
      const res = await fetch('/api/encuestas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo,
          respuestas,
          c1,
          c2,
          fin: true,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Error HTTP ${res.status}`);
      }
      setSubmitDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitDone) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Encuesta completada!</h2>
        <p className="text-slate-500 max-w-md">
          Muchas gracias por su participación. Sus respuestas han sido registradas exitosamente
          y serán de gran valor para nuestra investigación.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Restored progress banner */}
      {hasSavedProgress && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <RefreshCw className="w-4 h-4 shrink-0" />
          Se ha restaurado tu progreso anterior. Continúa desde donde lo dejaste.
          <button
            type="button"
            onClick={() => { setHasSavedProgress(false); }}
            className="ml-auto text-xs font-medium text-amber-700 hover:text-amber-900 underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              {isExtraStep ? 'Evaluación General' : 'Encuesta de Validación'}
            </span>
            <h1 className="text-lg font-bold text-slate-900 mt-0.5">
              {isC1Step ? 'C1 – Utilidad general' : isC2Step ? 'C2 – Comparación con método actual' : `Pregunta ${currentIdx + 1} de ${totalPreguntas}`}
            </h1>
          </div>
          <span className="text-xs text-slate-400 font-mono">{codigo}</span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* C1 question */}
      {isC1Step && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-4">
          <p className="text-base text-slate-900 leading-relaxed">
            En general, considerando las respuestas que acaba de evaluar, ¿un sistema como este
            (que responde preguntas técnicas mostrando varias opciones) le ayudaría a diagnosticar
            fallas de ascensores más rápido en su trabajo diario?
          </p>
          <div className="space-y-2">
            {[
              { val: 1, label: 'No me ayudaría en absoluto' },
              { val: 2, label: 'Me ayudaría poco' },
              { val: 3, label: 'Me ayudaría moderadamente' },
              { val: 4, label: 'Me ayudaría bastante' },
              { val: 5, label: 'Me ayudaría muchísimo' },
            ].map((opt) => (
              <label
                key={opt.val}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${c1 === opt.val ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  name="c1"
                  checked={c1 === opt.val}
                  onChange={() => setC1(opt.val)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">
                  <strong>{opt.val}</strong> – {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* C2 question */}
      {isC2Step && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-4">
          <p className="text-base text-slate-900 leading-relaxed">
            Comparado con su forma actual de resolver dudas técnicas (buscar en manuales PDF,
            preguntar a compañeros, o usar su propia experiencia), este sistema de preguntas y
            respuestas es:
          </p>
          <div className="space-y-2">
            {[
              { val: 1, label: 'Mucho peor' },
              { val: 2, label: 'Peor' },
              { val: 3, label: 'Igual' },
              { val: 4, label: 'Mejor' },
              { val: 5, label: 'Mucho mejor' },
            ].map((opt) => (
              <label
                key={opt.val}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${c2 === opt.val ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <input
                  type="radio"
                  name="c2"
                  checked={c2 === opt.val}
                  onChange={() => setC2(opt.val)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-slate-700">
                  <strong>{opt.val}</strong> – {opt.label}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Technical question */}
      {!isExtraStep && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6">
            <p className="text-base md:text-lg text-slate-900 font-semibold leading-relaxed">
              {q.texto}
            </p>
            {q.categoria && (
              <span className="inline-block mt-2 text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {q.categoria}
              </span>
            )}
          </div>

          {/* 3 Responses */}
          <div className="grid gap-4 md:grid-cols-3">
            {q.respuestas.map((r) => {
              const key = `${q.id}-${r.config}`;
              const rated = ratings[key];
              const isSelected = selections[q.id] === r.config;

              return (
                <div
                  key={r.config}
                  className={`bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 overflow-hidden transition-all ${CONFIG_COLORS[r.config] ?? ''} ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {CONFIG_LABELS[r.config] ?? r.config}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleSelection(q.id, r.config)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                    >
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                      {isSelected ? 'Seleccionada' : 'Marcar como mejor'}
                    </button>
                  </div>

                  <div className="px-4 pb-2">
                    <div className="text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto bg-white/50 rounded-lg p-2.5 border border-slate-100 whitespace-pre-wrap">
                      {r.texto.length > 600 ? r.texto.slice(0, 600) + '…' : r.texto}
                    </div>
                  </div>

                  <div className="px-4 pb-3">
                    <p className="text-[11px] font-medium text-slate-500 mb-1.5">Utilidad:</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(q.id, r.config, star)}
                          className={`p-1 rounded-md transition-colors ${rated !== undefined && rated >= star ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}
                        >
                          <Star className={`w-5 h-5 ${rated !== undefined && rated >= star ? 'fill-amber-400' : ''}`} />
                        </button>
                      ))}
                      {rated !== undefined && (
                        <span className="text-[11px] text-slate-400 ml-1 self-center">{rated}/5</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>

        <span className="text-xs text-slate-400">
          {currentIdx + 1} / {totalSteps}
          {!isExtraStep && !allRated && (
            <span className="ml-2 text-amber-500">Faltan calificaciones</span>
          )}
          {isC1Step && c1 === null && (
            <span className="ml-2 text-amber-500">Seleccione una opción</span>
          )}
          {isC2Step && c2 === null && (
            <span className="ml-2 text-amber-500">Seleccione una opción</span>
          )}
        </span>

        {isLast ? (
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!allRated || !allSelected || !allExtraAnswered}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
            Enviar encuesta
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIdx((i) => Math.min(totalSteps - 1, i + 1))}
            disabled={(isC1Step && c1 === null) || (isC2Step && c2 === null)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Siguiente
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Confirm dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">¿Enviar encuesta?</h3>
            <p className="text-sm text-slate-600">
              Una vez enviada no podrá modificar sus respuestas. Ha calificado{' '}
              {Object.keys(ratings).length} respuestas y seleccionado la mejor en{' '}
              {Object.keys(selections).length} preguntas.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Seguir revisando
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  'Sí, enviar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useTransition, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ───────────────────────────────────────────────────────────────── */

export interface EnrichmentRow {
  id:                  string;
  referenceId:         string;
  referenceType:       string | null;
  originalExcerpt:     string;
  generatedQuestion:   string;
  questionContext:     string | null;
  expertAnswer:        string | null;
  answerSource:        string | null;
  confidence:          number | null;
  isVerified:          number | null;
  pageNumber:          number | null;
  timesRetrieved:      number | null;
  answerLengthTokens:  number | null;
  createdAt:           string | null;
  reviewedAt:          string | null;
}

interface Props {
  documentId:        string;
  initialPending:    EnrichmentRow[];
  initialInherited:  EnrichmentRow[];
  initialAnswered:   EnrichmentRow[];
  total:             number;
}

/* ── FinOps utility ──────────────────────────────────────────────────────── */

// gpt-4o-mini: ~$0.30 por 1M tokens (promedio input/output)
function calculateCost(tokens: number): string {
  return `$${((tokens / 1_000_000) * 0.30).toFixed(5)} USD`;
}

/* ── CopyButton ──────────────────────────────────────────────────────────── */

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silencioso
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copiado' : (label ?? 'Copiar')}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all',
        copied
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700',
      )}
    >
      {copied
        ? <><Check className="h-3 w-3" /> Copiado</>
        : <><Copy className="h-3 w-3" /> {label ?? 'Copiar'}</>
      }
    </button>
  );
}

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round((value ?? 0) * 100);
  const color =
    pct >= 90 ? 'bg-red-500' :
    pct >= 75 ? 'bg-amber-500' :
    'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono text-slate-400 tabular-nums w-7">{pct}%</span>
    </div>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (type === 'image') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        imagen
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
      texto
    </span>
  );
}

function CoverageBar({ answered, inherited, total }: { answered: number; inherited: number; total: number }) {
  const pct = total > 0 ? Math.round(((answered + inherited) / total) * 100) : 0;
  const barColor =
    pct < 30  ? 'bg-red-500' :
    pct < 70  ? 'bg-amber-500' :
    'bg-emerald-500';
  const textColor =
    pct < 30  ? 'text-red-700' :
    pct < 70  ? 'text-amber-700' :
    'text-emerald-700';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">
          <strong>{answered + inherited}</strong> de <strong>{total}</strong> lagunas respondidas
          {inherited > 0 && (
            <span className="ml-1.5 text-xs text-emerald-600 font-medium">
              ({inherited} heredadas)
            </span>
          )}
        </span>
        <span className={cn('text-sm font-bold', textColor)}>
          Cobertura del conocimiento: {pct}%
        </span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export function EnrichmentReviewer({ documentId, initialPending, initialInherited, initialAnswered, total }: Props) {
  const [pending,    setPending]    = useState<EnrichmentRow[]>(initialPending);
  const [inherited,  setInherited]  = useState<EnrichmentRow[]>(initialInherited);
  const [answered,   setAnswered]   = useState<EnrichmentRow[]>(initialAnswered);
  const [selected,   setSelected]   = useState<EnrichmentRow | null>(initialPending[0] ?? null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [answer,     setAnswer]     = useState('');
  const [error,      setError]      = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const answeredCount  = answered.length;
  const inheritedCount = inherited.length;

  // IDs que se enviarán al guardar: los checkboxes marcados, o el seleccionado si no hay ninguno
  const idsToSave: string[] =
    checkedIds.size > 0
      ? Array.from(checkedIds)
      : selected ? [selected.id] : [];

  const isUnifyMode = checkedIds.size > 1;

  const toggleCheck = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // no cambiar el panel derecho
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSave = () => {
    if (!answer.trim() || idsToSave.length === 0) return;
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/enrich`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enrichmentIds: idsToSave, expertAnswer: answer.trim() }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError((data as any).error ?? 'Error al guardar');
          return;
        }

        const savedSet = new Set(idsToSave);
        const newPending = pending.filter(p => !savedSet.has(p.id));
        const answerLengthTokens = Math.round(answer.trim().length / 4);

        const newAnswered: EnrichmentRow[] = pending
          .filter(p => savedSet.has(p.id))
          .map(p => ({ ...p, expertAnswer: answer.trim(), isVerified: 1, answerSource: 'expert', answerLengthTokens }));

        setPending(newPending);
        setAnswered(prev => [...newAnswered, ...prev]);
        setCheckedIds(new Set());
        setAnswer('');
        setSelected(newPending[0] ?? null);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  };

  const copyText = selected
    ? `Pregunta: ${selected.generatedQuestion}\n\nFragmento original:\n${selected.originalExcerpt}`
    : '';

  const estimatedTokens = Math.round(answer.length / 4);

  return (
    <div className="space-y-4">
      <CoverageBar answered={answeredCount} inherited={inheritedCount} total={total} />

      {/*
        Layout de dos columnas.
        La columna derecha usa sticky con top calculado para el TopBar (64px) + padding (24px) = 88px.
        max-h limita la altura al viewport disponible para que el panel no desborde y sea scrolleable internamente.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── Columna izquierda: lista de lagunas ── */}
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">
                Pendientes ({pending.length})
              </h2>

              {/* Tip "Unificar y Responder" */}
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-700 leading-relaxed">
                <span className="text-base leading-none mt-px">💡</span>
                <span>
                  ¿Ves preguntas repetidas en diferentes partes del manual?
                  Selecciona varias con los checkboxes y unifícalas para responderlas todas de una sola vez.
                </span>
              </div>
            </>
          )}

          {pending.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 bg-white border border-slate-200 rounded-2xl text-slate-400 gap-2">
              <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm">Todas las lagunas han sido respondidas</p>
            </div>
          )}

          {pending.map(item => (
            <button
              key={item.id}
              onClick={() => { setSelected(item); setAnswer(''); setError(null); }}
              className={cn(
                'w-full text-left p-4 rounded-2xl border transition-all space-y-2.5',
                checkedIds.has(item.id)
                  ? 'border-violet-400 bg-violet-50/60 shadow-sm ring-1 ring-violet-200'
                  : selected?.id === item.id
                  ? 'border-blue-400 bg-blue-50/60 shadow-sm ring-1 ring-blue-200'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Checkbox "Unificar" */}
                  <span
                    role="checkbox"
                    aria-checked={checkedIds.has(item.id)}
                    onClick={e => toggleCheck(e, item.id)}
                    className={cn(
                      'flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer',
                      checkedIds.has(item.id)
                        ? 'border-violet-500 bg-violet-500'
                        : 'border-slate-300 bg-white hover:border-violet-400',
                    )}
                  >
                    {checkedIds.has(item.id) && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 5l2.5 2.5 4.5-4.5" />
                      </svg>
                    )}
                  </span>

                  <TypeBadge type={item.referenceType} />
                  {item.pageNumber != null && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Pág. {item.pageNumber}
                    </span>
                  )}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                  Pendiente
                </span>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2 font-mono leading-relaxed">
                {item.originalExcerpt}
              </p>

              <p className="text-sm font-semibold text-slate-800 leading-snug">
                {item.generatedQuestion}
              </p>

              {item.questionContext && (
                <p className="text-xs italic text-slate-400 leading-relaxed">
                  {item.questionContext}
                </p>
              )}

              <ConfidenceBar value={item.confidence ?? 0} />
            </button>
          ))}

          {inherited.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 pt-2">
                Auto-respondidas ({inherited.length})
              </h2>
              {inherited.map(item => (
                <div
                  key={item.id}
                  className="w-full p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={item.referenceType} />
                      {item.pageNumber != null && (
                        <span className="text-[10px] font-mono text-slate-400">Pág. {item.pageNumber}</span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Heredada
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 leading-snug">
                    {item.generatedQuestion}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    {item.expertAnswer}
                  </p>
                  <p className="text-[10px] text-emerald-600">
                    Respuesta heredada automáticamente de otro documento
                  </p>
                </div>
              ))}
            </>
          )}

          {answered.length > 0 && (
            <>
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 pt-2">
                Respondidas ({answered.length})
              </h2>
              {answered.map(item => (
                <div
                  key={item.id}
                  className="w-full p-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <TypeBadge type={item.referenceType} />
                      {item.pageNumber != null && (
                        <span className="text-[10px] font-mono text-slate-400">Pág. {item.pageNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(item.timesRetrieved ?? 0) > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          ×{item.timesRetrieved} RAG
                        </span>
                      )}
                      {(item.answerLengthTokens ?? 0) > 0 && (
                        <span className="text-[10px] font-mono text-slate-400">
                          Costo: {calculateCost(item.answerLengthTokens!)}
                        </span>
                      )}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                        Respondida
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 leading-snug">
                    {item.generatedQuestion}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.expertAnswer}
                  </p>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Columna derecha: panel sticky ──────────────────────────────────
            top-[88px] = TopBar (64px) + padding de página (24px)
            max-h limita al viewport disponible → el panel hace scroll interno
            si su contenido es más alto que la pantalla.                     */}
        <div className="sticky top-[88px] max-h-[calc(100vh-100px)] overflow-y-auto rounded-2xl">
          {selected ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">

              {/* Header del panel con botón copiar */}
              <div className="flex items-start justify-between gap-3 p-5 pb-0">
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-slate-900 leading-snug">
                    {selected.generatedQuestion}
                  </h2>
                  {selected.questionContext && (
                    <p className="mt-1.5 text-xs italic text-slate-500">{selected.questionContext}</p>
                  )}
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <CopyButton
                    text={copyText}
                    label="Copiar pregunta"
                  />
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Fragmento original */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      Fragmento original
                      {selected.pageNumber != null && (
                        <span className="ml-2 font-mono text-slate-400 normal-case">· Pág. {selected.pageNumber}</span>
                      )}
                    </p>
                    <CopyButton text={selected.originalExcerpt} label="Copiar fragmento" />
                  </div>
                  <div className="px-4 py-3 max-h-44 overflow-y-auto">
                    <p className="text-xs text-slate-700 font-mono leading-relaxed whitespace-pre-wrap">
                      {selected.originalExcerpt}
                    </p>
                  </div>
                </div>

                {/* Indicador de modo unificación */}
                {isUnifyMode && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-xs text-violet-700 font-medium">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Esta respuesta se aplicará a las {checkedIds.size} preguntas seleccionadas
                  </div>
                )}

                {/* Textarea de respuesta */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Tu respuesta técnica experta
                    </label>
                    {answer.length > 0 && (
                      <span className={cn(
                        'text-[10px] font-mono tabular-nums',
                        estimatedTokens > 300
                          ? 'text-amber-500 font-semibold'
                          : 'text-slate-400',
                      )}>
                        Costo: {calculateCost(estimatedTokens)}
                        {estimatedTokens > 300 && ' · respuesta larga'}
                      </span>
                    )}
                  </div>
                  <textarea
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    rows={7}
                    placeholder="Explica con detalle técnico. Esta respuesta se vectorizará y el Ingeniero Jefe la usará en futuras consultas."
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none leading-relaxed transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={!answer.trim() || isPending}
                  className={cn(
                    'w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-all',
                    !answer.trim() || isPending
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : isUnifyMode
                      ? 'bg-violet-600 text-white hover:bg-violet-700 active:scale-[0.98] shadow-sm'
                      : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-sm',
                  )}
                >
                  {isPending
                    ? 'Vectorizando…'
                    : isUnifyMode
                    ? `Unificar y Responder (${checkedIds.size} seleccionadas)`
                    : 'Guardar y vectorizar'
                  }
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-white border border-slate-200 rounded-2xl text-slate-400 gap-2">
              <svg className="h-8 w-8 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
              </svg>
              <p className="text-sm">Selecciona una laguna para responder</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

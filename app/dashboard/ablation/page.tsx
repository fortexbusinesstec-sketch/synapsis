'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  FlaskConical, ChevronRight, X, CheckSquare, Square,
  Play, Loader2, CheckCircle2, AlertCircle, BookOpen,
  Sliders, Eye, Layers, Search, Zap, Plus, Trash2, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Tipos ────────────────────────────────────────────────────────────────── */
interface AblationQuestion {
  id: string;
  category: string;
  category_number: number;
  question_text: string;
  expected_agent_critical: string | null;
  difficulty: string;
  ground_truth: string;
  reasoning_indicators: string | null;
  requires_visual: number;
  requires_enrichment: number;
  requires_ordering: number;
  equipment_model: string | null;
}

interface AblationConfig {
  id: string;
  name: string;
  description: string | null;
  clarifier_enabled: number;
  bibliotecario_enabled: number;
  planner_enabled: number;
  selector_enabled: number;
  analista_enabled: number;
  enrichments_enabled: number;
  images_enabled: number;
  rag_enabled: number;
  is_baseline: number;
  display_order: number;
}

/* ── Constantes ───────────────────────────────────────────────────────────── */
const CAT_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  diagnostico_tecnico: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500', label: 'Cat I — Diagnóstico' },
  ambigua: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Cat II — Ambigua' },
  secuencial: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Cat III — Secuencial' },
  enriquecimiento: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Cat IV — Enriquecimiento' },
  visual: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500', label: 'Cat V — Visual' },
};

const DIFF_STYLE: Record<string, string> = {
  easy: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
  medium: 'bg-blue-50 text-blue-600 border border-blue-200',
  hard: 'bg-red-50 text-red-600 border border-red-200',
};

const AGENT_LABELS: Record<string, string> = {
  clarifier: 'Clarificador',
  planner: 'Planificador',
  bibliotecario: 'Bibliotecario',
  selector: 'Selector',
  analista: 'Analista',
  enrichment: 'Enriquecimiento',
};

const ALL_CATEGORIES = [
  'diagnostico_tecnico', 'ambigua', 'secuencial', 'enriquecimiento', 'visual',
];

/* ── Shared helpers ───────────────────────────────────────────────────────── */
function Toggle({ on, onClick }: { on: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
        on ? 'bg-emerald-500' : 'bg-slate-200',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
        on ? 'translate-x-4' : 'translate-x-1',
      )} />
    </button>
  );
}

function CatBadge({ category }: { category: string }) {
  const s = CAT_STYLE[category] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: category };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">{children}</label>;
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
        'disabled:opacity-50',
        className,
      )}
    />
  );
}

function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all',
        'disabled:opacity-50',
        className,
      )}
    >
      {children}
    </select>
  );
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-800',
        'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none',
        'disabled:opacity-50',
        className,
      )}
    />
  );
}

/* ── Modal base ───────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-800">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — NUEVA PREGUNTA
══════════════════════════════════════════════════════════════════════════ */
function NewQuestionModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState('');
  const [category, setCategory] = useState('diagnostico_tecnico');
  const [questionText, setQuestionText] = useState('');
  // Rediseño Ground Truth
  const [factualCore, setFactualCore] = useState('');
  const [reasoningIndicators, setReasoningIndicators] = useState<string[]>(['']);

  const [difficulty, setDifficulty] = useState('medium');
  const [equipmentModel, setEquipmentModel] = useState('');
  const [agentCritical, setAgentCritical] = useState('');
  const [requiresVisual, setRequiresVisual] = useState(false);
  const [requiresEnrich, setRequiresEnrich] = useState(false);
  const [requiresOrdering, setRequiresOrdering] = useState(false);
  const [isAmbiguous, setIsAmbiguous] = useState(false);

  const addIndicator = () => setReasoningIndicators([...reasoningIndicators, '']);
  const removeIndicator = (idx: number) => setReasoningIndicators(reasoningIndicators.filter((_, i) => i !== idx));
  const updateIndicator = (idx: number, val: string) => {
    const next = [...reasoningIndicators];
    next[idx] = val;
    setReasoningIndicators(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ablation/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          category,
          question_text: questionText.trim(),
          ground_truth: factualCore.trim(),
          reasoning_indicators: JSON.stringify(reasoningIndicators.filter(i => i.trim())),
          difficulty,
          equipment_model: equipmentModel.trim() || null,
          expected_agent_critical: agentCritical || null,
          requires_visual: requiresVisual ? 1 : 0,
          requires_enrichment: requiresEnrich ? 1 : 0,
          requires_ordering: requiresOrdering ? 1 : 0,
          is_ambiguous: isAmbiguous ? 1 : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nueva pregunta de ablación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ID + Categoría */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>ID *</FieldLabel>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="P01 / Q001"
              required
              className="font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Identificador único (ej: P01, Q042)</p>
          </div>
          <div>
            <FieldLabel>Categoría *</FieldLabel>
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>{CAT_STYLE[c].label}</option>
              ))}
            </Select>
          </div>
        </div>

        {/* Pregunta */}
        <div>
          <FieldLabel>Pregunta completa *</FieldLabel>
          <Textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="¿Cuál es el procedimiento para...?"
            rows={3}
            required
          />
        </div>

        {/* Ground Truth Rediseñado */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-4 h-4 text-violet-500" />
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">Configuración del Ground Truth</h3>
          </div>

          <div>
            <FieldLabel>1. Factual Core (Datos duros del manual) *</FieldLabel>
            <Textarea
              value={factualCore}
              onChange={(e) => setFactualCore(e.target.value)}
              placeholder="Ej: E07 indica falla de comunicación CAN. Verificar 120Ω..."
              rows={3}
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>2. Reasoning Indicators (Comportamientos deseados)</FieldLabel>
              <button
                type="button"
                onClick={addIndicator}
                className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Añadir
              </button>
            </div>
            <div className="space-y-2">
              {reasoningIndicators.map((val, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={val}
                    onChange={(e) => updateIndicator(idx, e.target.value)}
                    placeholder="Ej: identifica el componente raíz..."
                    className="flex-1"
                  />
                  {reasoningIndicators.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIndicator(idx)}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-400 italic">
            El juez evaluará la respuesta basándose en estos dos ejes: precisión técnica y calidad del razonamiento.
          </p>
        </div>

        {/* Dificultad + Modelo + Agente crítico */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel>Dificultad</FieldLabel>
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="easy">Fácil</option>
              <option value="medium">Media</option>
              <option value="hard">Difícil</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Modelo de equipo</FieldLabel>
            <Select value={equipmentModel} onChange={(e) => setEquipmentModel(e.target.value)}>
              <option value="">General</option>
              <option value="3300">3300</option>
              <option value="5500">5500</option>
              <option value="MRL">MRL</option>
              <option value="general">general</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Agente crítico</FieldLabel>
            <Select value={agentCritical} onChange={(e) => setAgentCritical(e.target.value)}>
              <option value="">— ninguno —</option>
              <option value="clarifier">Clarificador</option>
              <option value="analista">Analista</option>
              <option value="image_validator">Img Validator</option>
              <option value="enrichment">Enriquecimiento</option>
            </Select>
          </div>
        </div>

        {/* Flags */}
        <div>
          <FieldLabel>Flags de la pregunta</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Requiere imagen', val: requiresVisual, set: setRequiresVisual },
              { label: 'Requiere enrichment', val: requiresEnrich, set: setRequiresEnrich },
              { label: 'Requiere ordenamiento', val: requiresOrdering, set: setRequiresOrdering },
              { label: 'Es ambigua', val: isAmbiguous, set: setIsAmbiguous },
            ].map(({ label, val, set }) => (
              <label key={label} className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all select-none',
                val ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300',
              )}>
                <input
                  type="checkbox"
                  checked={val}
                  onChange={(e) => set(e.target.checked)}
                  className="accent-blue-600"
                />
                <span className="text-xs font-bold">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Guardar pregunta
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MODAL — NUEVA CONFIGURACIÓN
══════════════════════════════════════════════════════════════════════════ */

const AGENT_TOGGLES = [
  { key: 'clarifier_enabled', label: 'Clarificador', desc: 'Analizador semántico (intent + entities). Nunca reescribe.', icon: Search },
  { key: 'planner_enabled', label: 'Planificador', desc: 'Gestor del Gap Engine. Genera re-búsquedas quirúrgicas en Loop 1+. Si OFF: Solo hay Loop 0.', icon: Zap },
  { key: 'bibliotecario_enabled', label: 'Bibliotecario', desc: 'Grafo unificado: chunks + enrichments + imágenes.', icon: BookOpen },
  { key: 'selector_enabled', label: 'Selector', desc: 'Elige los 3-5 chunks más relevantes (lógica pura, sin LLM).', icon: Layers },
  { key: 'analista_enabled', label: 'Analista', desc: 'Hipótesis de causa raíz. Controla el bucle React.', icon: Sliders },
  { key: 'enrichments_enabled', label: 'Enrichments', desc: 'Incluye Q&A validados por experto en el contexto.', icon: Eye },
  { key: 'images_enabled', label: 'Imágenes', desc: 'Incluye extracted_images en la búsqueda del Bibliotecario.', icon: Eye },
] as const;

type AgentKey = typeof AGENT_TOGGLES[number]['key'];

function NewConfigModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isBaseline, setIsBaseline] = useState(false);

  const [agents, setAgents] = useState<Record<AgentKey, boolean>>({
    clarifier_enabled: true,
    planner_enabled: true,
    bibliotecario_enabled: true,
    selector_enabled: true,
    analista_enabled: true,
    enrichments_enabled: true,
    images_enabled: true,
  });

  const toggleAgent = (key: AgentKey) =>
    setAgents((prev) => ({ ...prev, [key]: !prev[key] }));

  const disabledCount = Object.values(agents).filter((v) => !v).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/ablation/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id.trim(),
          name: name.trim(),
          description: description.trim() || null,
          is_baseline: isBaseline ? 1 : 0,
          ...Object.fromEntries(
            Object.entries(agents).map(([k, v]) => [k, v ? 1 : 0])
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al guardar');
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Nueva configuración de ablación" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ID + Nombre */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <FieldLabel>ID *</FieldLabel>
            <Input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="A / B / G"
              required
              className="font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">Una letra o código corto</p>
          </div>
          <div className="col-span-2">
            <FieldLabel>Nombre *</FieldLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sin Clarificador"
              required
            />
          </div>
        </div>

        {/* Descripción */}
        <div>
          <FieldLabel>Descripción</FieldLabel>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Configuración que deshabilita el agente Clarificador para medir su impacto..."
            rows={2}
          />
        </div>

        {/* Toggles de agentes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Agentes activos</FieldLabel>
            {disabledCount > 0 && (
              <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
                {disabledCount} agente{disabledCount > 1 ? 's' : ''} deshabilitado{disabledCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {AGENT_TOGGLES.map(({ key, label, desc, icon: Icon }) => {
              const on = agents[key];
              return (
                <div
                  key={key}
                  onClick={() => toggleAgent(key)}
                  className={cn(
                    'flex items-center justify-between gap-4 px-4 py-3 rounded-xl border cursor-pointer transition-all select-none',
                    on
                      ? 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
                      : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-90',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'p-1.5 rounded-lg border transition-colors',
                      on ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400',
                    )}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-bold', on ? 'text-slate-800' : 'text-slate-400 line-through')}>{label}</p>
                      <p className="text-[11px] text-slate-400 truncate">{desc}</p>
                    </div>
                  </div>
                  <Toggle on={on} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen visual */}
        <div className={cn(
          'px-4 py-3 rounded-xl border text-sm font-medium',
          disabledCount === 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : disabledCount >= 5
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-amber-50 border-amber-200 text-amber-700',
        )}>
          {disabledCount === 0 && '✓ Configuración completa — todos los agentes activos (equivale a Config A)'}
          {disabledCount === 1 && `⚠ Ablación simple — se deshabilitará 1 agente`}
          {disabledCount > 1 && disabledCount < 6 && `⚠ Ablación múltiple — ${disabledCount} agentes deshabilitados`}
          {disabledCount >= 6 && '✗ Sin agentes RAG — solo LLM base (equivale a Config F)'}
        </div>

        {/* Baseline */}
        <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:border-blue-300 transition-colors select-none">
          <input
            type="checkbox"
            checked={isBaseline}
            onChange={(e) => setIsBaseline(e.target.checked)}
            className="accent-blue-600 w-4 h-4"
          />
          <div>
            <p className="text-sm font-bold text-slate-700">Marcar como Benchmark</p>
            <p className="text-[11px] text-slate-400">Se resaltará con badge azul en las vistas de resultados</p>
          </div>
        </label>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Guardar configuración
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DRAWER — Detalle de pregunta (solo lectura)
══════════════════════════════════════════════════════════════════════════ */
function QuestionDrawer({ question, onClose }: { question: AblationQuestion | null; onClose: () => void }) {
  if (!question) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center border border-violet-100">
              <BookOpen className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregunta</p>
              <p className="text-sm font-bold text-slate-800 font-mono">{question.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <CatBadge category={question.category} />
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', DIFF_STYLE[question.difficulty] ?? DIFF_STYLE.medium)}>
              {question.difficulty}
            </span>
            {question.equipment_model && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                {question.equipment_model}
              </span>
            )}
            {question.expected_agent_critical && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                Crítico: {AGENT_LABELS[question.expected_agent_critical] ?? question.expected_agent_critical}
              </span>
            )}
          </div>
          <div className="flex gap-3 text-[11px] font-bold text-slate-500">
            {question.requires_visual === 1 && <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-purple-500" /> Visual</span>}
            {question.requires_enrichment === 1 && <span className="flex items-center gap-1"><Layers className="w-3 h-3 text-rose-500" />   Enrichment</span>}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pregunta completa</p>
            <p className="text-sm text-slate-800 leading-relaxed bg-slate-50 rounded-2xl p-4 border border-slate-100">
              {question.question_text}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ground Truth (Dual)</p>
            <div className="space-y-3">
              {/* Factual Core */}
              <div className="bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2">Factual Core</p>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{question.ground_truth}</p>
              </div>

              {/* Reasoning Indicators */}
              <div className="bg-blue-50/60 rounded-2xl p-4 border border-blue-100">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-2">Reasoning Indicators</p>
                {(() => {
                  try {
                    const indicators = JSON.parse(question.reasoning_indicators || '[]');
                    if (Array.isArray(indicators) && indicators.length > 0) {
                      return (
                        <ul className="list-disc list-inside space-y-1">
                          {indicators.map((ind: string, i: number) => (
                            <li key={i} className="text-sm text-slate-700 leading-relaxed">{ind}</li>
                          ))}
                        </ul>
                      );
                    }
                  } catch (e) { }
                  return <p className="text-xs text-slate-400 italic">No hay indicadores de razonamiento definidos.</p>;
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN A — Banco de Preguntas
══════════════════════════════════════════════════════════════════════════ */
function SectionQuestions({
  questions,
  onRefresh,
}: {
  questions: AblationQuestion[];
  onRefresh: () => void;
}) {
  const [selected, setSelected] = useState<AblationQuestion | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;

  const pages = Math.ceil(questions.length / PER_PAGE);
  const visible = questions.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{questions.length}</span> preguntas
          </p>
          <div className="flex items-center gap-1.5">
            {ALL_CATEGORIES.map((cat) => {
              const s = CAT_STYLE[cat];
              const n = questions.filter((q) => q.category === cat).length;
              return (
                <span key={cat} className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', s.bg, s.text)}>
                  {n}
                </span>
              );
            })}
          </div>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva pregunta
        </button>
      </div>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {questions.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium">No hay preguntas todavía.</p>
            <button onClick={() => setShowNewForm(true)} className="mt-3 text-sm font-bold text-blue-600 hover:underline">
              Crear la primera pregunta →
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  {['ID', 'Categoría', 'Pregunta', 'Modelo', 'Dificultad', 'Agente crítico', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visible.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{q.id}</span>
                    </td>
                    <td className="px-4 py-3"><CatBadge category={q.category} /></td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="truncate text-slate-700">{q.question_text.slice(0, 80)}{q.question_text.length > 80 ? '…' : ''}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-slate-500">{q.equipment_model ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', DIFF_STYLE[q.difficulty] ?? DIFF_STYLE.medium)}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {q.expected_agent_critical
                        ? <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{AGENT_LABELS[q.expected_agent_critical] ?? q.expected_agent_critical}</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setSelected(q)} className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
                        Ver <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50">
                <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="text-xs font-bold text-slate-500 disabled:opacity-30">← Anterior</button>
                <span className="text-[11px] text-slate-400">{page + 1} / {pages}</span>
                <button disabled={page === pages - 1} onClick={() => setPage((p) => p + 1)} className="text-xs font-bold text-slate-500 disabled:opacity-30">Siguiente →</button>
              </div>
            )}
          </>
        )}
      </div>

      {selected && <QuestionDrawer question={selected} onClose={() => setSelected(null)} />}
      {showNewForm && <NewQuestionModal onClose={() => setShowNewForm(false)} onCreated={() => { onRefresh(); setPage(0); }} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN B — Configuraciones
══════════════════════════════════════════════════════════════════════════ */
function ConfigCard({ config }: { config: AblationConfig }) {
  return (
    <div className={cn(
      'bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow space-y-4',
      config.is_baseline ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-black text-slate-800">{config.id}</span>
            {config.is_baseline === 1 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 border border-blue-200 uppercase tracking-wide">Benchmark</span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-700 mt-0.5">{config.name}</p>
        </div>
        <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
          <Sliders className="w-4 h-4" />
        </div>
      </div>
      {config.description && (
        <p className="text-xs text-slate-500 leading-relaxed">{config.description}</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        {AGENT_TOGGLES.map(({ key, label, icon: Icon }) => {
          const on = (config as any)[key] !== 0;
          return (
            <div key={key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5">
                <Icon className={cn('w-3.5 h-3.5', on ? 'text-emerald-500' : 'text-slate-300')} />
                <span className={cn('text-[11px] font-bold', on ? 'text-slate-700' : 'text-slate-400')}>{label}</span>
              </div>
              <Toggle on={on} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionConfigs({ configs, onRefresh }: { configs: AblationConfig[]; onRefresh: () => void }) {
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-800">{configs.length}</span> configuraciones
        </p>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva configuración
        </button>
      </div>

      {configs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white border border-slate-200 rounded-2xl">
          <Sliders className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm font-medium">No hay configuraciones todavía.</p>
          <button onClick={() => setShowNewForm(true)} className="mt-3 text-sm font-bold text-violet-600 hover:underline">
            Crear la primera configuración →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {configs.map((c) => <ConfigCard key={c.id} config={c} />)}
        </div>
      )}

      {showNewForm && (
        <NewConfigModal
          onClose={() => setShowNewForm(false)}
          onCreated={onRefresh}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN C — Runner
══════════════════════════════════════════════════════════════════════════ */
type RunStatus = 'idle' | 'creating' | 'running' | 'done' | 'error';

function SectionRunner({ configs, questions }: { configs: AblationConfig[]; questions: AblationQuestion[] }) {
  const [batch, setBatch] = useState('');
  const [selConfigs, setSelConfigs] = useState<Set<string>>(new Set(configs.map((c) => c.id)));
  const [selCategories, setSelCategories] = useState<Set<string>>(new Set(ALL_CATEGORIES));
  const [runStatus, setRunStatus] = useState<RunStatus>('idle');
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneBatch, setDoneBatch] = useState<string | null>(null);
  const [prevBatches, setPrevBatches] = useState<BatchRow[]>([]);

  // Cargar batches anteriores al montar
  useEffect(() => {
    fetch('/api/ablation/batches')
      .then((r) => r.json())
      .then((d) => setPrevBatches(Array.isArray(d) ? d : []))
      .catch(() => { });
  }, []);

  // Keepalive: renueva la cookie de sesión cada 10 min mientras hay un run activo
  useEffect(() => {
    if (runStatus !== 'running' && runStatus !== 'creating') return;
    const id = setInterval(() => {
      fetch('/api/session/refresh').catch(() => { });
    }, 10 * 60 * 1000); // 10 minutos
    return () => clearInterval(id);
  }, [runStatus]);

  const toggleConfig = (id: string) => setSelConfigs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleCategory = (c: string) => setSelCategories(s => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const filteredCount = questions.filter((q) => selCategories.has(q.category)).length;
  const estimatedRuns = filteredCount * selConfigs.size;
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const handleStart = useCallback(async () => {
    if (!batch.trim()) { setErrorMsg('Escribe un nombre para el batch'); return; }
    if (!selConfigs.size) { setErrorMsg('Selecciona al menos una configuración'); return; }
    if (!selCategories.size) { setErrorMsg('Selecciona al menos una categoría'); return; }
    setErrorMsg(null);
    setRunStatus('creating');

    try {
      const createRes = await fetch('/api/ablation/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          run_batch: batch.trim(),
          config_ids: [...selConfigs],
          categories: [...selCategories],
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error ?? 'Error creando runs');

      const runIds: string[] = createData.run_ids;
      setProgress({ total: runIds.length, completed: 0, failed: 0 });
      setRunStatus('running');

      let completed = 0;
      let failed = 0;

      for (const runId of runIds) {
        try {
          const runRes = await fetch('/api/ablation/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId }),
          });
          if (!runRes.ok) throw new Error(`HTTP ${runRes.status}`);

          await fetch('/api/ablation/judge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId }),
          });

          completed++;
        } catch (err) {
          console.error(`Run ${runId}:`, err);
          failed++;
        }
        setProgress({ total: runIds.length, completed: completed + failed, failed });
      }

      await fetch('/api/ablation/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_batch: batch.trim() }),
      });

      const completedBatch = batch.trim();
      setDoneBatch(completedBatch);
      setRunStatus('done');
      // Actualizar lista de batches anteriores
      fetch('/api/ablation/batches')
        .then((r) => r.json())
        .then((d) => setPrevBatches(Array.isArray(d) ? d : []))
        .catch(() => { });

    } catch (err) {
      setErrorMsg((err as Error).message);
      setRunStatus('error');
    }
  }, [batch, selConfigs, selCategories]);

  return (
    <div className="space-y-6">

      {/* Batch name */}
      <div>
        <FieldLabel>Nombre del batch</FieldLabel>
        <Input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="pilot_2025_04_09"
          disabled={runStatus === 'running' || runStatus === 'creating'}
          className="max-w-sm font-mono"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Configuraciones ({selConfigs.size}/{configs.length})</FieldLabel>
            <button className="text-[11px] text-blue-600 font-bold hover:underline"
              onClick={() => setSelConfigs(selConfigs.size === configs.length ? new Set() : new Set(configs.map(c => c.id)))}>
              {selConfigs.size === configs.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          {configs.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Crea configuraciones primero en la pestaña Configuraciones.</p>
          ) : (
            <div className="space-y-2">
              {configs.map((c) => (
                <button key={c.id} onClick={() => toggleConfig(c.id)} disabled={runStatus === 'running'}
                  className={cn('w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-bold text-left transition-all disabled:opacity-40',
                    selConfigs.has(c.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {selConfigs.has(c.id) ? <CheckSquare className="w-4 h-4 text-blue-500 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <span className="font-mono mr-1">{c.id}</span>
                  <span className="truncate">{c.name}</span>
                  {c.is_baseline === 1 && <span className="ml-auto text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black">BASE</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categorías */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <FieldLabel>Categorías ({selCategories.size}/{ALL_CATEGORIES.length})</FieldLabel>
            <button className="text-[11px] text-blue-600 font-bold hover:underline"
              onClick={() => setSelCategories(selCategories.size === ALL_CATEGORIES.length ? new Set() : new Set(ALL_CATEGORIES))}>
              {selCategories.size === ALL_CATEGORIES.length ? 'Ninguna' : 'Todas'}
            </button>
          </div>
          <div className="space-y-2">
            {ALL_CATEGORIES.map((cat) => {
              const s = CAT_STYLE[cat];
              const n = questions.filter((q) => q.category === cat).length;
              return (
                <button key={cat} onClick={() => toggleCategory(cat)} disabled={runStatus === 'running'}
                  className={cn('w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-bold text-left transition-all disabled:opacity-40',
                    selCategories.has(cat) ? `${s.bg} border-current ${s.text}` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300')}>
                  {selCategories.has(cat) ? <CheckSquare className="w-4 h-4 flex-shrink-0" /> : <Square className="w-4 h-4 text-slate-300 flex-shrink-0" />}
                  <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', s.dot)} />
                  <span className="truncate">{s.label}</span>
                  <span className="ml-auto text-[11px] font-mono opacity-60">{n}p</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Batches anteriores */}
      {prevBatches.length > 0 && runStatus === 'idle' && (
        <div className="space-y-2">
          <FieldLabel>Batches anteriores</FieldLabel>
          <div className="space-y-1.5">
            {prevBatches.map((b) => (
              <a
                key={b.run_batch}
                href={`/dashboard/ablation/individual/results?batch=${encodeURIComponent(b.run_batch)}`}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-600">{b.run_batch}</span>
                  <span className="text-[11px] text-slate-400">
                    {b.done_runs}/{b.total_runs} runs completadas
                  </span>
                </div>
                <span className="text-[11px] font-bold text-violet-500 group-hover:text-violet-700 flex items-center gap-0.5">
                  Ver resultados <ChevronRight className="w-3 h-3" />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Estimación */}
      {estimatedRuns > 0 && runStatus === 'idle' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200 text-sm">
          <FlaskConical className="w-4 h-4 text-violet-500" />
          <span className="text-slate-600">
            <span className="font-bold text-slate-800">{estimatedRuns}</span> ejecuciones estimadas
            <span className="text-slate-400 ml-2">({filteredCount}p × {selConfigs.size} configs)</span>
          </span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-xl border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Progress */}
      {(runStatus === 'running' || runStatus === 'creating' || runStatus === 'done') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600">
            <span className="flex items-center gap-2">
              {runStatus === 'done'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                : <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
              {runStatus === 'creating' && 'Creando ejecuciones…'}
              {runStatus === 'running' && `${progress.completed} / ${progress.total} completadas`}
              {runStatus === 'done' && `Completado — ${progress.completed} runs`}
            </span>
            <span className="text-slate-400">{progressPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', runStatus === 'done' ? 'bg-emerald-500' : 'bg-blue-500')}
              style={{ width: `${progressPct}%` }} />
          </div>
          {progress.failed > 0 && <p className="text-[11px] text-red-500 font-bold">{progress.failed} fallidas (continuando…)</p>}
          {runStatus === 'done' && doneBatch && (
            <a
              href={`/dashboard/ablation/individual/results?batch=${encodeURIComponent(doneBatch)}`}
              className="inline-flex items-center gap-2 text-[12px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4 py-2 rounded-xl transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Experimento completado — Ver resultados de &quot;{doneBatch}&quot;
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {(runStatus === 'idle' || runStatus === 'error') && (
        <button
          onClick={handleStart}
          disabled={!batch.trim() || !selConfigs.size || !selCategories.size || configs.length === 0 || questions.length === 0}
          className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Iniciar experimento
        </button>
      )}

      <CleanupZone />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ZONA DE LIMPIEZA
══════════════════════════════════════════════════════════════════════════ */
type BatchRow = { run_batch: string; total_runs: number; done_runs: number; started_at?: string };
type CleanScope = 'batch' | 'all';

function CleanupZone({ type = 'individual' }: { type?: 'individual' | 'scenario' }) {
  const [open, setOpen] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [scope, setScope] = useState<CleanScope>('batch');
  const [selBatch, setSelBatch] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ deleted: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadBatches = useCallback(async () => {
    try {
      const endpoint = type === 'individual' ? '/api/ablation/batches' : '/api/ablation/scenarios/batches';
      const res = await fetch(endpoint);
      const data = await res.json();
      setBatches(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) setSelBatch(data[0].run_batch);
    } catch { /* silencio */ }
  }, [type]);

  useEffect(() => { loadBatches(); }, [type, loadBatches]);

  const expectedConfirm = scope === 'all' ? 'ELIMINAR TODO' : selBatch;
  const canDelete = confirm === expectedConfirm && (scope === 'all' || !!selBatch);

  const handleDelete = async (targetBatch?: string) => {
    const finalBatch = targetBatch || selBatch;
    if (!targetBatch && !canDelete) return;

    setStatus('running');
    setError(null);
    setResult(null);

    try {
      const endpoint = type === 'individual' ? '/api/ablation/reset' : '/api/ablation/scenarios/delete';
      const body = type === 'individual'
        ? (scope === 'all' && !targetBatch ? { scope: 'all' } : { scope: 'batch', run_batch: finalBatch })
        : { run_batch: finalBatch };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al eliminar');
      setResult(data);
      setStatus('done');
      setConfirm('');
      loadBatches();
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Lista de Batches con Detalle y Borrado */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Batches Registrados ({type === 'individual' ? 'Individual' : 'Escenarios'})
            </span>
          </div>
          <button onClick={loadBatches} className="p-2 hover:bg-slate-200 rounded-xl transition-all">
            <Search className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {batches.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-sm">No se encontraron batches para esta categoría.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {batches.map((b) => (
              <div key={b.run_batch} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                    <FlaskConical className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 font-mono">{b.run_batch}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                        {b.done_runs} / {b.total_runs} COMPLETADOS
                      </span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(b.started_at || '').toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={`/dashboard/ablation/${type === 'scenario' ? 'scenarios' : 'individual'}/results?batch=${encodeURIComponent(b.run_batch)}`}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                  >
                    ANALIZAR <ChevronRight className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Estás seguro de eliminar el batch "${b.run_batch}"? Esta acción borrará todos los resultados permanentemente.`)) {
                        handleDelete(b.run_batch);
                      }
                    }}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Eliminar Batch"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zona de Reseteo Masivo (Anterior CleanupZone simplificada) */}
      <div className="border border-red-200 rounded-3xl overflow-hidden opacity-80 hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 bg-red-50/40 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center gap-2.5 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Zona de Peligro / Reseteo de Base de Datos</span>
          </div>
          <ChevronDown className={cn('w-4 h-4 text-red-400 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="p-6 bg-white space-y-5">
            <p className="text-xs text-slate-500 leading-relaxed italic">
              Usa esta herramienta para limpiar masivamente resultados huérfanos o pruebas fallidas de la base de datos distribuida.
            </p>
            <div className="flex flex-col gap-4 max-w-sm">
              <div>
                <FieldLabel>Confirmación de Seguridad</FieldLabel>
                <p className="text-[10px] text-slate-400 mb-2 italic">Escribe el nombre del batch a eliminar masivamente:</p>
                <Input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Nombre del batch..."
                  className="font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => handleDelete()}
                disabled={!confirm || status === 'running'}
                className="w-full py-3 bg-red-600 text-white rounded-2xl text-xs font-black shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
              >
                {status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                ELIMINAR RESULTADOS PERMANENTEMENTE
              </button>
            </div>
            {status === 'done' && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-2xl text-[10px] font-bold border border-emerald-100 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" /> PROCESO COMPLETADO EXITOSAMENTE
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   SECCIÓN D — Escenarios Multi-turno
══════════════════════════════════════════════════════════════════════════ */
interface ScenarioRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  equipment_model: string | null;
  difficulty: string;
  max_turns: number;
  resolution_criteria: string;
  turns: Array<{
    id: string;
    turn_number: number;
    technician_message: string;
    turn_intent: string | null;
    expected_behavior: string | null;
  }>;
}

type ScenRunStatus = 'idle' | 'running' | 'done' | 'error';

function SectionScenarios({ configs, mode = 'bank' }: { configs: AblationConfig[], mode?: 'bank' | 'runner' }) {
  const [scenarios, setScenarios] = useState<ScenarioRow[]>([]);
  const [loadingScen, setLoadingScen] = useState(true);
  const [batch, setBatch] = useState('');
  const [selScenarios, setSelScenarios] = useState<Set<string>>(new Set());
  const [selConfigs, setSelConfigs] = useState<Set<string>>(new Set(configs.map((c) => c.id)));
  const [runStatus, setRunStatus] = useState<ScenRunStatus>('idle');
  const [progress, setProgress] = useState({ total: 0, completed: 0, failed: 0, currentLabel: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneBatch, setDoneBatch] = useState<string | null>(null);
  const [expandedTurns, setExpandedTurns] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ablation/scenarios')
      .then((r) => r.json())
      .then((d: ScenarioRow[]) => {
        const arr = Array.isArray(d) ? d : [];
        setScenarios(arr);
        // Seleccionar todos por defecto
        setSelScenarios(new Set(arr.map((s) => s.id)));
      })
      .catch(() => { })
      .finally(() => setLoadingScen(false));
  }, []);

  // Keepalive
  useEffect(() => {
    if (runStatus !== 'running') return;
    const id = setInterval(() => { fetch('/api/session/refresh').catch(() => { }); }, 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [runStatus]);

  const toggleScenario = (id: string) => setSelScenarios(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleConfig = (id: string) => setSelConfigs(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const estimatedRuns = selScenarios.size * selConfigs.size;
  const progressPct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const categoryStats = useMemo(() => {
    const counts = scenarios.reduce((acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const stats = ALL_CATEGORIES.map(cat => ({
      cat,
      count: counts[cat] || 0,
    })).filter(s => s.count > 0);

    const visibleTotal = stats.reduce((sum, s) => sum + s.count, 0);

    return stats.map(s => ({
      ...s,
      percentage: visibleTotal > 0 ? Math.round((s.count / visibleTotal) * 100) : 0
    }));
  }, [scenarios]);

  const handleStart = useCallback(async () => {
    if (!batch.trim()) { setErrorMsg('Escribe un nombre para el batch'); return; }
    if (!selScenarios.size) { setErrorMsg('Selecciona al menos un escenario'); return; }
    if (!selConfigs.size) { setErrorMsg('Selecciona al menos una configuración'); return; }
    setErrorMsg(null);
    setRunStatus('running');

    const scenarioArr = [...selScenarios];
    const configArr = [...selConfigs];
    const total = scenarioArr.length * configArr.length;
    setProgress({ total, completed: 0, failed: 0, currentLabel: '' });

    let completed = 0;
    let failed = 0;

    try {
      for (const scenarioId of scenarioArr) {
        for (const configId of configArr) {
          const scen = scenarios.find((s) => s.id === scenarioId);
          const cfg = configs.find((c) => c.id === configId);
          const label = `${scenarioId} × ${cfg?.id ?? configId}`;
          setProgress((p) => ({ ...p, currentLabel: label }));

          try {
            const runRes = await fetch('/api/ablation/scenarios/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenarioId, configId, runBatch: batch.trim() }),
            });
            const runData = await runRes.json() as Record<string, unknown>;
            if (!runRes.ok) throw new Error((runData.error as string) ?? `HTTP ${runRes.status}`);

            await fetch('/api/ablation/scenarios/judge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scenarioRunId: runData.runId }),
            });

            completed++;
          } catch (err) {
            console.error(`${scenarioId} × ${configId}:`, err);
            failed++;
          }
          setProgress({ total, completed: completed + failed, failed, currentLabel: label });
        }
      }

      setDoneBatch(batch.trim());
      setRunStatus('done');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setRunStatus('error');
    }
  }, [batch, selScenarios, selConfigs, scenarios, configs]);

  return (
    <div className="space-y-6">
      {mode === 'bank' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-slate-500">
                <span className="font-bold text-slate-800">{scenarios.length}</span> escenarios disponibles
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-lg">Solo Lectura</span>
            </div>
          </div>

          {/* Resumen de Porcentajes por Categoría */}
          {!loadingScen && scenarios.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                {categoryStats.map(({ cat, count, percentage }) => {
                  const s = CAT_STYLE[cat] || { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: cat };
                  return (
                    <div key={cat} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', s.dot)} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-slate-800">{percentage}%</span>
                        <span className="text-[11px] font-bold text-slate-400 font-mono">({count} scen)</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Barra de distribución visual */}
              <div className="mt-6 h-3 flex rounded-full overflow-hidden bg-slate-100">
                {categoryStats.map(({ cat, percentage }) => {
                  const s = CAT_STYLE[cat] || { dot: 'bg-slate-400' };
                  return (
                    <div
                      key={cat}
                      className={cn('h-full transition-all duration-500', s.dot)}
                      style={{ width: `${percentage}%` }}
                      title={`${cat}: ${percentage}%`}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {loadingScen ? (
            <div className="flex items-center justify-center p-20 text-slate-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Cargando catálogo…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {scenarios.map((s) => {
                const catStyle = CAT_STYLE[s.category] ?? { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400', label: s.category };
                return (
                  <div key={s.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-lg">{s.id}</span>
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', DIFF_STYLE[s.difficulty] ?? 'bg-slate-100 text-slate-500')}>{s.difficulty}</span>
                      </div>
                      <Layers className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="min-h-[3rem]">
                      <h3 className="text-sm font-black text-slate-800 leading-tight">{s.title}</h3>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 italic">{s.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 border-t border-slate-50 pt-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold', catStyle.bg, catStyle.text)}>
                        {catStyle.label}
                      </span>
                      <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold">{s.turns.length} Turnos</span>
                      {s.equipment_model && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-black">{s.equipment_model}</span>}
                    </div>
                    <button
                      onClick={() => setExpandedTurns(expandedTurns === s.id ? null : s.id)}
                      className="mt-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 py-1.5 rounded-xl transition-all"
                    >
                      {expandedTurns === s.id ? 'Ocultar Guión' : 'Ver Guión Técnico'}
                    </button>
                    {expandedTurns === s.id && (
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                        {s.turns.map(t => (
                          <div key={t.id} className="bg-slate-50 rounded-xl p-2.5 text-[10px] border border-slate-100">
                            <span className="font-bold text-blue-500 mr-1.5">Turno {t.turn_number}:</span>
                            <span className="text-slate-600">{t.technician_message}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === 'runner' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Catálogo simplificado para selección */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <FieldLabel>Seleccionar Escenarios ({selScenarios.size})</FieldLabel>
              {scenarios.length > 0 && (
                <button className="text-[11px] text-blue-600 font-black hover:underline uppercase tracking-widest"
                  onClick={() => setSelScenarios(selScenarios.size === scenarios.length ? new Set() : new Set(scenarios.map(s => s.id)))}>
                  {selScenarios.size === scenarios.length ? 'Desmarcar Todos' : 'Seleccionar Todos'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
              {scenarios.map((s) => {
                const isSelected = selScenarios.has(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggleScenario(s.id)}
                    disabled={runStatus === 'running'}
                    className={cn(
                      'text-left rounded-xl border p-3 transition-all flex items-center gap-3 disabled:opacity-40',
                      isSelected
                        ? 'bg-violet-50 border-violet-200 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300',
                    )}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-violet-500" /> : <Square className="w-4 h-4 text-slate-300" />}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{s.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.id} · {s.turns.length}t</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración del Run */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <FieldLabel>Batch & Configuración</FieldLabel>
                <div>
                  <label className="text-[10px] text-slate-400 font-black uppercase mb-1.5 block">Nombre del Batch</label>
                  <Input
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="scen_pilot_2025"
                    disabled={runStatus === 'running'}
                  />
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{estimatedRuns} Ejecuciones Estimadas</p>
                    <p className="text-[10px] text-slate-400">Total acumulado para este run de ablación técnico.</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <FieldLabel>Ablación: Configs ({selConfigs.size})</FieldLabel>
                  <button className="text-[10px] text-blue-600 font-black hover:underline uppercase"
                    onClick={() => setSelConfigs(selConfigs.size === configs.length ? new Set() : new Set(configs.map(c => c.id)))}>
                    {selConfigs.size === configs.length ? 'Ninguna' : 'Todas'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {configs.map((c) => (
                    <button key={c.id} onClick={() => toggleConfig(c.id)} disabled={runStatus === 'running'}
                      className={cn('flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold text-left transition-all',
                        selConfigs.has(c.id) ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500')}>
                      {selConfigs.has(c.id) ? <CheckSquare className="w-3.5 h-3.5 text-blue-500" /> : <Square className="w-3.5 h-3.5 text-slate-300" />}
                      <span className="font-mono text-[10px]">{c.id}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error / Done Messages */}
            {runStatus === 'done' && doneBatch && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <p className="text-sm font-bold text-emerald-800">
                  ¡Completado! Se procesaron {progress.completed} experimentos.{' '}
                  <a href={`/dashboard/ablation/scenarios/results?batch=${encodeURIComponent(doneBatch)}`} className="underline ml-1">Ver Dashboard de Resultados →</a>
                </p>
              </div>
            )}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm font-bold text-red-800">{errorMsg}</p>
              </div>
            )}

            {/* Progress Bar */}
            {runStatus === 'running' && (
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <div className="flex justify-between text-[11px] font-black text-slate-500">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                    PROCESANDO: {progress.currentLabel}
                  </span>
                  <span>{progress.completed}/{progress.total} ({progressPct}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="border-t border-slate-100 pt-5 flex justify-end">
              <button
                onClick={handleStart}
                disabled={runStatus === 'running' || !selScenarios.size || !batch.trim() || !selConfigs.size}
                className={cn(
                  'px-8 py-3 rounded-2xl flex items-center gap-2 text-sm font-black shadow-xl transition-all disabled:opacity-30 disabled:grayscale',
                  runStatus === 'running' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black active:scale-95'
                )}
              >
                {runStatus === 'running' ? <><Loader2 className="w-4 h-4 animate-spin" /> Ejecutando…</> : <><Play className="w-4 h-4 text-violet-400 fill-violet-400" /> Iniciar Batch de Escenarios</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   TABS + PAGE
══════════════════════════════════════════════════════════════════════════ */
const PARENT_TABS = [
  { id: 'individual', label: 'E. Individual', icon: BookOpen },
  { id: 'scenario', label: 'E. Escenario', icon: Layers },
  { id: 'batches', label: 'Historial de Batches', icon: Search },
] as const;

const INDIVIDUAL_TABS = [
  { id: 'questions', label: 'Banco de Preguntas', icon: BookOpen },
  { id: 'configs', label: 'Configuraciones', icon: Sliders },
  { id: 'runner', label: 'Runner de Pruebas', icon: FlaskConical },
] as const;

const SCENARIO_TABS = [
  { id: 'scen-bank', label: 'Banco de Escenarios', icon: Layers },
  { id: 'configs', label: 'Configuraciones', icon: Sliders },
  { id: 'scen-runner', label: 'Scenario Runner', icon: Play },
] as const;

const BATCH_TABS = [
  { id: 'batches-ind', label: 'Batches Individuales', icon: FlaskConical },
  { id: 'batches-scen', label: 'Batches Escenarios', icon: Layers },
] as const;

type ParentTabId = typeof PARENT_TABS[number]['id'];
type IndTabId = typeof INDIVIDUAL_TABS[number]['id'];
type ScenTabId = typeof SCENARIO_TABS[number]['id'];
type BatchTabId = typeof BATCH_TABS[number]['id'];

// IDs de configs por flujo
const INDIVIDUAL_CONFIG_IDS = ['B', 'D', 'config_bm25_bert', 'config_goms'];
const SCENARIO_CONFIG_IDS = ['A', 'B', 'C', 'D'];

export default function AblationPage() {
  const [parentTab, setParentTab] = useState<ParentTabId>('individual');
  const [indTab, setIndTab] = useState<IndTabId>('questions');
  const [scenTab, setScenTab] = useState<ScenTabId>('scen-bank');
  const [batchTab, setBatchTab] = useState<BatchTabId>('batches-ind');

  const [questions, setQuestions] = useState<AblationQuestion[]>([]);
  const [configs, setConfigs] = useState<AblationConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    Promise.all([
      fetch('/api/ablation/questions').then((r) => r.json()),
      fetch('/api/ablation/configurations').then((r) => r.json()),
    ]).then(([qs, cs]) => {
      setQuestions(Array.isArray(qs) ? qs : []);
      setConfigs(Array.isArray(cs) ? cs : []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Configs filtradas por flujo
  const indConfigs = configs.filter(c => INDIVIDUAL_CONFIG_IDS.includes(c.id));
  const scenConfigs = configs.filter(c => SCENARIO_CONFIG_IDS.includes(c.id));

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-7 shadow-sm border border-violet-100"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f3e8ff 50%, #ede9fe 100%)' }}>
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-[10px] font-black tracking-widest uppercase">
              <FlaskConical className="w-3.5 h-3.5" />
              ABLATION STUDY
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Entorno de Experimentos</h1>
            <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
              Define preguntas de evaluación, crea configuraciones deshabilitando agentes del pipeline, y lanza el runner para medir el impacto de cada uno.
            </p>
          </div>
          <div className="hidden md:flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-slate-800">{questions.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preguntas</p>
            </div>
            <div className="w-px bg-slate-200/60 self-stretch" />
            <div className="text-center">
              <p className="text-2xl font-black text-slate-800">{configs.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout Tabs */}
      <div className="flex flex-col gap-6">
        {/* Parent Tabs */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-3xl w-fit shadow-sm">
          {PARENT_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setParentTab(id)}
              className={cn(
                'flex items-center gap-2.5 px-6 py-2.5 text-sm font-black rounded-2xl transition-all',
                parentTab === id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              )}
            >
              <Icon className={cn('w-4 h-4', parentTab === id ? 'text-violet-400' : 'text-slate-300')} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white/40 rounded-3xl border border-slate-100 italic text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-3 text-violet-500" />
            Cargando entorno de experimentación…
          </div>
        ) : (
          <div className="space-y-6">
            {/* INDIVIDUAL TAB */}
            {parentTab === 'individual' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1 bg-violet-50/50 p-1 rounded-2xl border border-violet-100/50 w-fit">
                  {INDIVIDUAL_TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setIndTab(id)}
                      className={cn('flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-xl transition-all',
                        indTab === id ? 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/40')}>
                      <Icon className={cn('w-3.5 h-3.5', indTab === id ? 'text-violet-500' : 'text-slate-400')} />
                      {label}
                    </button>
                  ))}
                </div>
                {indTab === 'questions' && <SectionQuestions questions={questions} onRefresh={reload} />}
                {indTab === 'configs' && <SectionConfigs configs={indConfigs} onRefresh={reload} />}
                {indTab === 'runner' && <SectionRunner configs={indConfigs} questions={questions} />}
              </div>
            )}

            {/* SCENARIO TAB */}
            {parentTab === 'scenario' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1 bg-blue-50/50 p-1 rounded-2xl border border-blue-100/50 w-fit">
                  {SCENARIO_TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setScenTab(id)}
                      className={cn('flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-xl transition-all',
                        scenTab === id ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/40')}>
                      <Icon className={cn('w-3.5 h-3.5', scenTab === id ? 'text-blue-500' : 'text-slate-400')} />
                      {label}
                    </button>
                  ))}
                </div>
                {scenTab === 'scen-bank' && <SectionScenarios configs={scenConfigs} mode="bank" />}
                {scenTab === 'configs' && <SectionConfigs configs={scenConfigs} onRefresh={reload} />}
                {scenTab === 'scen-runner' && <SectionScenarios configs={scenConfigs} mode="runner" />}
              </div>
            )}

            {/* BATCHES TAB */}
            {parentTab === 'batches' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1 bg-amber-50/50 p-1 rounded-2xl border border-amber-100/50 w-fit">
                  {BATCH_TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} onClick={() => setBatchTab(id)}
                      className={cn('flex items-center gap-2 px-4 py-2 text-[12px] font-bold rounded-xl transition-all',
                        batchTab === id ? 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-200/50' : 'text-slate-500 hover:text-slate-900 hover:bg-white/40')}>
                      <Icon className={cn('w-3.5 h-3.5', batchTab === id ? 'text-amber-500' : 'text-slate-400')} />
                      {label}
                    </button>
                  ))}
                </div>
                {batchTab === 'batches-ind' && <CleanupZone type="individual" />}
                {batchTab === 'batches-scen' && <CleanupZone type="scenario" />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

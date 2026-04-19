'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3, ChevronDown, Loader2, ChevronRight,
  ExternalLink, X, TrendingUp, Clock, DollarSign,
  CheckCircle2, AlertCircle, Layers, Activity, Copy, CheckCheck,
  Cpu, FileText, Zap, Database, GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Bar, Line, Legend,
  BarChart, Cell, LineChart, Area, PieChart, Pie, ScatterChart, Scatter,
  ZAxis, ReferenceLine, AreaChart, LabelList,
} from 'recharts';

/* ── Tipos ────────────────────────────────────────────────────────────────── */
interface Batch {
  run_batch: string;
  total_runs: number;
  done_runs: number;
  error_runs: number;
  pending_runs: number;
  started_at: number;
}

interface SummaryRow {
  config_id: string;
  config_name: string;
  question_category: string;
  display_order: number;
  is_baseline: number;
  avg_score_total: number | null;
  avg_score_correctness: number | null;
  avg_score_completeness: number | null;
  avg_score_relevance: number | null;
  avg_score_clarity: number | null;
  avg_score_ablation_impact: number | null;
  avg_phase1_ms: number | null;
  avg_total_ms: number | null;
  avg_cost_usd: number | null;
  n_runs: number;
  clarifier_enabled: number;
  bibliotecario_enabled: number;
  analista_enabled: number;
  image_validator_enabled: number;
  rag_enabled: number;
}

interface LoopHealthRow {
  config_id: string;
  config_name: string;
  display_order: number;
  is_baseline: number;
  n_runs: number;
  // Loop metrics
  avg_loops: number | null;
  avg_confidence: number | null;
  avg_chunks_final: number | null;
  avg_redundancy: number | null;
  max_loop_count: number;
  min_confidence: number | null;
  // Gap Engine metrics
  pct_gap_resolved: number | null;
  loops_resolved: number;
  loops_stuck: number;
  loops_no_gain: number;
  loops_maxed: number;
  n_multi_loop: number;
  n_low_confidence: number;
  n_high_confidence: number;
}

interface RunRow {
  id: string;
  question_id: string;
  config_id: string;
  config_name: string;
  session_id: string | null;
  status: string;
  question_text: string;
  category: string;
  category_number: number;
  ground_truth: string;
  response_text: string | null;
  error_message: string | null;
  detected_urgency: string | null;
  response_mode: string | null;
  total_ms: number | null;
  cost_usd: number | null;
  chunks_retrieved: number | null;
  images_retrieved: number | null;
  enrichments_used: number | null;
  score_total: number | null;
  score_correctness: number | null;
  score_completeness: number | null;
  score_relevance: number | null;
  score_clarity: number | null;
  score_ablation_impact: number | null;
  // Rúbrica Dual
  score_factual: number | null;
  score_diagnostic: number | null;
  factual_errors: string | null; // JSON
  diagnostic_value: string | null;
  judge_reasoning: string | null;
}

interface ScenRunRow {
  id: string;
  scenario_id: string;
  config_id: string;
  session_id: string | null;
  run_batch: string;
  status: string;
  error_message: string | null;
  turns_completed: number;
  turns_planned: number;
  resolution_reached: number;
  turns_to_resolution: number | null;
  total_loops_fired: number;
  avg_confidence_session: number | null;
  total_latency_ms?: number;
  total_cost_usd?: number | null;
  scenario_title?: string;
  scenario_category?: string;
  difficulty?: string;
  equipment_model?: string | null;
  resolution_criteria?: string;
  config_name: string;
  is_baseline?: number;
  display_order: number;
  score_id?: string | null;
  score_diagnostic_progression: number | null;
  score_factual_consistency: number | null;
  score_hypothesis_refinement: number | null;
  score_technician_effort: number | null;
  score_total: number | null;
  judge_resolution_reached?: number | null;
  critical_error_made?: number | null;
  contradicted_itself?: number | null;
  repeated_question?: number | null;
  judge_narrative?: string | null;
}

interface IndexingDocRow {
  doc_id: string;
  title: string;
  page_count: number | null;
  equipment_model: string | null;
  doc_type: string | null;
  total_cost: number | null;
  cost_orchestrator: number | null;
  cost_ocr: number | null;
  cost_vision: number | null;
  cost_chunker: number | null;
  cost_embedder: number | null;
  total_chunks: number | null;
  hitl_images: number | null;
  agent_mismatch_count: number | null;
  detected_gaps: number | null;
  inherited_l1: number | null;
  inherited_l2: number | null;
  inherited_l3: number | null;
  total_input_tokens: number | null;
  total_output_tokens: number | null;
  processing_time_ms: number | null;
}

interface IndexingAgg {
  n_docs: number;
  avg_chunks: number | null;
  avg_hitl_images: number | null;
  avg_mismatch: number | null;
  avg_detected_gaps: number | null;
  avg_l1: number | null;
  avg_l2: number | null;
  avg_l3: number | null;
  avg_input_tokens: number | null;
  avg_output_tokens: number | null;
  avg_processing_ms: number | null;
  max_processing_ms: number | null;
  min_processing_ms: number | null;
  avg_pages: number | null;
  avg_total_cost: number | null;
  avg_cost_orchestrator: number | null;
  avg_cost_ocr: number | null;
  avg_cost_vision: number | null;
  avg_cost_chunker: number | null;
  avg_cost_embedder: number | null;
  total_cost_all: number | null;
  total_cost_ocr: number | null;
  total_cost_vision: number | null;
  total_cost_chunker: number | null;
  total_cost_orchestrator: number | null;
  total_cost_embedder: number | null;
}

interface AgentLogRow {
  agent_name: string;
  n_calls: number;
  avg_input: number | null;
  avg_output: number | null;
  avg_duration_ms: number | null;
  errors: number;
}

/* ── Gráficos Reusable ────────────────────────────────────────────────────── */

// Configuración de colores para Q1
const CONFIG_COLORS: Record<string, string> = {
  'A': '#2563eb', // Azul fuerte (MAS Completo)
  'B': '#3b82f6', // Azul (Sin Planificador)
  'C': '#6366f1', // Indigo2
  'D': '#94a3b8', // Gris (RAG Base)
  'E': '#cbd5e1',
  'F': '#e2e8f0',
};

function ChartCard({ title, description, children, height = 450, accent = 'blue' }: {
  title: string; description: string; children: React.ReactNode;
  height?: number; accent?: 'blue' | 'violet' | 'emerald' | 'amber' | 'teal';
}) {
  const accentMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col" style={{ height }}>
      <div className="mb-4 flex items-start gap-3">
        <div className={cn('w-1.5 rounded-full self-stretch', `bg-${accent}-500`)} style={{ minHeight: 32 }} />
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}

// 1. Radar Chart
function RadarChartAcademic({ scenarios }: { scenarios: ScenRunRow[] }) {
  const configs = ['A', 'B', 'C', 'D'];
  const dimensions = [
    { key: 'score_diagnostic_progression', label: 'Diag' },
    { key: 'score_factual_consistency', label: 'Factual' },
    { key: 'score_hypothesis_refinement', label: 'Hypo' },
    { key: 'score_technician_effort', label: 'Tech' },
  ];

  const data = dimensions.map(d => {
    const obj: any = { subject: d.label };
    configs.forEach(cid => {
      const cfgRuns = scenarios.filter(s => s.config_id === cid && s[d.key as keyof ScenRunRow] !== null);
      const avg = cfgRuns.length ? cfgRuns.reduce((sum, r) => sum + (r[d.key as keyof ScenRunRow] as number), 0) / cfgRuns.length : 0;
      obj[cid] = Number(avg.toFixed(2));
    });
    return obj;
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 900 }} />
        <PolarRadiusAxis angle={30} domain={[0, 2]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
        {configs.map(cid => (
          <Radar
            key={cid}
            name={`Config ${cid}`}
            dataKey={cid}
            stroke={CONFIG_COLORS[cid] || '#ccc'}
            fill={CONFIG_COLORS[cid] || '#ccc'}
            fillOpacity={cid === 'B' ? 0.35 : 0.1}
            strokeWidth={cid === 'B' ? 3 : 1.5}
          />
        ))}
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 20 }} />
        <Tooltip
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// 2. Composed Chart (Bar + Line)
function ComposedChartDual({ scenarios, summaryAll }: { scenarios: ScenRunRow[], summaryAll: SummaryRow[] }) {
  const data = ['A', 'B', 'C', 'D'].map(cid => {
    const scenRuns = scenarios.filter(s => s.config_id === cid);
    const resolvedPct = scenRuns.length ? (scenRuns.filter(r => (r.judge_resolution_reached ?? r.resolution_reached) === 1).length / scenRuns.length) * 100 : 0;
    const summary = summaryAll.find(s => s.config_id === cid);

    // Si hay datos de escenarios, calculamos el promedio directamente
    const avgScoreScen = scenRuns.length
      ? scenRuns.reduce((sum, r) => sum + (r.score_total ?? 0), 0) / scenRuns.length
      : 0;

    const scoreTotal = avgScoreScen > 0 ? avgScoreScen : (summary?.avg_score_total ?? 0);

    return { name: cid, resolved: Number(resolvedPct.toFixed(1)), score: Number(scoreTotal.toFixed(2)) };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="left"
          domain={[0, 100]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          label={{ value: '% Resuelto', angle: -90, position: 'insideLeft', style: { fontSize: 10, fontWeight: 700, fill: '#94a3b8' } }}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, 2]}
          tick={{ fontSize: 10, fill: '#3b82f6' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Score Total', angle: 90, position: 'insideRight', style: { fontSize: 10, fontWeight: 700, fill: '#3b82f6' } }}
        />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
        />
        <Bar yAxisId="left" dataKey="resolved" fill="#e2e8f0" radius={[6, 6, 0, 0]} barSize={40} />
        <Line yAxisId="right" type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={4} dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// 3. Simple Bar Chart (Loops)
function BarChartLoops({ scenarios }: { scenarios: ScenRunRow[] }) {
  const data = ['A', 'B', 'C', 'D'].map(cid => {
    const cfgRuns = scenarios.filter(s => s.config_id === cid);
    const avgLoops = cfgRuns.length ? cfgRuns.reduce((sum, r) => sum + (r.total_loops_fired ?? 0), 0) / cfgRuns.length : 0;
    return { name: cid, loops: Number(avgLoops.toFixed(3)) };
  }).sort((a, b) => b.loops - a.loops);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <XAxis type="number" domain={[4.8, 5.4]} hide />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 900 }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: 'transparent' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
        />
        <Bar dataKey="loops" radius={[0, 10, 10, 0]} barSize={30}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.loops >= 5.2 ? '#2563eb' : '#94a3b8'} fillOpacity={0.8} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// 4. Heatmap (CSS Grid)
function HeatmapAcademic({ data }: { data: any[] }) {
  const configs = ['A', 'B', 'C', 'D'];

  // Extraer categorías únicas presentes en la data
  const rawCats = [...new Set(data.map(d => d.question_category || d.category))];
  const cats = CAT_ORDER.filter(c => rawCats.includes(c));
  // Añadir cualquier categoría extra que no esté en CAT_ORDER
  rawCats.forEach(c => { if (!cats.includes(c)) cats.push(c); });

  const getScore = (cat: string, cid: string) => {
    const row = data.find(d => (d.question_category === cat || d.category === cat) && d.config_id === cid);
    return row?.avg_score_total ?? row?.avg_score ?? 0;
  };

  const getHeatColor = (score: number) => {
    if (score >= 1.7) return 'bg-emerald-600 text-white';
    if (score >= 1.4) return 'bg-emerald-400 text-white';
    if (score >= 1.1) return 'bg-amber-400 text-slate-800';
    if (score >= 0.8) return 'bg-orange-400 text-white';
    if (score === 0) return 'bg-slate-100 text-slate-300';
    return 'bg-red-500 text-white';
  };

  return (
    <div className="flex flex-col h-full border border-slate-100 rounded-xl overflow-hidden">
      <div className="grid grid-cols-[140px_repeat(4,1fr)] bg-slate-50 border-b border-slate-100">
        <div className="p-3"></div>
        {configs.map(cid => (
          <div key={cid} className="p-3 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">{cid}</div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {cats.map(cat => (
          <div key={cat} className="grid grid-cols-[140px_repeat(4,1fr)] border-b border-slate-50 last:border-0 h-16">
            <div className="p-3 flex items-center text-[10px] font-black text-slate-600 uppercase tracking-tight bg-slate-50/50">
              {CAT_LABELS[cat] || cat}
            </div>
            {configs.map(cid => {
              const score = getScore(cat, cid);
              return (
                <div key={cid} className="p-1">
                  <div className={cn('w-full h-full rounded-lg flex flex-col items-center justify-center transition-all hover:scale-[1.02] shadow-sm', getHeatColor(score))}>
                    <span className="text-sm font-black tracking-tighter">{score > 0 ? score.toFixed(2) : '—'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. Confidence Over Turns Chart
function ConfidenceTrendChart({ turnStats }: { turnStats: Record<string, any[]> }) {
  const configs = ['B', 'D']; // Comparativa clave
  const turns = [1, 2, 3, 4, 5];

  const data = turns.map(t => {
    const obj: any = { turn: `Turno ${t}` };
    configs.forEach(cid => {
      const stats = turnStats[cid] || [];
      const turnData = stats.find(s => s.turn === t);
      obj[cid] = turnData ? Number(turnData.avgConf.toFixed(3)) : null;
    });
    return obj;
  });

  const CustomLabel = (props: any) => {
    const { x, y, value, index, color } = props;
    if (index === data.length - 1) {
      return (
        <text x={x} y={y - 12} fill={color} fontSize={12} fontWeight={900} textAnchor="middle">
          {value}
        </text>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 30, right: 40, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="turn" tick={{ fontSize: 10, fontWeight: 800, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0.4, 1]}
          tickCount={7}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={40}
          iconType="circle"
          wrapperStyle={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        />
        <Line
          type="monotone"
          dataKey="B"
          name="Config B (MAS)"
          stroke="#2563eb"
          strokeWidth={5}
          dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 8, strokeWidth: 0 }}
          animationDuration={2000}
        >
          <LabelList dataKey="B" content={(props: any) => <CustomLabel {...props} color="#2563eb" />} />
        </Line>
        <Line
          type="monotone"
          dataKey="D"
          name="Config D (RAG Base)"
          stroke="#64748b"
          strokeWidth={3}
          strokeDasharray="8 4"
          dot={{ r: 5, fill: '#f1f5f9', strokeWidth: 2, stroke: '#64748b' }}
          activeDot={{ r: 7 }}
        >
          <LabelList dataKey="D" content={(props: any) => <CustomLabel {...props} color="#64748b" />} />
        </Line>
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── B6. Score Breakdown por Dimensión (Stacked Bar) ─────────────────────────
function ScoreBreakdownChart({ scenarios, summaryAll }: { scenarios: ScenRunRow[], summaryAll: SummaryRow[] }) {
  const cfgIds = [...new Set([...scenarios.map(r => r.config_id), ...summaryAll.map(r => r.config_id)])].sort();
  const data = cfgIds.map(cid => {
    const sRows = scenarios.filter(r => r.config_id === cid && r.score_total !== null);
    const avg = (f: keyof ScenRunRow) => sRows.length
      ? sRows.reduce((s, r) => s + ((r[f] as number) ?? 0), 0) / sRows.length : 0;
    return {
      name: `Config ${cid}`,
      cid,
      diag: Number(avg('score_diagnostic_progression').toFixed(2)),
      factual: Number(avg('score_factual_consistency').toFixed(2)),
      hypo: Number(avg('score_hypothesis_refinement').toFixed(2)),
      tech: Number(avg('score_technician_effort').toFixed(2)),
    };
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 2]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', padding: '12px' }}
        />
        <Legend
          iconType="circle"
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 10, fontWeight: 800, paddingBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}
        />
        <Bar dataKey="diag" name="Diagnóstico" stackId="a" fill="#4f46e5" stroke="#fff" strokeWidth={2} radius={[0, 0, 0, 0]} />
        <Bar dataKey="factual" name="Factual" stackId="a" fill="#f59e0b" stroke="#fff" strokeWidth={2} />
        <Bar dataKey="hypo" name="Hipótesis" stackId="a" fill="#ec4899" stroke="#fff" strokeWidth={2} />
        <Bar dataKey="tech" name="Técnico" stackId="a" fill="#10b981" stroke="#fff" strokeWidth={2} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── B7. Latencia por Fase del Pipeline ───────────────────────────────────────
function LatencyEfficiencyChart({ data }: { data: any[] }) {
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-300 text-sm italic">Sin datos de eficiencia temporal</div>;

  const chartData = data.map(d => ({
    name: `Config ${d.config_id}`,
    latency: d.avg_latency,
    loops: Number(d.avg_loops.toFixed(2))
  }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />

        <YAxis
          yAxisId="left"
          tickFormatter={v => `${(v / 1000).toFixed(0)}s`}
          tick={{ fontSize: 10, fill: '#6366f1' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Latencia (s)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fontWeight: 700, fill: '#6366f1' } }}
        />

        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10, fill: '#ec4899' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Loops avg', angle: 90, position: 'insideRight', style: { fontSize: 9, fontWeight: 700, fill: '#ec4899' } }}
        />

        <Tooltip
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
          formatter={(value: any, name: any) => {
            if (name === 'Latencia') return [`${(value / 1000).toFixed(2)}s`, 'Tiempo Total'];
            return [value, 'Ciclos de Razonamiento'];
          }}
        />

        <Legend
          iconType="circle"
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 10, fontWeight: 800, paddingBottom: 20 }}
        />

        <Bar yAxisId="left" dataKey="latency" name="Latencia" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
        <Line yAxisId="right" type="monotone" dataKey="loops" name="Loops (avg)" stroke="#ec4899" strokeWidth={3} dot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── B8. Costo por Configuración (estimado) ───────────────────────────────────
function CostEffectivenessChart({ scenarios }: { scenarios: ScenRunRow[] }) {
  const cfgIds = ['A', 'B', 'C', 'D'];
  const data = cfgIds.map(cid => {
    const sRuns = scenarios.filter(r => r.config_id === cid && r.status === 'done');
    const withCost = sRuns.filter(r => (r.total_cost_usd ?? 0) > 0);
    const avgCostMilliUsd = withCost.length
      ? withCost.reduce((s, r) => s + (r.total_cost_usd ?? 0), 0) / withCost.length * 1000
      : 0;
    const avgTurns = sRuns.length
      ? sRuns.reduce((s, r) => s + (r.turns_to_resolution ?? r.turns_completed ?? 0), 0) / sRuns.length
      : 0;
    return {
      name: `Cfg ${cid}`,
      cid,
      'Costo (¢ USD)': Number(avgCostMilliUsd.toFixed(2)),
      'Turnos avg': Number(avgTurns.toFixed(2)),
    };
  });

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 40, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 900, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="cost" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: '¢ USD (×10⁻³)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis yAxisId="turns" orientation="right" domain={[0, 6]} tick={{ fontSize: 10, fill: '#ec4899' }} axisLine={false} tickLine={false}
          label={{ value: 'turnos', angle: 90, position: 'insideRight', style: { fontSize: 9, fill: '#ec4899' } }} />
        <Tooltip
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
          formatter={((v: number, name: string) => name === 'Costo (¢ USD)' ? [`$${(v / 1000).toFixed(4)}`, 'Costo estimado'] : [v.toFixed(2), name]) as any}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        <Bar yAxisId="cost" dataKey="Costo (¢ USD)" fill="#7c3aed" radius={[8, 8, 0, 0]} barSize={40} fillOpacity={0.85} />
        <Line yAxisId="turns" type="monotone" dataKey="Turnos avg" stroke="#ec4899" strokeWidth={3} dot={{ r: 6, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── B9. Turnos para Resolución ───────────────────────────────────────────────
function TurnsToResolutionChart({ scenarios }: { scenarios: ScenRunRow[] }) {
  const cfgIds = [...new Set(scenarios.map(r => r.config_id))].sort();
  const data = [1, 2, 3, 4, 5].map(t => {
    const obj: any = { turn: `Turno ${t}` };
    cfgIds.forEach(cid => {
      const resolved = scenarios.filter(r => r.config_id === cid && r.turns_to_resolution === t).length;
      obj[cid] = resolved;
    });
    return obj;
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="turn" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        {cfgIds.map(cid => (
          <Bar key={cid} dataKey={cid} name={`Config ${cid}`} fill={CONFIG_COLORS[cid] ?? '#94a3b8'} radius={[4, 4, 0, 0]} barSize={22} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── B10. Gap Engine Stop Reasons (Stacked) ────────────────────────────────────
function ConsistencyChart({ scenarios }: { scenarios: ScenRunRow[] }) {
  const configs = ['A', 'B', 'C', 'D'];
  const data = scenarios
    .filter(r => r.score_total !== null)
    .map(r => ({
      config: r.config_id,
      score: r.score_total,
      // Añadimos un pequeño jitter horizontal para mejorar la visualización de la densidad
      jitter: (Math.random() - 0.5) * 0.15
    }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis
          dataKey="config"
          type="category"
          allowDuplicatedCategory={false}
          tick={{ fontSize: 11, fontWeight: 900, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="score"
          domain={[0, 2]}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          label={{ value: 'Score Total', angle: -90, position: 'insideLeft', style: { fontSize: 9, fontWeight: 700, fill: '#94a3b8' } }}
        />
        <ZAxis type="number" range={[100, 100]} />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
        />
        {configs.map(cid => (
          <Scatter
            key={cid}
            name={`Config ${cid}`}
            data={data.filter(d => d.config === cid)}
            fill={CONFIG_COLORS[cid]}
            fillOpacity={0.6}
            shape="circle"
          />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── B11. Context Reuse Rate por Config ────────────────────────────────────────
function ContextReuseChart({ scenarios }: { scenarios: ScenRunRow[] }) {
  const cfgIds = [...new Set(scenarios.map(r => r.config_id))].sort();
  const data = cfgIds.map(cid => {
    const cfgRuns = scenarios.filter(r => r.config_id === cid);
    const avgReuse = cfgRuns.length ? cfgRuns.reduce((s, r) => s + ((r as any).context_reuse_rate ?? 0), 0) / cfgRuns.length : 0;
    const avgUnnec = cfgRuns.length ? cfgRuns.reduce((s, r) => s + ((r as any).unnecessary_clarifications ?? 0), 0) / cfgRuns.length : 0;
    return { name: `Cfg ${cid}`, 'Reuso de Contexto %': Number((avgReuse * 100).toFixed(1)), 'Clarif. Innecesarias avg': Number(avgUnnec.toFixed(2)) };
  });
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="left" domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: '% Reuso', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fontSize: 10, fill: '#f59e0b' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        <Bar yAxisId="left" dataKey="Reuso de Contexto %" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={40} />
        <Line yAxisId="right" type="monotone" dataKey="Clarif. Innecesarias avg" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── A1. Costo por Agente del Pipeline ─────────────────────────────────────────
function IndexingCostBreakdown({ agg }: { agg: IndexingAgg | null }) {
  if (!agg) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos</div>;
  const data = [
    { name: 'OCR\n(Mistral)', cost: Number(((agg.avg_cost_ocr ?? 0) * 1000).toFixed(3)), color: '#9d174d' },
    { name: 'Vision\n(Pixtral+GPT4o)', cost: Number(((agg.avg_cost_vision ?? 0) * 1000).toFixed(3)), color: '#6d28d9' },
    { name: 'Orchestrator\n(gpt-4o-mini)', cost: Number(((agg.avg_cost_orchestrator ?? 0) * 1000).toFixed(3)), color: '#1d4ed8' },
    { name: 'Chunker\n(gpt-4o-mini)', cost: Number(((agg.avg_cost_chunker ?? 0) * 1000).toFixed(3)), color: '#0369a1' },
    { name: 'Embedder\n(emb-3-small)', cost: Number(((agg.avg_cost_embedder ?? 0) * 1000).toFixed(3)), color: '#0f766e' },
  ].sort((a, b) => b.cost - a.cost);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 60, left: 20, bottom: 5 }}>
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: '¢ USD (avg × 10⁻³)', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 10, fontWeight: 700, fill: '#374151' }} axisLine={false} tickLine={false} />
        <Tooltip formatter={((v: number) => [`$${(v / 1000).toFixed(5)}`, 'Costo avg']) as any} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        <Bar dataKey="cost" radius={[0, 8, 8, 0]} barSize={28} label={{ position: 'right', style: { fontSize: 10, fontWeight: 700, fill: '#475569' }, formatter: ((v: number) => `${v}¢`) as any }}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── A2. Desglose de Costo Total (Pie) ─────────────────────────────────────────
function IndexingCostPie({ agg }: { agg: IndexingAgg | null }) {
  if (!agg) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos</div>;
  const total = (agg.total_cost_ocr ?? 0) + (agg.total_cost_vision ?? 0) + (agg.total_cost_orchestrator ?? 0) + (agg.total_cost_chunker ?? 0) + (agg.total_cost_embedder ?? 0);
  if (total === 0) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin costos registrados</div>;
  const data = [
    { name: 'OCR', value: agg.total_cost_ocr ?? 0, color: '#9d174d' },
    { name: 'Vision', value: agg.total_cost_vision ?? 0, color: '#7c3aed' },
    { name: 'Orchestrator', value: agg.total_cost_orchestrator ?? 0, color: '#1d4ed8' },
    { name: 'Chunker', value: agg.total_cost_chunker ?? 0, color: '#0369a1' },
    { name: 'Embedder', value: agg.total_cost_embedder ?? 0, color: '#0f766e' },
  ].filter(d => d.value > 0);
  const RADIAN = Math.PI / 180;
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null;
    const r = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={900}>{`${(percent * 100).toFixed(0)}%`}</text>;
  };
  return (
    <div className="flex flex-col items-center h-full">
      <ResponsiveContainer width="100%" height="80%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius="80%" dataKey="value" labelLine={false} label={renderLabel}>
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={((v: number) => [`$${v.toFixed(5)}`, 'Total']) as any} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center">
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
            {d.name}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── A3. Tokens por Agente (agent_logs) ────────────────────────────────────────
function AgentTokensChart({ agentLogs }: { agentLogs: AgentLogRow[] }) {
  const INDEXING_AGENTS = ['orchestrator', 'ocr', 'vision', 'diagram-reasoner', 'chunker', 'embedder', 'vector-scanner', 'curious'];
  const data = agentLogs
    .filter(a => INDEXING_AGENTS.includes(a.agent_name))
    .map(a => ({
      name: a.agent_name.replace('diagram-reasoner', 'diag-reason').replace('vector-scanner', 'vec-scanner'),
      input: a.avg_input ?? 0,
      output: a.avg_output ?? 0,
      duration: Math.round((a.avg_duration_ms ?? 0) / 1000 * 10) / 10,
    }))
    .sort((a, b) => (b.input + b.output) - (a.input + a.output));
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos de logs</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: 'Tokens avg', position: 'insideBottomRight', offset: -5, style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10, fontWeight: 700, fill: '#374151' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        <Bar dataKey="input" name="Input tokens" stackId="a" fill="#bfdbfe" barSize={20} />
        <Bar dataKey="output" name="Output tokens" stackId="a" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20}
          label={{ position: 'right', style: { fontSize: 9, fontWeight: 700, fill: '#475569' }, formatter: ((v: number, entry: any) => `${(entry?.input ?? 0) + v}tk`) as any }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── A4. Gap Detection + Herencia ─────────────────────────────────────────────
function GapInheritanceChart({ agg }: { agg: IndexingAgg | null }) {
  if (!agg) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos</div>;
  const data = [
    { name: 'Gaps detectados', value: agg.avg_detected_gaps ?? 0, fill: '#ef4444' },
    { name: 'Herencia L1\n(Exacto)', value: agg.avg_l1 ?? 0, fill: '#10b981' },
    { name: 'Herencia L2\n(Modelo)', value: agg.avg_l2 ?? 0, fill: '#3b82f6' },
    { name: 'Herencia L3\n(Semántico)', value: agg.avg_l3 ?? 0, fill: '#8b5cf6' },
  ];
  const inheritedTotal = (agg.avg_l1 ?? 0) + (agg.avg_l2 ?? 0) + (agg.avg_l3 ?? 0);
  const gapPct = agg.avg_detected_gaps ? Math.round((inheritedTotal / agg.avg_detected_gaps) * 100) : 0;
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#374151', textAnchor: 'middle' }} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
            <Bar dataKey="value" name="Avg por documento" radius={[8, 8, 0, 0]} barSize={50}
              label={{ position: 'top', style: { fontSize: 11, fontWeight: 900, fill: '#374151' } }}>
              {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="px-2 py-2 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
        <span className="text-[11px] font-black text-emerald-700">
          {gapPct}% de gaps resueltos por herencia · avg {inheritedTotal.toFixed(1)} / {(agg.avg_detected_gaps ?? 0).toFixed(1)} gaps
        </span>
      </div>
    </div>
  );
}

// ── A5. Chunks vs Páginas (Scatter) ─────────────────────────────────────────
function ChunksVsPagesScatter({ docs }: { docs: IndexingDocRow[] }) {
  const validDocs = docs.filter(d => d.page_count && d.total_chunks);
  if (!validDocs.length) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos</div>;
  const modelColors: Record<string, string> = { '3300': '#2563eb', '5500': '#7c3aed', 'general': '#059669' };
  const models = [...new Set(validDocs.map(d => d.equipment_model ?? 'general'))];
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="page_count" name="Páginas" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: 'Páginas del PDF', position: 'insideBottom', offset: -10, style: { fontSize: 10, fill: '#94a3b8' } }} />
        <YAxis dataKey="total_chunks" name="Chunks" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: 'Chunks generados', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} />
        <ZAxis range={[40, 120]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
          content={({ payload }: any) => {
            if (!payload?.length) return null;
            const d = payload[0]?.payload as IndexingDocRow;
            return (
              <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-xs max-w-[200px]">
                <p className="font-black text-slate-800 truncate">{d.title}</p>
                <p className="text-slate-500 mt-1">{d.page_count} págs → {d.total_chunks} chunks</p>
                <p className="text-slate-500">{d.equipment_model ?? 'general'}</p>
              </div>
            );
          }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        {models.map(model => (
          <Scatter key={model} name={`Modelo ${model}`}
            data={validDocs.filter(d => (d.equipment_model ?? 'general') === model)}
            fill={modelColors[model] ?? '#94a3b8'} fillOpacity={0.7} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ── A6. Duración del Pipeline (Distribución) ──────────────────────────────────
function ProcessingTimeChart({ docs }: { docs: IndexingDocRow[] }) {
  const validDocs = docs.filter(d => d.processing_time_ms && d.page_count).sort((a, b) => (a.page_count ?? 0) - (b.page_count ?? 0));
  if (!validDocs.length) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos</div>;
  const data = validDocs.slice(0, 20).map(d => ({
    name: d.title.slice(0, 18).replace(/\s+/g, ' '),
    pages: d.page_count ?? 0,
    ms: Math.round((d.processing_time_ms ?? 0) / 1000),
    cost: Number(((d.total_cost ?? 0) * 1000).toFixed(2)),
  }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 600, fill: '#64748b', textAnchor: 'end' }} angle={-35} interval={0} axisLine={false} tickLine={false} />
        <YAxis yAxisId="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
          label={{ value: 'segundos', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis yAxisId="pages" orientation="right" domain={[0, 'auto']} tick={{ fontSize: 10, fill: '#3b82f6' }} axisLine={false} tickLine={false}
          label={{ value: 'páginas', angle: 90, position: 'insideRight', style: { fontSize: 9, fill: '#3b82f6' } }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
          formatter={((v: number, name: string) => name === 'ms' ? [`${v}s`, 'Tiempo'] : [`${v} págs`, 'Páginas']) as any} />
        <Bar yAxisId="time" dataKey="ms" name="Tiempo (s)" fill="#dbeafe" radius={[4, 4, 0, 0]} />
        <Line yAxisId="pages" type="monotone" dataKey="pages" name="Páginas" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ── A7. KPIs de Indexing (tarjetas) ───────────────────────────────────────────
function IndexingKPIRow({ agg, agentLogs }: { agg: IndexingAgg | null; agentLogs: AgentLogRow[] }) {
  if (!agg) return null;
  const errorCount = agentLogs.reduce((s, a) => s + (a.errors ?? 0), 0);
  const totalCalls = agentLogs.reduce((s, a) => s + (a.n_calls ?? 0), 0);
  const kpis = [
    { label: 'Documentos indexados', value: agg.n_docs, unit: '', icon: <FileText className="w-4 h-4" />, color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { label: 'Avg chunks / doc', value: agg.avg_chunks?.toFixed(1) ?? '—', unit: '', icon: <Database className="w-4 h-4" />, color: 'bg-violet-50 text-violet-700 border-violet-100' },
    { label: 'Gaps detectados avg', value: agg.avg_detected_gaps?.toFixed(1) ?? '—', unit: '/doc', icon: <GitBranch className="w-4 h-4" />, color: 'bg-amber-50 text-amber-700 border-amber-100' },
    { label: 'Tiempo pipeline avg', value: agg.avg_processing_ms ? `${(agg.avg_processing_ms / 1000).toFixed(0)}s` : '—', unit: '', icon: <Clock className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Costo total avg / doc', value: agg.avg_total_cost ? `$${agg.avg_total_cost.toFixed(4)}` : '—', unit: '', icon: <DollarSign className="w-4 h-4" />, color: 'bg-rose-50 text-rose-700 border-rose-100' },
    { label: 'Llamadas API (logs)', value: totalCalls, unit: '', icon: <Zap className="w-4 h-4" />, color: 'bg-slate-50 text-slate-700 border-slate-100' },
    { label: 'Errores de agentes', value: errorCount, unit: '', icon: <AlertCircle className="w-4 h-4" />, color: errorCount > 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100' },
    { label: 'Chunks / Página avg', value: agg.avg_chunks && agg.avg_pages ? (agg.avg_chunks / agg.avg_pages).toFixed(1) : '—', unit: 'ck/pág', icon: <Cpu className="w-4 h-4" />, color: 'bg-teal-50 text-teal-700 border-teal-100' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.map(k => (
        <div key={k.label} className={cn('rounded-2xl border p-4 flex flex-col gap-2', k.color)}>
          <div className="flex items-center gap-2 opacity-70">{k.icon}<span className="text-[10px] font-black uppercase tracking-widest">{k.label}</span></div>
          <div className="text-2xl font-black tabular-nums leading-none">{k.value}<span className="text-sm font-bold ml-1 opacity-60">{k.unit}</span></div>
        </div>
      ))}
    </div>
  );
}

// ── A8. Tokens Conversacionales (Enjambre B) por Agente ─────────────────────
function ChatAgentTokensChart({ agentLogs }: { agentLogs: AgentLogRow[] }) {
  const CHAT_AGENTS = ['clarifier', 'planner', 'bibliotecario', 'selector', 'analista', 'verifier'];
  const data = agentLogs
    .filter(a => CHAT_AGENTS.includes(a.agent_name))
    .map(a => ({
      name: a.agent_name,
      input: a.avg_input ?? 0,
      output: a.avg_output ?? 0,
      latency: Math.round((a.avg_duration_ms ?? 0)),
      calls: a.n_calls,
    }))
    .sort((a, b) => (b.input + b.output) - (a.input + a.output));
  if (!data.length) return <div className="flex items-center justify-center h-full text-slate-300 text-sm">Sin datos de chat agents</div>;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 50, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#374151', textAnchor: 'middle' }} axisLine={false} tickLine={false} />
        <YAxis yAxisId="tok" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value: 'tokens avg', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
        <YAxis yAxisId="lat" orientation="right" tick={{ fontSize: 10, fill: '#f59e0b' }} axisLine={false} tickLine={false} label={{ value: 'ms', angle: 90, position: 'insideRight', style: { fontSize: 9, fill: '#f59e0b' } }} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
        <Bar yAxisId="tok" dataKey="input" name="Input tokens" stackId="t" fill="#bfdbfe" barSize={35} />
        <Bar yAxisId="tok" dataKey="output" name="Output tokens" stackId="t" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={35} />
        <Line yAxisId="lat" type="monotone" dataKey="latency" name="Latencia avg (ms)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/* ── Paleta ───────────────────────────────────────────────────────────────── */
const CAT_LABELS: Record<string, string> = {
  diagnostico_tecnico: 'Cat I — Diagnóstico',
  ambigua: 'Cat II — Ambigua',
  secuencial: 'Cat III — Secuencial',
  enriquecimiento: 'Cat IV — Enriquecimiento',
  visual: 'Cat V — Visual',
};

const CAT_ORDER = ['diagnostico_tecnico', 'ambigua', 'secuencial', 'enriquecimiento', 'visual'];

/* ── Helpers visuales ─────────────────────────────────────────────────────── */
function ScoreCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-300">—</span>;
  const pct = (value / 2) * 100;
  const color = pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-blue-700' : pct >= 30 ? 'text-amber-700' : 'text-red-700';
  return <span className={cn('font-bold tabular-nums', color)}>{value.toFixed(2)}</span>;
}

function ScoreBar({ value, max = 2 }: { value: number | null; max?: number }) {
  if (value === null) return <div className="h-2 bg-slate-100 rounded-full" />;
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-slate-500 w-8 text-right tabular-nums">
        {value.toFixed(2)}
      </span>
    </div>
  );
}

/* Colorea una celda del heatmap según el score (0–2) */
function heatmapBg(val: number | null): string {
  if (val === null) return 'bg-slate-50 text-slate-300';
  const pct = val / 2;
  if (pct >= 0.85) return 'bg-emerald-200 text-emerald-900';
  if (pct >= 0.70) return 'bg-emerald-100 text-emerald-800';
  if (pct >= 0.55) return 'bg-blue-100 text-blue-800';
  if (pct >= 0.40) return 'bg-amber-100 text-amber-800';
  if (pct >= 0.25) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

/* ── Panel 1 — Batch Selector ─────────────────────────────────────────────── */
function BatchSelector({
  batches,
  selected,
  onChange,
}: {
  batches: Batch[];
  selected: string;
  onChange: (b: string) => void;
}) {
  const current = batches.find((b) => b.run_batch === selected);
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[220px]">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
            Batch
          </label>
          <div className="relative flex-1">
            <select
              value={selected}
              onChange={(e) => onChange(e.target.value)}
              className="w-full appearance-none pl-4 pr-8 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            >
              <option value="">— Selecciona un batch —</option>
              {batches.map((b) => (
                <option key={b.run_batch} value={b.run_batch}>
                  {b.run_batch}
                </option>
              ))}
              {selected && !batches.find(b => b.run_batch === selected) && (
                <option value={selected}>{selected}</option>
              )}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {current && (
          <div className="flex items-center gap-5 flex-wrap">
            <Stat label="Total" value={current.total_runs} />
            <Stat label="Completadas" value={current.done_runs} color="text-emerald-600" />
            <Stat label="Errores" value={current.error_runs} color="text-red-500" />
            <Stat label="Pendientes" value={current.pending_runs} color="text-slate-400" />
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color = 'text-slate-800' }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center">
      <p className={cn('text-lg font-black tabular-nums', color)}>{value}</p>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
  );
}

/* ── Panel 2 — Tabla resumen ──────────────────────────────────────────────── */
function SummaryTable({
  summaryAll,
  onSelectRun,
}: {
  summaryAll: SummaryRow[];
  onSelectRun?: (configId: string) => void;
}) {
  if (!summaryAll.length) return null;

  const sorted = [...summaryAll].sort((a, b) => (b.avg_score_total ?? 0) - (a.avg_score_total ?? 0));
  const maxRow = sorted[0];
  const minRow = sorted[sorted.length - 1];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <BarChart3 className="w-4 h-4 text-blue-500" />
        <h2 className="text-sm font-black text-slate-800">Resumen por Configuración</h2>
        <span className="text-[11px] text-slate-400 ml-auto">Todas las categorías</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {['Config', 'Score total', 'Correctitud', 'Completitud', 'Relevancia', 'Claridad', 'Ablación', 'Latencia p50', 'Costo avg', 'N'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map((row) => {
              const isBest = row.config_id === maxRow.config_id;
              const isWorst = row.config_id === minRow.config_id && sorted.length > 1;
              return (
                <tr
                  key={row.config_id}
                  onClick={() => onSelectRun?.(row.config_id)}
                  className={cn(
                    'transition-colors cursor-pointer',
                    isBest ? 'bg-emerald-50/60 hover:bg-emerald-50' :
                      isWorst ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-slate-50/60',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-800">{row.config_id}</span>
                      <span className="text-[11px] text-slate-500 truncate max-w-[120px]">{row.config_name}</span>
                      {row.is_baseline === 1 && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black">BASE</span>
                      )}
                      {isBest && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_total} /></td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_correctness} /></td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_completeness} /></td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_relevance} /></td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_clarity} /></td>
                  <td className="px-4 py-3"><ScoreCell value={row.avg_score_ablation_impact} /></td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 font-bold tabular-nums text-xs">
                      {row.avg_total_ms ? `${(row.avg_total_ms / 1000).toFixed(1)}s` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 font-bold tabular-nums text-xs">
                      {row.avg_cost_usd ? `$${row.avg_cost_usd.toFixed(4)}` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-400 text-xs font-bold">{row.n_runs}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Panel 3 — Heatmap ────────────────────────────────────────────────────── */
function Heatmap({
  summary,
  configs,
  onCellClick,
}: {
  summary: SummaryRow[];
  configs: string[];
  onCellClick: (category: string, configId: string) => void;
}) {
  if (!summary.length) return null;

  // Mapa: category → configId → avg_score_total
  const map: Record<string, Record<string, number | null>> = {};
  for (const row of summary) {
    if (row.question_category === 'all') continue;
    if (!map[row.question_category]) map[row.question_category] = {};
    map[row.question_category][row.config_id] = row.avg_score_total;
  }

  const configOrder = [...new Set(
    summary.filter((r) => r.question_category === 'all').sort((a, b) => a.display_order - b.display_order).map((r) => r.config_id)
  )];

  const cats = CAT_ORDER.filter((c) => map[c]);
  if (!cats.length) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <Layers className="w-4 h-4 text-purple-500" />
        <h2 className="text-sm font-black text-slate-800">Heatmap Categoría × Configuración</h2>
        <span className="text-[11px] text-slate-400 ml-auto">Click en celda → ver runs</span>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</th>
              {configOrder.map((cid) => (
                <th key={cid} className="text-center px-2 py-2 text-[11px] font-black text-slate-600 min-w-[64px]">
                  {cid}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cats.map((cat) => (
              <tr key={cat}>
                <td className="px-3 py-2 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                  {CAT_LABELS[cat] ?? cat}
                </td>
                {configOrder.map((cid) => {
                  const val = map[cat]?.[cid] ?? null;
                  return (
                    <td key={cid} className="text-center">
                      <button
                        onClick={() => onCellClick(cat, cid)}
                        className={cn(
                          'w-full px-3 py-2 rounded-xl text-[12px] font-black transition-all hover:scale-105 hover:shadow-md',
                          heatmapBg(val),
                        )}
                        title={`${CAT_LABELS[cat]} × Config ${cid}`}
                      >
                        {val !== null ? val.toFixed(2) : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Leyenda */}
        <div className="flex items-center gap-2 mt-4 px-3">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mr-1">Score:</span>
          {[
            { label: '≥1.7', cls: 'bg-emerald-200 text-emerald-900' },
            { label: '≥1.4', cls: 'bg-emerald-100 text-emerald-800' },
            { label: '≥1.1', cls: 'bg-blue-100 text-blue-800' },
            { label: '≥0.8', cls: 'bg-amber-100 text-amber-800' },
            { label: '≥0.5', cls: 'bg-orange-100 text-orange-800' },
            { label: '<0.5', cls: 'bg-red-100 text-red-800' },
          ].map(({ label, cls }) => (
            <span key={label} className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold', cls)}>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Panel 4 — Runs expandibles bajo el heatmap ───────────────────────────── */
function RunsExpanded({
  runs,
  onSelectRun,
}: {
  runs: RunRow[];
  onSelectRun: (run: RunRow) => void;
}) {
  if (!runs.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm mt-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {['Pregunta', 'Score', 'Latencia', 'Estado', ''].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {runs.map((r) => (
            <tr key={r.id} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => onSelectRun(r)}>
              <td className="px-4 py-2.5 max-w-xs">
                <p className="truncate text-slate-700 font-medium">{r.question_text.slice(0, 70)}…</p>
              </td>
              <td className="px-4 py-2.5"><ScoreCell value={r.score_total} /></td>
              <td className="px-4 py-2.5 text-slate-500 font-bold tabular-nums">
                {r.total_ms ? `${(r.total_ms / 1000).toFixed(1)}s` : '—'}
              </td>
              <td className="px-4 py-2.5">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-2.5">
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    done: 'bg-emerald-100 text-emerald-700',
    error: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-slate-100 text-slate-500',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', map[status] ?? map.pending)}>
      {status}
    </span>
  );
}

/* ── Panel 4b — Detalle de un run ─────────────────────────────────────────── */
function RunDetail({ run, onClose }: { run: RunRow; onClose: () => void }) {
  const DUAL_SCORES = [
    { key: 'score_factual', label: 'Integridad Factual', weight: '50%' },
    { key: 'score_diagnostic', label: 'Valor Diagnóstico', weight: '50%' },
  ] as const;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <BarChart3 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle de ejecución</p>
              <p className="text-sm font-bold text-slate-800">Config {run.config_id} — {run.config_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Pregunta */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pregunta</p>
            <p className="text-sm text-slate-800 bg-slate-50 rounded-2xl p-4 border border-slate-100 leading-relaxed">
              {run.question_text}
            </p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score total</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {run.score_total !== null ? run.score_total.toFixed(2) : '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latencia</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">
                {run.total_ms ? `${(run.total_ms / 1000).toFixed(1)}s` : '—'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chunks</p>
              <p className="text-xl font-black text-slate-800 mt-0.5">{run.chunks_retrieved ?? '—'}</p>
            </div>
          </div>

          {/* Agentes activos */}
          {run.detected_urgency && (
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-700">
                Urgencia: {run.detected_urgency}
              </span>
              {run.response_mode && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">
                  Modo: {run.response_mode}
                </span>
              )}
              {run.session_id && (
                <Link
                  href={`/dashboard/sessions/${run.session_id}`}
                  target="_blank"
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Ver sesión
                </Link>
              )}
            </div>
          )}

          {/* Rúbrica Dual */}
          {run.score_total !== null && (
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluación Dual (50/50)</p>
              <div className="grid grid-cols-1 gap-4">
                {DUAL_SCORES.map(({ key, label, weight }) => (
                  <div key={key} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{label}</span>
                      <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">
                        PESO {weight}
                      </span>
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-1000',
                            ((run as any)[key] ?? 0) >= 1.5 ? 'bg-emerald-500' :
                              ((run as any)[key] ?? 0) >= 1.0 ? 'bg-amber-400' : 'bg-red-500'
                          )}
                          style={{ width: `${(((run as any)[key] ?? 0) / 2) * 100}%` }}
                        />
                      </div>
                      <span className="text-lg font-black text-slate-800 leading-none">
                        {((run as any)[key] ?? 0).toFixed(1)}<span className="text-xs text-slate-400">/2.0</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Errores factuales */}
          {run.factual_errors && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Errores detectados</p>
              {(() => {
                try {
                  const errors = JSON.parse(run.factual_errors);
                  if (Array.isArray(errors) && errors.length > 0) {
                    return (
                      <div className="space-y-2">
                        {errors.map((err: string, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-3 bg-red-50/50 rounded-xl border border-red-100/50 text-xs text-red-700">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            {err}
                          </div>
                        ))}
                      </div>
                    );
                  }
                } catch (e) { }
                return <p className="text-xs text-slate-400 italic">No se detectaron errores factuales.</p>;
              })()}
            </div>
          )}

          {/* Valor diagnóstico */}
          {run.diagnostic_value && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Diagnóstico Hallado</p>
              <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 text-xs text-blue-800 leading-relaxed shadow-inner">
                {run.diagnostic_value}
              </div>
            </div>
          )}

          {/* Judge reasoning */}
          {run.judge_reasoning && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Razonamiento del juez</p>
              <p className="text-sm text-slate-700 bg-amber-50/60 rounded-2xl p-4 border border-amber-100 leading-relaxed italic">
                &ldquo;{run.judge_reasoning}&rdquo;
              </p>
            </div>
          )}

          {/* Respuesta generada */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Respuesta generada</p>
            <div className="text-sm text-slate-700 bg-slate-50 rounded-2xl p-4 border border-slate-100 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {run.response_text ?? <span className="text-slate-400 italic">Sin respuesta</span>}
            </div>
          </div>

          {/* Ground truth */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ground truth</p>
            <div className="text-sm text-slate-700 bg-emerald-50/60 rounded-2xl p-4 border border-emerald-100 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {run.ground_truth}
            </div>
          </div>

          {/* Error */}
          {run.error_message && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 rounded-2xl border border-red-100">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 font-medium">{run.error_message}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Panel 5 — Copiar al Portapapeles ─────────────────────────────────────── */
function ClipboardExportPanel({
  batch,
  summaryAll,
  summary,
  runs,
  configIds,
}: {
  batch: string;
  summaryAll: SummaryRow[];
  summary: SummaryRow[];
  runs: RunRow[];
  configIds: string[];
}) {
  const [copied, setCopied] = useState(false);
  const [loopRows, setLoopRows] = useState<LoopHealthRow[]>([]);
  const [scenRows, setScenRows] = useState<ScenRunRow[]>([]);

  useEffect(() => {
    if (!batch) return;
    // Cargar Loop Health
    fetch(`/api/ablation/loop-health?batch=${encodeURIComponent(batch)}`)
      .then((r) => r.json())
      .then((d) => setLoopRows(Array.isArray(d) ? d : []))
      .catch(() => { });

    // Cargar Escenarios Multi-turno
    fetch(`/api/ablation/scenarios/runs?batch=${encodeURIComponent(batch)}`)
      .then((r) => r.json())
      .then((d) => setScenRows(Array.isArray(d) ? d : []))
      .catch(() => { });
  }, [batch]);

  const buildText = useCallback((): string => {
    const lines: string[] = [];
    const ts = new Date().toLocaleString('es-ES');
    const pad = (s: string | number, w: number) => String(s).padEnd(w);
    const fmt = (n: number | null, d = 2) => n == null ? 'N/A' : n.toFixed(d);

    // ── Encabezado ────────────────────────────────────────────────────────────
    lines.push(`# INFORME DE ABLACIÓN — ${batch}`);
    lines.push(`Exportado: ${ts}`);
    lines.push(`Configuraciones: ${configIds.join(', ')} | Preguntas evaluadas: ${[...new Set(runs.map(r => r.question_id))].length}`);
    lines.push('');

    // ── 1. Loop Health & Gap Engine ───────────────────────────────────────────
    lines.push('## 1. LOOP HEALTH & GAP ENGINE');
    if (loopRows.length === 0 && scenRows.length === 0) {
      lines.push('(sin datos de loop health)');
    } else if (loopRows.length > 0) {
      // Loop health de preguntas individuales
      const H = ['Config', 'Nombre', 'N', 'AvgLoops', 'AvgConf', 'GapRes%', 'Stuck', 'MaxLoops', 'MultiLoop', 'LowConf', 'HighConf'];
      lines.push(H.join(' | '));
      lines.push(H.map(h => '-'.repeat(h.length)).join(' | '));
      for (const r of loopRows) {
        lines.push([
          pad(r.config_id, 6),
          pad(r.config_name, 22),
          pad(r.n_runs, 3),
          pad(fmt(r.avg_loops, 2), 8),
          pad(fmt(r.avg_confidence, 2), 7),
          pad(r.pct_gap_resolved != null ? `${r.pct_gap_resolved.toFixed(0)}%` : 'N/A', 7),
          pad(r.loops_stuck, 5),
          pad(r.max_loop_count, 8),
          pad(r.n_multi_loop, 9),
          pad(r.n_low_confidence, 7),
          pad(r.n_high_confidence, 8),
        ].join(' | '));
      }
    }
    // Loop health de escenarios (derivado de ablation_scenario_runs)
    if (scenRows.length > 0) {
      if (loopRows.length > 0) lines.push('');
      lines.push('### 1b. Loop Health — Escenarios Multi-turno');
      const scenCfgIds = [...new Set(scenRows.map(r => r.config_id))].sort((a, b) => {
        return (scenRows.find(r => r.config_id === a)?.display_order ?? 99) -
          (scenRows.find(r => r.config_id === b)?.display_order ?? 99);
      });
      const SH = ['Config', 'Nombre', 'N', 'AvgLoopsTot', 'AvgConf', 'PctResuelto', 'AvgTurnos'];
      lines.push(SH.join(' | '));
      lines.push(SH.map(h => '-'.repeat(h.length)).join(' | '));
      for (const cid of scenCfgIds) {
        const cfgRuns = scenRows.filter(r => r.config_id === cid);
        const cfgName = cfgRuns[0]?.config_name ?? cid;
        const n = cfgRuns.length;
        const avgLoops = cfgRuns.reduce((s, r) => s + (r.total_loops_fired ?? 0), 0) / n;
        const confVals = cfgRuns.filter(r => r.avg_confidence_session != null).map(r => r.avg_confidence_session as number);
        const avgConf = confVals.length ? confVals.reduce((a, b) => a + b, 0) / confVals.length : null;
        const pctRes = (cfgRuns.filter(r => (r.judge_resolution_reached ?? r.resolution_reached) === 1).length / n * 100);
        const turnVals = cfgRuns.filter(r => r.turns_to_resolution != null).map(r => r.turns_to_resolution as number);
        const avgTurns = turnVals.length ? turnVals.reduce((a, b) => a + b, 0) / turnVals.length : null;
        lines.push([
          pad(cid, 6),
          pad(cfgName.slice(0, 22), 22),
          pad(n, 3),
          pad(fmt(avgLoops, 2), 11),
          pad(fmt(avgConf, 2), 7),
          pad(`${pctRes.toFixed(0)}%`, 11),
          pad(fmt(avgTurns, 1), 9),
        ].join(' | '));
      }
    }
    lines.push('');

    // ── 2. Resumen por configuración (global) ─────────────────────────────────
    lines.push('## 2. RESUMEN POR CONFIGURACIÓN (GLOBAL — Preguntas Individuales)');
    if (summaryAll.length === 0) {
      lines.push('(batch de escenarios puros — sin ejecuciones de preguntas individuales)');
    } else {
      const H2 = ['Cfg', 'Nombre', 'N', 'ScoreTotal', 'Factual', 'Diag', 'LatMs', 'CostoUSD'];
      lines.push(H2.join(' | '));
      lines.push(H2.map(h => '-'.repeat(h.length)).join(' | '));

      // Calcular factual/diag desde runs (no están en summaryAll)
      const avgByConfig = (cfgId: string, field: keyof RunRow): number | null => {
        const vals = runs.filter(r => r.config_id === cfgId && r[field] != null).map(r => r[field] as number);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };

      for (const s of summaryAll.sort((a, b) => a.display_order - b.display_order)) {
        lines.push([
          pad(s.config_id, 3),
          pad(s.config_name.slice(0, 22), 22),
          pad(s.n_runs, 3),
          pad(fmt(s.avg_score_total), 10),
          pad(fmt(avgByConfig(s.config_id, 'score_factual')), 7),
          pad(fmt(avgByConfig(s.config_id, 'score_diagnostic')), 4),
          pad(s.avg_total_ms != null ? Math.round(s.avg_total_ms).toString() : 'N/A', 5),
          pad(s.avg_cost_usd != null ? s.avg_cost_usd.toFixed(4) : 'N/A', 8),
        ].join(' | '));
      }
    }
    lines.push('');

    // ── 2b. Resumen de escenarios por configuración ───────────────────────────
    if (scenRows.length > 0) {
      lines.push('## 2b. RESUMEN POR CONFIGURACIÓN (Escenarios Multi-turno)');
      const scenCfgIds2 = [...new Set(scenRows.map(r => r.config_id))].sort((a, b) => {
        return (scenRows.find(r => r.config_id === a)?.display_order ?? 99) -
          (scenRows.find(r => r.config_id === b)?.display_order ?? 99);
      });
      const Hs = ['Cfg', 'Nombre', 'N', 'ScoreTotal', 'Diag', 'Factual', 'Hypo', 'Tech', 'Resuelto%'];
      lines.push(Hs.join(' | '));
      lines.push(Hs.map(h => '-'.repeat(h.length)).join(' | '));
      for (const cid of scenCfgIds2) {
        const cfgRuns = scenRows.filter(r => r.config_id === cid && r.score_total != null);
        if (!cfgRuns.length) continue;
        const avg = (field: keyof ScenRunRow): number | null => {
          const vals = cfgRuns.filter(r => r[field] != null).map(r => r[field] as number);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        };
        const pctRes = (cfgRuns.filter(r => (r.judge_resolution_reached ?? r.resolution_reached) === 1).length / cfgRuns.length * 100);
        lines.push([
          pad(cid, 3),
          pad(cfgRuns[0]?.config_name?.slice(0, 22) ?? '', 22),
          pad(cfgRuns.length, 3),
          pad(fmt(avg('score_total')), 10),
          pad(fmt(avg('score_diagnostic_progression')), 4),
          pad(fmt(avg('score_factual_consistency')), 7),
          pad(fmt(avg('score_hypothesis_refinement')), 4),
          pad(fmt(avg('score_technician_effort')), 4),
          pad(`${pctRes.toFixed(0)}%`, 9),
        ].join(' | '));
      }
      lines.push('');
    }

    // ── 3. Heatmap Categoría × Configuración ─────────────────────────────────
    lines.push('## 3. HEATMAP SCORE_TOTAL — CATEGORÍA × CONFIGURACIÓN (Preguntas)');
    if (summary.length === 0) {
      lines.push('(sin datos de preguntas individuales para este batch)');
    } else {
      const sortedCfgs = [...configIds].sort();
      const hHeader = ['Categoría'.padEnd(26), ...sortedCfgs.map(c => c.padEnd(6))].join(' | ');
      lines.push(hHeader);
      lines.push('-'.repeat(hHeader.length));

      for (const cat of CAT_ORDER) {
        const row: string[] = [CAT_LABELS[cat]?.slice(0, 26).padEnd(26) ?? cat.padEnd(26)];
        for (const cfgId of sortedCfgs) {
          const cell = summary.find(s => s.question_category === cat && s.config_id === cfgId);
          row.push((cell?.avg_score_total != null ? cell.avg_score_total.toFixed(2) : ' —  ').padEnd(6));
        }
        lines.push(row.join(' | '));
      }
    }
    lines.push('');

    // ── 4. Resumen de Escenarios Multi-turno ──────────────────────────────────
    if (scenRows.length > 0) {
      lines.push('## 4. RESUMEN DE ESCENARIOS MULTI-TURNO');
      const sCfgs = [...new Set(scenRows.map(r => r.config_id))].sort();
      const sScens = [...new Set(scenRows.map(r => r.scenario_id))].sort();

      const shHeader = ['Escenario'.padEnd(26), ...sCfgs.map(c => c.padEnd(6))].join(' | ');
      lines.push(shHeader);
      lines.push('-'.repeat(shHeader.length));

      for (const sid of sScens) {
        const title = scenRows.find(r => r.scenario_id === sid)?.scenario_title ?? sid;
        const row: string[] = [title.slice(0, 26).padEnd(26)];
        for (const cid of sCfgs) {
          const r = scenRows.find(rr => rr.scenario_id === sid && rr.config_id === cid);
          row.push((r?.score_total != null ? r.score_total.toFixed(2) : (r?.status === 'error' ? 'ERR' : ' — ')).padEnd(6));
        }
        lines.push(row.join(' | '));
      }
      lines.push('');
    }

    // ── 5. DETALLE DE FALLOS Y BAJO DESEMPEÑO (BASED ON ERRORS/LOW SCORE) ──────
    lines.push('## 5. DETALLE DE FALLOS Y BAJO DESEMPEÑO');
    const failures = runs.filter(r => r.status === 'error' || (r.score_total != null && r.score_total < 1.0));
    const scenFailures = scenRows.filter(r => r.status === 'error' || (r.score_total != null && r.score_total < 1.0));

    if (failures.length === 0 && scenFailures.length === 0) {
      lines.push('No se detectaron fallos críticos o puntuaciones menores a 1.0.');
    } else {
      // Fallos en preguntas base
      for (const r of failures) {
        lines.push(`### [FALLO] ${r.question_id} — Config: ${r.config_id}`);
        lines.push(`**Pregunta:** ${r.question_text}`);
        if (r.status === 'error') {
          lines.push(`**ERROR TÉCNICO:** ${r.error_message ?? 'Error desconocido'}`);
        } else {
          lines.push(`**SCORE:** ${r.score_total?.toFixed(2)}/2.0`);
          lines.push(`**RAZÓN JUEZ:** ${r.judge_reasoning ?? 'Sin explicación'}`);
          if (r.factual_errors) {
            try {
              const errs = JSON.parse(r.factual_errors);
              if (errs.length) lines.push(`**ERRORES FACTUALES:** ${errs.join('; ')}`);
            } catch { }
          }
        }
        lines.push('');
      }
      // Fallos en escenarios
      for (const r of scenFailures) {
        lines.push(`### [FALLO ESCENARIO] ${r.scenario_id} — Config: ${r.config_id}`);
        lines.push(`**Escenario:** ${r.scenario_title}`);
        if (r.status === 'error') {
          lines.push(`**ERROR TÉCNICO:** ${r.error_message ?? 'Error desconocido'}`);
        } else {
          lines.push(`**SCORE:** ${r.score_total?.toFixed(2)}/2.0`);
          lines.push(`**NARRATIVA JUEZ:** ${r.judge_narrative ?? 'Sin explicación'}`);
          if (r.critical_error_made) lines.push('**ALERTA: Se cometió un error crítico.**');
          if (r.contradicted_itself) lines.push('**ALERTA: El sistema se contradijo entre turnos.**');
        }
        lines.push('');
      }
    }
    lines.push('');

    // ── 6. Veredicto del juez por pregunta (Completo) ─────────────────────────
    lines.push('## 6. VEREDICTO COMPLETO POR PREGUNTA');

    const questionIds = [...new Set(runs.map(r => r.question_id))].sort();

    for (const qid of questionIds) {
      const qRuns = runs.filter(r => r.question_id === qid);
      if (!qRuns.length) continue;
      const first = qRuns[0];

      lines.push('');
      lines.push(`### ${qid} — ${first.question_text}`);
      lines.push(`**Categoría:** ${CAT_LABELS[first.category] ?? first.category} | **Ground Truth:** ${first.ground_truth}`);
      lines.push('');

      const Hq = ['Cfg', 'Nombre', 'ScoreTotal', 'Factual', 'Diag', 'Errores Factuales', 'Valor Diagnóstico', 'Razonamiento Juez'];
      lines.push(Hq.join(' | '));
      lines.push(Hq.map(h => '-'.repeat(h.length)).join(' | '));

      for (const r of qRuns.sort((a, b) => (a.config_id > b.config_id ? 1 : -1))) {
        let factErrors = '—';
        try {
          const errs = JSON.parse(r.factual_errors ?? '[]') as string[];
          factErrors = errs.length ? errs.join('; ') : '—';
        } catch { /* */ }

        lines.push([
          pad(r.config_id, 3),
          pad(r.config_name.slice(0, 18), 18),
          pad(fmt(r.score_total), 10),
          pad(fmt(r.score_factual), 7),
          pad(fmt(r.score_diagnostic), 4),
          pad((factErrors).slice(0, 60), 18),
          pad((r.diagnostic_value ?? '—').slice(0, 60), 18),
          (r.judge_reasoning ?? '—').replace(/\n/g, ' '),
        ].join(' | '));
      }
    }

    lines.push('');
    lines.push('---');
    lines.push(`Fin del informe. Batch: ${batch} | Generado: ${ts}`);

    return lines.join('\n');
  }, [batch, summaryAll, summary, runs, configIds, loopRows, scenRows]);

  const handleCopy = useCallback(async () => {
    const text = buildText();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }, [buildText]);

  const totalRuns = runs.length + scenRows.length;
  const scoredRuns = runs.filter(r => r.score_total != null).length + scenRows.filter(r => r.score_total != null).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Copy className="w-4 h-4 text-blue-500" />
          <h2 className="text-sm font-black text-slate-800">Exportar para Asistente</h2>
          <span className="text-[11px] text-slate-400">
            Loop Health · Resumen por config · Heatmap · Veredicto por pregunta
          </span>
        </div>
        <button
          onClick={handleCopy}
          disabled={totalRuns === 0}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm',
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {copied
            ? <><CheckCheck className="w-3.5 h-3.5" /> ¡Copiado!</>
            : <><Copy className="w-3.5 h-3.5" /> Copiar al portapapeles</>
          }
        </button>
      </div>

      <div className="px-5 py-4 flex flex-wrap gap-6 text-sm text-slate-500">
        <span><span className="font-bold text-slate-800">{totalRuns}</span> ejecuciones totales</span>
        <span><span className="font-bold text-slate-800">{scoredRuns}</span> evaluadas por el juez</span>
        <span><span className="font-bold text-slate-800">{[...new Set([...runs.map(r => r.question_id), ...scenRows.map(r => r.scenario_id)])].length}</span> unidades únicas</span>
        <span><span className="font-bold text-slate-800">{configIds.length}</span> configuraciones</span>
        <span><span className="font-bold text-slate-800">{loopRows.length > 0 ? 'Loop Health ✓' : (batch.startsWith('scen') ? 'N/A' : 'Loop Health cargando…')}</span></span>
      </div>

      {totalRuns === 0 && (
        <div className="px-5 pb-4 text-xs text-slate-400 italic">
          Selecciona un batch con datos para habilitar la exportación.
        </div>
      )}
    </div>
  );
}

/* ── Panel 6 — Resultados de Escenarios Multi-turno ──────────────────────── */
interface ScenTurnResult {
  id: string;
  turn_number: number;
  system_response: string | null;
  response_mode: string | null;
  chunks_used: number;
  loops_fired: number;
  confidence: number | null;
  gap_type: string | null;
  latency_ms: number | null;
}

interface ScenTurn {
  turn_number: number;
  technician_message: string;
  turn_intent: string | null;
  expected_behavior: string | null;
}

function ScenScoreCell({ v }: { v: number | null }) {
  if (v === null) return <span className="text-slate-300">—</span>;
  const pct = (v / 2) * 100;
  const color = pct >= 75 ? 'text-emerald-700' : pct >= 50 ? 'text-blue-700' : pct >= 30 ? 'text-amber-700' : 'text-red-700';
  return <span className={cn('font-bold tabular-nums', color)}>{v.toFixed(2)}</span>;
}

function ScenTranscriptModal({
  runId, title, onClose,
}: { runId: string; title: string; onClose: () => void }) {
  const [data, setData] = useState<{ turns: ScenTurn[]; results: ScenTurnResult[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ablation/scenarios/runs/${runId}`)
      .then((r) => r.json())
      .then((d) => setData({ turns: d.turns ?? [], results: d.results ?? [] }))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col pointer-events-auto">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-black text-slate-800 truncate pr-4">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 text-sm justify-center py-10">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando transcripción…
              </div>
            ) : !data ? (
              <p className="text-sm text-red-500 text-center py-10">Error al cargar</p>
            ) : (
              <div className="space-y-4">
                {data.turns.map((t) => {
                  const res = data.results.find((r) => r.turn_number === t.turn_number);
                  return (
                    <div key={t.turn_number} className="space-y-2">
                      {/* Técnico */}
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-black text-amber-700">T{t.turn_number}</div>
                        <div className="flex-1 bg-amber-50 border border-amber-100 rounded-2xl rounded-tl-sm px-4 py-3">
                          <p className="text-sm text-slate-700">{t.technician_message}</p>
                          {t.turn_intent && <p className="text-[10px] text-amber-500 font-bold mt-1">intent: {t.turn_intent}</p>}
                        </div>
                      </div>
                      {/* Sistema */}
                      {res && (
                        <div className="flex gap-3 flex-row-reverse">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-black text-violet-700">S</div>
                          <div className="flex-1 bg-white border border-slate-200 rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{res.system_response ?? '(sin respuesta)'}</p>
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                              {res.response_mode && <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">{res.response_mode}</span>}
                              {res.confidence !== null && <span className="text-[10px] text-slate-400 font-mono">conf: {res.confidence.toFixed(2)}</span>}
                              {res.loops_fired > 0 && <span className="text-[10px] text-slate-400 font-mono">loops: {res.loops_fired}</span>}
                              {res.latency_ms && <span className="text-[10px] text-slate-400 font-mono">{(res.latency_ms / 1000).toFixed(1)}s</span>}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ScenarioResultsPanel({ rows, loading }: { rows: ScenRunRow[]; loading: boolean }) {
  const [detailId, setDetailId] = useState<{ id: string; title: string } | null>(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Cargando escenarios…
      </div>
    );
  }

  if (!rows.length) return null;

  // Agrupar por scenario_id
  const scenarioIds = [...new Set(rows.map((r) => r.scenario_id))];
  const configIds = [...new Set(rows.map((r) => r.config_id))].sort((a, b) => {
    const ra = rows.find((r) => r.config_id === a);
    const rb = rows.find((r) => r.config_id === b);
    return (ra?.display_order ?? 99) - (rb?.display_order ?? 99);
  });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
        <Layers className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-black text-slate-800">Resultados — Escenarios Multi-turno</h3>
        <span className="ml-auto text-[11px] text-slate-400">{rows.length} ejecuciones</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Escenario</th>
              {configIds.map((cid) => {
                const r = rows.find((row) => row.config_id === cid);
                return (
                  <th key={cid} className="text-center px-3 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    {cid}
                    {r?.is_baseline === 1 && <span className="ml-1 text-blue-500">✦</span>}
                    <div className="text-[9px] font-normal normal-case text-slate-400 truncate max-w-[100px] mx-auto">{r?.config_name}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scenarioIds.map((sid) => {
              const scenRow = rows.find((r) => r.scenario_id === sid);
              return (
                <tr key={sid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black text-slate-400 font-mono">{sid}</span>
                      <p className="text-sm font-bold text-slate-700 leading-snug">{scenRow?.scenario_title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-slate-400">{scenRow?.scenario_category}</span>
                        <span className="text-[10px] text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{scenRow?.difficulty}</span>
                      </div>
                    </div>
                  </td>
                  {configIds.map((cid) => {
                    const r = rows.find((row) => row.scenario_id === sid && row.config_id === cid);
                    if (!r) return <td key={cid} className="px-3 py-3 text-center"><span className="text-slate-200 text-xs">—</span></td>;

                    const isErr = r.status === 'error';
                    return (
                      <td key={cid} className="px-3 py-3">
                        <button
                          onClick={() => setDetailId({ id: r.id, title: `${r.scenario_title} × ${r.config_name}` })}
                          className="w-full text-center space-y-1 hover:bg-violet-50 rounded-xl p-2 transition-colors group"
                        >
                          {isErr ? (
                            <span className="text-[11px] text-red-500 font-bold">Error</span>
                          ) : r.score_total !== null ? (
                            <>
                              <div className="text-base font-black tabular-nums">
                                <ScenScoreCell v={r.score_total} />
                              </div>
                              <div className="grid grid-cols-2 gap-0.5 text-[9px] text-slate-400 font-mono">
                                <span>diag {r.score_diagnostic_progression?.toFixed(1) ?? '—'}</span>
                                <span>fact {r.score_factual_consistency?.toFixed(1) ?? '—'}</span>
                                <span>hypo {r.score_hypothesis_refinement?.toFixed(1) ?? '—'}</span>
                                <span>tech {r.score_technician_effort?.toFixed(1) ?? '—'}</span>
                              </div>
                              <div className="flex items-center justify-center gap-1 flex-wrap">
                                {r.judge_resolution_reached === 1 && <span title="Resolución alcanzada" className="text-emerald-500 text-[10px]">✓</span>}
                                {r.critical_error_made === 1 && <span title="Error crítico" className="text-red-500    text-[10px]">⚠</span>}
                                {r.contradicted_itself === 1 && <span title="Se contradijo" className="text-amber-500  text-[10px]">↯</span>}
                                {r.repeated_question === 1 && <span title="Pregunta repetida" className="text-slate-400  text-[10px]">↺</span>}
                              </div>
                              <div className="text-[9px] text-slate-300 group-hover:text-slate-400 transition-colors">
                                {r.turns_completed}/{r.turns_planned} turnos
                              </div>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-400">Sin juez</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-50 text-[10px] text-slate-400 flex items-center gap-3">
        <span>✓ resolución alcanzada</span>
        <span>⚠ error crítico</span>
        <span>↯ se contradijo</span>
        <span>↺ pregunta repetida</span>
        <span className="ml-auto">✦ baseline</span>
      </div>

      {detailId && (
        <ScenTranscriptModal
          runId={detailId.id}
          title={detailId.title}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

/* ── Panel 0 — Loop Health + Gap Engine ───────────────────────────────────── */
function LoopHealthPanel({ batch }: { batch: string }) {
  const [rows, setRows] = useState<LoopHealthRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!batch) { setRows([]); return; }
    setLoading(true);
    fetch(`/api/ablation/loop-health?batch=${encodeURIComponent(batch)}`)
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [batch]);

  if (loading) return (
    <div className="flex items-center justify-center h-24 text-slate-400">
      <Loader2 className="w-4 h-4 animate-spin mr-2" />
      <span className="text-sm">Cargando Loop Health…</span>
    </div>
  );
  if (rows.length === 0) return null;

  /* Badges globales de alerta */
  const stuckConfigs = rows.filter(r => (r.loops_stuck ?? 0) > 2);
  const lowGapResolve = rows.filter(r => (r.pct_gap_resolved ?? 100) < 30 && r.n_multi_loop > 0);
  const highGapResolve = rows.filter(r => (r.pct_gap_resolved ?? 0) > 70 && r.n_multi_loop > 0);
  const efficientLoops = rows.filter(r => { const a = r.avg_loops ?? 0; return a >= 1.2 && a <= 1.6; });

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
        <Activity className="w-4 h-4 text-indigo-500" />
        <h2 className="text-sm font-black text-slate-800">Loop Health &amp; Gap Engine</h2>
        <span className="text-[11px] text-slate-400">Salud del bucle React + efectividad del Gap Engine</span>
        <div className="ml-auto flex flex-wrap gap-2">
          {stuckConfigs.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
              <AlertCircle className="w-3 h-3" /> Loop atascado frecuente ({stuckConfigs.length})
            </span>
          )}
          {lowGapResolve.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
              <AlertCircle className="w-3 h-3" /> Gap Engine no progresa ({lowGapResolve.length})
            </span>
          )}
          {highGapResolve.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Re-búsqueda efectiva ({highGapResolve.length})
            </span>
          )}
          {efficientLoops.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> Loop eficiente ({efficientLoops.length})
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              {['Config', 'Avg loops', 'Conf. avg', 'Chunks finales', 'Gap resuelto', 'Stop reason', 'Stuck', 'Baja conf.', 'Max loops'].map(h => (
                <th key={h} className="text-left px-3 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map(row => {
              const avgLoops = row.avg_loops ?? 0;
              const avgConf = row.avg_confidence ?? null;
              const pctRes = row.pct_gap_resolved ?? null;
              const isStuck = (row.loops_stuck ?? 0) > 2;
              const isNoGap = pctRes !== null && pctRes < 30 && row.n_multi_loop > 0;
              const isAlert = isStuck || isNoGap || (row.n_low_confidence ?? 0) > 0;

              const confColor = avgConf === null ? 'text-slate-300'
                : avgConf >= 0.7 ? 'text-emerald-700'
                  : avgConf >= 0.5 ? 'text-amber-700'
                    : 'text-red-700';
              const loopColor = avgLoops <= 1 ? 'text-emerald-700'
                : avgLoops <= 1.6 ? 'text-amber-700'
                  : 'text-red-700';

              // Razón de stop dominante
              const stopCounts = [
                { label: 'resolved', n: row.loops_resolved ?? 0, color: 'text-emerald-600' },
                { label: 'no_gain', n: row.loops_no_gain ?? 0, color: 'text-amber-600' },
                { label: 'stuck', n: row.loops_stuck ?? 0, color: 'text-red-600' },
                { label: 'max_loops', n: row.loops_maxed ?? 0, color: 'text-red-700' },
              ].sort((a, b) => b.n - a.n);
              const topStop = stopCounts[0];

              return (
                <tr key={row.config_id} className={cn(
                  'transition-colors',
                  isAlert ? 'bg-amber-50/40' : 'hover:bg-slate-50/60',
                )}>
                  {/* Config */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-slate-800 text-xs">{row.config_id}</span>
                      <span className="text-[10px] text-slate-500 truncate max-w-[90px]">{row.config_name}</span>
                      {row.is_baseline === 1 && (
                        <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded font-black">BASE</span>
                      )}
                    </div>
                  </td>

                  {/* Avg loops */}
                  <td className="px-3 py-3">
                    <span className={cn('font-bold tabular-nums text-xs', loopColor)}>
                      {avgLoops.toFixed(2)}
                    </span>
                  </td>

                  {/* Avg confidence */}
                  <td className="px-3 py-3">
                    {avgConf !== null ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full',
                              avgConf >= 0.7 ? 'bg-emerald-500' : avgConf >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
                            )}
                            style={{ width: `${avgConf * 100}%` }}
                          />
                        </div>
                        <span className={cn('font-bold tabular-nums text-[11px]', confColor)}>
                          {(avgConf * 100).toFixed(0)}%
                        </span>
                      </div>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>

                  {/* Avg chunks finales */}
                  <td className="px-3 py-3">
                    <span className="text-slate-600 font-bold tabular-nums text-xs">
                      {(row.avg_chunks_final ?? 0).toFixed(1)}
                    </span>
                  </td>

                  {/* Gap resuelto % */}
                  <td className="px-3 py-3">
                    {row.n_multi_loop > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full',
                              (pctRes ?? 0) >= 70 ? 'bg-emerald-500'
                                : (pctRes ?? 0) >= 30 ? 'bg-amber-400' : 'bg-red-400'
                            )}
                            style={{ width: `${pctRes ?? 0}%` }}
                          />
                        </div>
                        <span className={cn('text-[11px] font-bold',
                          (pctRes ?? 0) >= 70 ? 'text-emerald-700'
                            : (pctRes ?? 0) >= 30 ? 'text-amber-700' : 'text-red-700'
                        )}>
                          {pctRes !== null ? `${pctRes.toFixed(0)}%` : '—'}
                        </span>
                      </div>
                    ) : <span className="text-slate-300 text-[11px]">N/A</span>}
                  </td>

                  {/* Razón de stop dominante */}
                  <td className="px-3 py-3">
                    {topStop.n > 0 ? (
                      <span className={cn('text-[10px] font-black', topStop.color)}>
                        {topStop.label} ({topStop.n})
                      </span>
                    ) : <span className="text-slate-300 text-xs">—</span>}
                  </td>

                  {/* Loops atascados */}
                  <td className="px-3 py-3">
                    {(row.loops_stuck ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black">
                        <AlertCircle className="w-2.5 h-2.5" />{row.loops_stuck}
                      </span>
                    ) : (
                      <span className="text-emerald-500 text-[10px] font-black">0</span>
                    )}
                  </td>

                  {/* Baja confianza */}
                  <td className="px-3 py-3">
                    {(row.n_low_confidence ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-black border border-red-200">
                        <AlertCircle className="w-2.5 h-2.5" />{row.n_low_confidence}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                        <CheckCircle2 className="w-3 h-3" />0
                      </span>
                    )}
                  </td>

                  {/* Max loops */}
                  <td className="px-3 py-3">
                    <span className={cn(
                      'font-mono font-black text-[11px] px-1.5 py-0.5 rounded',
                      row.max_loop_count >= 3 ? 'bg-red-100 text-red-700'
                        : row.max_loop_count >= 2 ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600',
                    )}>
                      {row.max_loop_count}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-slate-50 bg-slate-50/50 flex flex-wrap gap-5 text-[11px] text-slate-500">
        <span><span className="font-black text-emerald-600">Verde conf</span>: ≥ 70%</span>
        <span><span className="font-black text-amber-600">Ámbar conf</span>: 50-70%</span>
        <span><span className="font-black text-red-600">Rojo</span>: &lt; 50%</span>
        <span>Gap resuelto: % de runs donde el gap cambió entre loops (progreso real)</span>
        <span>stuck = gap_unchanged | no_gain = sin mejora de confianza</span>
      </div>
    </div>
  );
}

import { Suspense } from 'react';

/* ── PAGE ─────────────────────────────────────────────────────────────────── */
function ScenariosResultsContent() {
  const searchParams = useSearchParams();
  const initialBatch = searchParams.get('batch') ?? '';

  const [batches, setBatches] = useState<Batch[]>([]);
  const [selBatch, setSelBatch] = useState(initialBatch);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [scenarios, setScenarios] = useState<ScenRunRow[]>([]);
  const [turnStats, setTurnStats] = useState<Record<string, any[]>>({});
  const [loopRows, setLoopRows] = useState<LoopHealthRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [selectedRun, setSelectedRun] = useState<RunRow | null>(null);
  const [expandedCell, setExpandedCell] = useState<{ cat: string; cfgId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'resultados' | 'graficos' | 'indexing'>('resultados');
  const [scenHeatmap, setScenHeatmap] = useState<any[]>([]);
  const [scenEfficiency, setScenEfficiency] = useState<any[]>([]);
  const [indexingData, setIndexingData] = useState<{ agg: IndexingAgg | null; docs: IndexingDocRow[]; agentLogs: AgentLogRow[] }>({ agg: null, docs: [], agentLogs: [] });
  const [indexingLoading, setIndexingLoading] = useState(false);

  // Cargar batches al montar
  useEffect(() => {
    fetch('/api/ablation/batches')
      .then((r) => r.json())
      .then(setBatches)
      .catch(console.error);
  }, []);

  // Cargar métricas de indexing (Enjambre A) — una sola vez
  useEffect(() => {
    setIndexingLoading(true);
    fetch('/api/ablation/indexing-metrics')
      .then((r) => r.json())
      .then((d) => setIndexingData({
        agg: d.agg ?? null,
        docs: Array.isArray(d.docs) ? d.docs : [],
        agentLogs: Array.isArray(d.agentLogs) ? d.agentLogs : [],
      }))
      .catch(console.error)
      .finally(() => setIndexingLoading(false));
  }, []);

  // Cargar datos cuando cambia el batch seleccionado
  useEffect(() => {
    if (!selBatch) { setSummary([]); setRuns([]); setScenarios([]); setLoopRows([]); setScenHeatmap([]); setScenEfficiency([]); return; }
    setLoadingData(true);
    Promise.all([
      fetch(`/api/ablation/summary?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/runs?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/scenarios/runs?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/scenarios/turn-stats?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/loop-health?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/scenarios/heatmap?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
      fetch(`/api/ablation/scenarios/efficiency?batch=${encodeURIComponent(selBatch)}`).then((r) => r.json()),
    ])
      .then(([s, r, sc, ts, lh, sh, se]) => {
        setSummary(Array.isArray(s) ? s : []);
        setRuns(Array.isArray(r) ? r : []);
        setScenarios(Array.isArray(sc) ? sc : []);
        setTurnStats(ts || {});
        setLoopRows(Array.isArray(lh) ? lh : []);
        setScenHeatmap(Array.isArray(sh) ? sh : []);
        setScenEfficiency(Array.isArray(se) ? se : []);
      })
      .catch(console.error)
      .finally(() => setLoadingData(false));
  }, [selBatch]);

  const summaryAll = summary.filter((s) => s.question_category === 'all');

  // Consolidar configIds de ambas fuentes (Ablatión normal y Escenarios)
  const configIds = [...new Set([
    ...summaryAll.map((s) => s.config_id),
    ...scenarios.map((s) => s.config_id)
  ])];

  // Runs que corresponden a la celda expandida del heatmap
  const cellRuns = expandedCell
    ? runs.filter((r) => r.category === expandedCell.cat && r.config_id === expandedCell.cfgId)
    : [];

  function handleCellClick(cat: string, cfgId: string) {
    setExpandedCell((prev) =>
      prev?.cat === cat && prev?.cfgId === cfgId ? null : { cat, cfgId }
    );
    setSelectedRun(null);
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl p-7 shadow-sm border border-blue-100"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e0f3ff 60%, #bae6fd 100%)' }}>
        <div className="absolute -right-10 -top-10 w-64 h-64 rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-black tracking-widest uppercase">
              <BarChart3 className="w-3.5 h-3.5" />
              ANÁLISIS DE ABLACIÓN
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">
              {selBatch || 'Cargando Resultados...'}
            </h1>
            <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
              Evaluación multimetrica de arquitecturas RAG para mantenimiento técnico de ascensores.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/dashboard/ablation"
              className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-blue-600 bg-white/60 border border-slate-200 hover:border-blue-300 transition-all"
            >
              ← Volver al banco
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('resultados')}
          className={cn(
            'px-6 py-2 rounded-xl text-sm font-black transition-all',
            activeTab === 'resultados' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Resultados
        </button>
        <button
          onClick={() => setActiveTab('graficos')}
          className={cn(
            'px-6 py-2 rounded-xl text-sm font-black transition-all',
            activeTab === 'graficos' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Enjambre B — Chat
        </button>
        <button
          onClick={() => setActiveTab('indexing')}
          className={cn(
            'px-6 py-2 rounded-xl text-sm font-black transition-all',
            activeTab === 'indexing' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          Enjambre A — Indexing
        </button>
      </div>

      {/* Panel 1 — Batch selector */}
      <BatchSelector batches={batches} selected={selBatch} onChange={setSelBatch} />

      {loadingData && (
        <div className="flex items-center justify-center h-40 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Cargando datos del batch…</span>
        </div>
      )}

      {!loadingData && activeTab === 'resultados' && (summaryAll.length > 0 || scenarios.length > 0) && (
        <>
          {/* Panel 6 — Escenarios Multi-turno */}
          <ScenarioResultsPanel rows={scenarios} loading={loadingData} />

          {/* Panel 2 — Tabla resumen */}
          {summaryAll.length > 0 && <SummaryTable summaryAll={summaryAll} />}

          {/* Panel 3 — Heatmap */}
          {summaryAll.length > 0 && (
            <Heatmap
              summary={summary}
              configs={configIds}
              onCellClick={handleCellClick}
            />
          )}

          {/* Runs expandidos */}
          {expandedCell && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {CAT_LABELS[expandedCell.cat]} × Config {expandedCell.cfgId}
                  </span>
                  <span className="text-[11px] text-slate-400">{cellRuns.length} runs completados</span>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => setExpandedCell(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <RunsExpanded runs={cellRuns} onSelectRun={setSelectedRun} />
            </div>
          )}

          {/* Panel 5 — Exportar al portapapeles */}
          <ClipboardExportPanel
            batch={selBatch}
            summaryAll={summaryAll}
            summary={summary}
            runs={runs}
            configIds={configIds}
          />
        </>
      )}

      {!loadingData && activeTab === 'graficos' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">

          {/* Fila 1: Radar + ComposedDual */}
          <ChartCard
            title="Comparativa de Dimensiones (Radar)"
            description="Distribución de desempeño en las 4 dimensiones clave de diagnóstico."
          >
            <RadarChartAcademic scenarios={scenarios} />
          </ChartCard>

          <ChartCard
            title="Calidad Global vs Tasa de Resolución"
            description="Evidencia de la caída de calidad en arquitecturas sin MAS a pesar de la resolución."
          >
            <ComposedChartDual scenarios={scenarios} summaryAll={summaryAll} />
          </ChartCard>

          {/* Fila 2: Score Breakdown (stacked) + Loops */}
          <ChartCard
            title="Desglose de Score por Dimensión"
            description="Contribución de cada dimensión evaluativa al score total por configuración."
            accent="violet"
          >
            <ScoreBreakdownChart scenarios={scenarios} summaryAll={summaryAll} />
          </ChartCard>


          {/* Fila 3: Turnos para resolución + Gap Stop Reasons */}
          <ChartCard
            title="Distribución de Turnos hasta Resolución"
            description="Número de turnos necesarios para alcanzar resolución por configuración y escenario."
            accent="emerald"
          >
            <TurnsToResolutionChart scenarios={scenarios} />
          </ChartCard>

          <ChartCard
            title="Consistencia y Varianza (Scatter)"
            description="Distribución de puntajes individuales: cada punto representa un escenario."
            accent="teal"
          >
            <ConsistencyChart scenarios={scenarios} />
          </ChartCard>

          {/* Fila 4: Heatmap + Latencia por Fase */}
          <ChartCard
            title="Heatmap de Resiliencia por Categoría"
            description="Identificación de puntos ciegos en arquitecturas base vs robustez MAS."
          >
            <HeatmapAcademic data={scenHeatmap} />
          </ChartCard>

          <ChartCard
            title="EFICIENCIA TEMPORAL: LATENCIA VS CICLOS"
            description="Correlación entre el tiempo de respuesta total y los ciclos de razonamiento (Loops) por configuración."
            accent="teal"
          >
            <LatencyEfficiencyChart data={scenEfficiency} />
          </ChartCard>

          {/* Fila 5: Confianza multiturno + Costo por Config */}
          <ChartCard
            title="Evolución de Confianza Multiturno"
            description="Comparativa de aprendizaje dinámico: Turno 1 al 5."
          >
            <ConfidenceTrendChart turnStats={turnStats} />
          </ChartCard>

          <ChartCard
            title="EFICIENCIA COMPUTACIONAL Y COSTO-EFECTIVIDAD"
            description="Promedio de turnos (llamadas API) por sesión de escenario."
            accent="violet"
          >
            <CostEffectivenessChart scenarios={scenarios} />
          </ChartCard>


          <div className="xl:col-span-2 p-6 bg-blue-50 border border-blue-100 rounded-3xl">
            <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest mb-2 flex items-center gap-2">
              <CheckCheck className="w-4 h-4" /> NOTA ACADÉMICA (PAPER Q1)
            </h4>
            <p className="text-sm text-blue-800 leading-relaxed font-medium">
              Los gráficos demuestran que la <strong>Configuración B</strong> mantiene un equilibrio óptimo entre
              precisión factual y eficiencia operativa. La curva de confianza disparada en el turno 3-5 valida
              la eficacia de la memoria dinámica en el MAS, superando significativamente al RAG tradicional (Config D).
            </p>
          </div>
        </div>
      )}

      {/* ── Enjambre A — Indexing Pipeline ──────────────────────────────────── */}
      {activeTab === 'indexing' && (
        <div className="space-y-6 pb-12">
          {indexingLoading ? (
            <div className="flex items-center justify-center h-40 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Cargando métricas de indexing…</span>
            </div>
          ) : !indexingData.agg ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-sm">
              Sin datos de indexing_metrics. Asegúrate de haber indexado documentos.
            </div>
          ) : (
            <>
              {/* KPIs */}
              <IndexingKPIRow agg={indexingData.agg} agentLogs={indexingData.agentLogs} />

              {/* Fila 1: Costo por agente + Pie costo total */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard
                  title="Costo avg por Agente del Pipeline"
                  description="Contribución de cada fase al costo total de indexación (×10⁻³ USD)."
                  height={380}
                  accent="violet"
                >
                  <IndexingCostBreakdown agg={indexingData.agg} />
                </ChartCard>

                <ChartCard
                  title="Distribución del Costo Total"
                  description="Proporción de costo acumulado por agente sobre todos los documentos indexados."
                  height={380}
                  accent="amber"
                >
                  <IndexingCostPie agg={indexingData.agg} />
                </ChartCard>
              </div>

              {/* Fila 2: Tokens agentes indexing + Gap Inheritance */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard
                  title="Tokens por Agente (Enjambre A)"
                  description="Consumo de tokens input/output promedio por cada agente de indexación."
                  height={400}
                  accent="blue"
                >
                  <AgentTokensChart agentLogs={indexingData.agentLogs} />
                </ChartCard>

                <ChartCard
                  title="Gaps Detectados y Herencia (L1/L2/L3)"
                  description="Gaps promedio por documento y cómo se resuelven mediante herencia de chunks."
                  height={400}
                  accent="emerald"
                >
                  <GapInheritanceChart agg={indexingData.agg} />
                </ChartCard>
              </div>

              {/* Fila 3: Scatter Chunks vs Páginas + Processing Time */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChartCard
                  title="Chunks vs Páginas (por modelo)"
                  description="Correlación entre extensión del documento y chunks generados, coloreados por modelo de equipo."
                  height={420}
                  accent="teal"
                >
                  <ChunksVsPagesScatter docs={indexingData.docs} />
                </ChartCard>

                <ChartCard
                  title="Tiempo de Procesamiento por Documento"
                  description="Distribución del tiempo total del pipeline de indexación con curva de páginas superpuesta."
                  height={420}
                  accent="violet"
                >
                  <ProcessingTimeChart docs={indexingData.docs} />
                </ChartCard>
              </div>

              {/* Nota */}
              <div className="p-6 bg-violet-50 border border-violet-100 rounded-3xl">
                <h4 className="text-xs font-black text-violet-700 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4" /> ENJAMBRE A — PIPELINE DE INDEXACIÓN (8 Agentes)
                </h4>
                <p className="text-sm text-violet-800 leading-relaxed font-medium">
                  OCR (Mistral) → Orchestrator → Vision (Pixtral+GPT-4o) → DiagramReasoner →
                  Chunker → Embedder → VectorScanner → Curioso (background).
                  Las métricas de herencia L1/L2/L3 son clave para evaluar la cobertura semántica del índice vectorial.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Panel 4 — Drawer detalle de run */}
      {selectedRun && (
        <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}
    </div>
  );
}

export default function ResultsPage() {
  const [user, setUser] = useState<{ role: string; isDevMode: boolean } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((u) => setUser(u))
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Validando Seguridad...</p>
      </div>
    );
  }

  const isAuditorDev = user?.role === "Auditor" && user?.isDevMode;

  if (!isAuditorDev) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center border-2 border-red-100 shadow-xl shadow-red-500/10">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Restringido</h1>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            Este módulo de visualización científico es exclusivo para el <span className="text-slate-900 font-bold">Rol Auditor</span> en <span className="text-violet-600 font-bold">Modo Desarrollador</span>.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => window.location.href = '/dashboard/home'}
            className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all active:scale-95 shadow-2xl"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>}>
      <ScenariosResultsContent />
    </Suspense>
  );
}


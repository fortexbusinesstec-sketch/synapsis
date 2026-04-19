'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    BarChart3, ChevronLeft, Loader2, Clock, DollarSign, Target, AlertCircle,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ScatterChart, Scatter, ZAxis, Cell, ReferenceLine,
} from 'recharts';

/* ── Tipos ────────────────────────────────────────────────────────────────── */
interface KpiRow {
    config_id: string;
    config_name: string;
    n_runs: number;
    avg_score_total: number | null;
    avg_score_correctness: number | null;
    avg_score_completeness: number | null;
    avg_total_ms: number | null;
    avg_cost_usd: number | null;
}

interface CategoryRow {
    config_id: string;
    question_category: string;
    n_runs: number;
    avg_score_total: number | null;
    avg_total_ms: number | null;
    avg_cost_usd: number | null;
}

interface ScatterRow {
    config_id: string;
    category: string;
    total_ms: number | null;
    cost_usd: number | null;
    score_total: number | null;
}

interface ApiPayload {
    kpis: KpiRow[];
    summary: CategoryRow[];
    scatter: ScatterRow[];
}

/* ── Constantes ───────────────────────────────────────────────────────────── */
const INDIVIDUAL_CONFIGS = ['B', 'D', 'config_bm25_bert', 'config_goms'];

const CONFIG_META: Record<string, { label: string; color: string; shortName: string }> = {
    'B': { label: 'Config B (MAS)', color: '#3b82f6', shortName: 'MAS' },
    'D': { label: 'Config D (RAG Base)', color: '#94a3b8', shortName: 'RAG' },
    'config_bm25_bert': { label: 'BM25 + BERT', color: '#f59e0b', shortName: 'BM25' },
    'config_goms': { label: 'GOMS (Humano)', color: '#10b981', shortName: 'GOMS' },
};

const CATEGORY_LABELS: Record<string, string> = {
    diagnostico_tecnico: 'Diagnóstico',
    ambigua: 'Ambigua',
    secuencial: 'Secuencial',
    enriquecimiento: 'Enriquecimiento',
    visual: 'Visual',
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmtMs(ms: number | null): string {
    if (ms == null) return '—';
    if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
    if (ms >= 1_000) return `${(ms / 1_000).toFixed(1)}s`;
    return `${ms.toFixed(0)}ms`;
}

function fmtScore(n: number | null): string {
    return n == null ? '—' : n.toFixed(2);
}

function fmtCost(usd: number | null): string {
    if (usd == null) return '—';
    if (usd >= 0.01) return `$${usd.toFixed(4)}`; // GOMS — cents / dollars range
    if (usd > 0) return `$${usd.toFixed(6)}`; // LLM — millicentss
    return '$0.00';
}

/* ── Gráfico 1: Precisión por Categoría ──────────────────────────────────── */
function PrecisionChart({ summary }: { summary: CategoryRow[] }) {
    const categories = [...new Set(summary.map(r => r.question_category))].sort();

    // Build [{ category: 'Ambigua', MAS: 1.8, RAG: 0.5, … }]
    const data = categories.map(cat => {
        const row: Record<string, any> = { category: CATEGORY_LABELS[cat] ?? cat };
        INDIVIDUAL_CONFIGS.forEach(cid => {
            const match = summary.find(r => r.config_id === cid && r.question_category === cat);
            row[CONFIG_META[cid]?.shortName ?? cid] = match?.avg_score_total != null
                ? Number(Number(match.avg_score_total).toFixed(3))
                : 0;
        });
        return row;
    });

    if (!data.length) return (
        <div className="flex items-center justify-center h-60 text-slate-400 text-sm italic">
            Sin datos por categoría — ¿se ejecutó el batch?
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 2]} tickCount={5} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    label={{ value: 'Score total (0–2)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 16 }} />
                {INDIVIDUAL_CONFIGS.map(cid => (
                    <Bar key={cid} dataKey={CONFIG_META[cid]?.shortName ?? cid}
                        fill={CONFIG_META[cid]?.color ?? '#94a3b8'} radius={[4, 4, 0, 0]} barSize={16} />
                ))}
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ── Gráfico 2: Latencia vs. Calidad (log X) ─────────────────────────────── */
function LatencyScatter({ scatter }: { scatter: ScatterRow[] }) {
    const valid = scatter.filter(r => r.total_ms != null && r.score_total != null && r.total_ms > 0);

    if (!valid.length) return (
        <div className="flex items-center justify-center h-60 text-slate-400 text-sm italic">Sin datos de latencia disponibles</div>
    );

    return (
        <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold text-right">Eje X en escala logarítmica</p>
            <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="x" type="number" scale="log" domain={['auto', 'auto']}
                        tickFormatter={(v: number) => fmtMs(v)}
                        tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                        label={{ value: 'Latencia (log)', position: 'insideBottom', offset: -10, style: { fontSize: 9, fill: '#94a3b8' } }} />
                    <YAxis dataKey="y" type="number" domain={[0, 2]}
                        tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                        label={{ value: 'Score Total', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#94a3b8' } }} />
                    <ZAxis range={[55, 55]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }}
                        formatter={((value: any, name?: any) => {
                            if (name === 'x') return [fmtMs(Number(value)), 'Latencia'];
                            return [Number(value).toFixed(2), 'Score'];
                        }) as any} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 700, paddingTop: 8 }} />
                    {INDIVIDUAL_CONFIGS.map(cid => (
                        <Scatter
                            key={cid}
                            name={CONFIG_META[cid]?.shortName ?? cid}
                            data={valid.filter(r => r.config_id === cid).map(r => ({ x: r.total_ms!, y: r.score_total! }))}
                            fill={CONFIG_META[cid]?.color ?? '#94a3b8'}
                            fillOpacity={0.65}
                        />
                    ))}
                    <ReferenceLine y={1.5} stroke="#ef4444" strokeDasharray="6 3"
                        label={{ value: 'Umbral', position: 'right', style: { fontSize: 9, fill: '#ef4444' } }} />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ── Gráfico 3: Costo por Config ─────────────────────────────────────────── */
function CostChart({ kpis }: { kpis: KpiRow[] }) {
    const data = INDIVIDUAL_CONFIGS.map(cid => {
        const row = kpis.find(k => k.config_id === cid);
        return {
            name: CONFIG_META[cid]?.shortName ?? cid,
            cid,
            cost: row?.avg_cost_usd != null ? Number(Number(row.avg_cost_usd).toFixed(6)) : 0,
            hasData: row?.avg_cost_usd != null,
        };
    });

    // Smart Y-axis: if any value > 0.01, use dollar scale; else millicentss
    const maxCost = Math.max(...data.map(d => d.cost));
    const useDollarScale = maxCost >= 0.01;

    const displayData = data.map(d => ({
        ...d,
        display: useDollarScale ? d.cost : d.cost * 1000,
    }));

    return (
        <ResponsiveContainer width="100%" height={280}>
            <BarChart data={displayData} layout="vertical" margin={{ top: 5, right: 90, left: 20, bottom: 5 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                    tickFormatter={(v: number) => useDollarScale ? `$${v.toFixed(4)}` : `${v.toFixed(2)}¢`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fontWeight: 700, fill: '#374151' }}
                    axisLine={false} tickLine={false} width={50} />
                <Tooltip
                    formatter={((v: any, _name?: any) => {
                        const raw = useDollarScale ? Number(v) : Number(v) / 1000;
                        return [fmtCost(raw), 'Costo avg/run'];
                    }) as any}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} />
                <Bar dataKey="display" radius={[0, 8, 8, 0]} barSize={30}
                    label={((props: any) => {
                        const { x, y, width, height, value, index } = props;
                        const d = displayData[index];
                        const text = d.hasData
                            ? (useDollarScale ? `$${Number(d.cost).toFixed(4)}` : `${(d.cost * 1000).toFixed(2)}¢`)
                            : 'N/A (sin costo)';
                        return (
                            <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle"
                                fontSize={10} fontWeight={700} fill="#475569">
                                {text}
                            </text>
                        );
                    }) as any}>
                    {displayData.map((entry, i) => (
                        <Cell key={i} fill={CONFIG_META[entry.cid]?.color ?? '#94a3b8'}
                            fillOpacity={entry.hasData ? 1 : 0.3} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}

/* ── KPI Card ─────────────────────────────────────────────────────────────── */
function KpiCard({ cid, kpi }: { cid: string; kpi: KpiRow | undefined }) {
    const meta = CONFIG_META[cid] ?? { label: cid, color: '#94a3b8', shortName: cid };
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color }} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{meta.shortName}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-tight">{meta.label}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-lg">
                    {kpi?.n_runs ?? 0} runs
                </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Score', value: fmtScore(kpi?.avg_score_total ?? null) },
                    { label: 'Latencia', value: fmtMs(kpi?.avg_total_ms ?? null) },
                    { label: 'Costo', value: fmtCost(kpi?.avg_cost_usd ?? null) },
                ].map(({ label, value }) => (
                    <div key={label} className="text-center bg-slate-50 rounded-xl py-2 px-1">
                        <p className="text-base font-black text-slate-800 leading-tight">{value}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Chart Wrapper ────────────────────────────────────────────────────────── */
function ChartSection({ title, description, icon: Icon, children }: {
    title: string; description: string; icon: any; children: React.ReactNode;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-5">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{title}</h3>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">{description}</p>
                </div>
            </div>
            {children}
        </div>
    );
}

import { Suspense } from 'react';

/* ── Página ───────────────────────────────────────────────────────────────── */
function IndividualResultsInner() {
    const searchParams = useSearchParams();
    const batch = searchParams.get('batch') ?? '';

    const [data, setData] = useState<ApiPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const url = `/api/ablation/individual/results?batch=${encodeURIComponent(batch)}`;
            const res = await fetch(url);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            setData(json as ApiPayload);
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setLoading(false);
        }
    }, [batch]);

    useEffect(() => { if (batch) load(); else setLoading(false); }, [batch, load]);

    const kpiByConfig = (cid: string) => data?.kpis.find(k => k.config_id === cid);
    const totalRuns = data?.kpis.reduce((s, k) => s + Number(k.n_runs), 0) ?? 0;

    return (
        <div className="space-y-6 min-h-screen bg-slate-50/50 p-6">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl p-7 shadow-sm border border-blue-100"
                style={{ background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 50%, #dbeafe 100%)' }}>
                <div className="absolute -right-10 -top-10 w-72 h-72 rounded-full bg-blue-200/25 blur-3xl pointer-events-none" />
                <div className="relative">
                    <Link href="/dashboard/ablation"
                        className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 mb-4 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Volver al Entorno
                    </Link>
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 border border-blue-200 text-blue-700 text-[10px] font-black tracking-widest uppercase">
                            <BarChart3 className="w-3.5 h-3.5" />
                            E. INDIVIDUAL — ZERO-SHOT
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800">Dashboard de Evaluación Individual</h1>
                        {batch && (
                            <p className="text-slate-500 text-sm">
                                Batch: <span className="font-mono font-bold text-slate-700">{batch}</span>
                                {totalRuns > 0 && <span className="ml-2 text-slate-400">({totalRuns} runs únicos)</span>}
                            </p>
                        )}
                        <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                            Comparativa de las 4 arquitecturas base: MAS (B), RAG puro (D), BM25+BERT y GOMS (Humano simulado). Solo se considera el run más reciente por pregunta.
                        </p>
                    </div>
                </div>
            </div>

            {/* No batch */}
            {!batch && (
                <div className="flex items-center gap-3 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Especifica un parámetro <code className="font-mono">?batch=nombre_del_batch</code> en la URL.
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-slate-200">
                    <Loader2 className="w-5 h-5 animate-spin mr-3 text-blue-500" />
                    <span className="text-slate-500 text-sm">Calculando métricas de evaluación individual…</span>
                </div>
            ) : data && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {INDIVIDUAL_CONFIGS.map(cid => (
                            <KpiCard key={cid} cid={cid} kpi={kpiByConfig(cid)} />
                        ))}
                    </div>

                    {/* Gráfico 1 — Precisión por categoría */}
                    <ChartSection
                        title="Precisión por Categoría"
                        description="Score total promedio agrupado por categoría de pregunta (escala 0–2). Solo el run más reciente por pregunta."
                        icon={Target}>
                        <PrecisionChart summary={data.summary} />
                    </ChartSection>

                    {/* Gráfico 2 — Latencia vs Calidad */}
                    <ChartSection
                        title="Eficiencia: Latencia vs. Calidad"
                        description="Eje X en escala logarítmica — permite comparar BM25 (<100ms) con GOMS (>600s) en el mismo gráfico."
                        icon={Clock}>
                        <LatencyScatter scatter={data.scatter} />
                    </ChartSection>

                    {/* Gráfico 3 — Viabilidad económica */}
                    <ChartSection
                        title="Viabilidad Económica"
                        description="Costo operativo promedio por run. GOMS incluye costo laboral humano (minutos × tarifa). Escala automática."
                        icon={DollarSign}>
                        <CostChart kpis={data.kpis} />
                    </ChartSection>
                </div>
            )}
        </div>
    );
}

export default function IndividualResultsPage() {
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
        <Suspense fallback={
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            </div>
        }>
            <IndividualResultsInner />
        </Suspense>
    );
}


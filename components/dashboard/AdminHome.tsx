
import Link from 'next/link';
import {
    FileCheck,
    Search,
    ChevronRight,
    MessageSquare,
    ShieldCheck,
    TrendingUp,
    BarChart3,
    Zap
} from 'lucide-react';

interface AdminHomeProps {
    stats: {
        resolvedToday: number;
        precisionRate: number;
        topModels: { model: string; count: number }[];
    }
}

export function AdminHome({ stats }: AdminHomeProps) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* ── HEADER / METRICAS DE VALOR ───────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-full">Hoy</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.resolvedToday}</p>
                        <p className="text-slate-500 text-sm font-medium mt-1">Nuevos documentos indexados</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-full">RAG Accuracy</span>
                    </div>
                    <div>
                        <p className="text-3xl font-black text-slate-800 tracking-tight">{stats.precisionRate}%</p>
                        <div className="flex items-center gap-2 mt-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                            <p className="text-slate-500 text-sm font-medium">Tasa de precisión técnica</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest bg-amber-50 px-2 py-1 rounded-full">Top Demanda</span>
                    </div>
                    <div className="space-y-2">
                        {stats.topModels.length > 0 ? stats.topModels.map((m, i) => (
                            <div key={i} className="flex items-center justify-between text-xs font-bold uppercase tracking-tight">
                                <span className="text-slate-500">{m.model || 'General'}</span>
                                <span className="text-slate-800">{m.count} manuales</span>
                            </div>
                        )) : <p className="text-slate-400 text-xs italic">Sin datos hoy</p>}
                    </div>
                </div>
            </div>

            {/* ── ONBOARDING / GUIA RAPIDA ─────────────────────────────────────── */}
            <div className="space-y-4">
                <h2 className="text-slate-900 font-bold text-xl tracking-tight ml-2">Asistente de Gestión Operativa</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* DOCUMENTACION (FORCED LIGHT) */}
                    <Link href="/dashboard/documentacion" className="group block bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-blue-500 transition-all relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform text-blue-600">
                            <FileCheck className="w-40 h-40" />
                        </div>
                        <div className="relative z-10 space-y-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                                <Search className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="text-slate-900">
                                <h3 className="text-xl font-black tracking-tight">Control de Documentación</h3>
                                <p className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">Verifica la calidad de la ingesta, gestiona la biblioteca digital y aprueba las recomendaciones del agente curador para mantener la base de conocimientos actualizada.</p>
                            </div>
                            <div className="pt-4 flex items-center gap-2 text-blue-600 text-[11px] font-black uppercase tracking-[0.1em]">
                                Acceder a Biblioteca Digital <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                    {/* SYNAPSIS GO (CONSISTENT LIGHT) */}
                    <Link href="/dashboard/go" className="group block bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-amber-500 transition-all relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:scale-125 transition-transform text-amber-600">
                            <Zap className="w-40 h-40" />
                        </div>
                        <div className="relative z-10 space-y-4 text-slate-900">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                                <Zap className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight">Synapsis Go</h3>
                                <p className="text-slate-500 text-sm mt-3 leading-relaxed font-medium">Accede al motor de chat multimodal para realizar consultas técnicas complejas, diagnosticar averías y visualizar diagramas extraídos con precisión asistida por IA.</p>
                            </div>
                            <div className="pt-4 flex items-center gap-2 text-amber-600 text-[11px] font-black uppercase tracking-[0.1em]">
                                Lanzar Aplicación <ChevronRight className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>

                </div>
            </div>
        </div>
    );
}

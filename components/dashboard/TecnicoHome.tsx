
import Link from 'next/link';
import {
    Zap,
    Layers,
    MousePointer2,
    MessageSquare,
    CheckCircle2,
    ChevronRight,
    Search,
    Cpu,
    FlaskConical
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function TecnicoHome({ prodExperiment = false }: { prodExperiment?: boolean }) {
    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 md:px-0">

            {/* ── HERO SECTION ────────────────────────────────────────────────── */}
            <div className="text-center space-y-3 pt-6 md:pt-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-black tracking-widest uppercase">
                    <Zap className="w-3 h-3 fill-blue-600/10" />
                    Soporte Experto en Campo
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                    Bienvenido a <span className="text-blue-600">Synapsis Go</span>
                </h1>
                <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto">
                    Tu asistente de diagnóstico predictivo diseñado para resolver averías de forma inmediata.
                </p>
            </div>

            {/* ── 3-STEP GUIDE ────────────────────────────────────────────────── */}
            <div className={cn(
                "grid grid-cols-1 gap-4 md:gap-6",
                prodExperiment ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"
            )}>

                {/* PASO 1 */}
                <div className="group bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all relative overflow-hidden text-center space-y-3 md:space-y-4">
                    <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                        <MousePointer2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-slate-900 font-bold text-sm md:text-base">1. Selecciona modelo</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Schindler <strong>3300</strong> o <strong>5500</strong> para base específica.
                        </p>
                    </div>
                </div>

                {/* PASO 2 */}
                <div className="group bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all relative overflow-hidden text-center space-y-3 md:space-y-4">
                    <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                        <Search className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-slate-900 font-bold text-sm md:text-base">2. Consulta la falla</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Usa texto, voz o fotos para interactuar con agentes.
                        </p>
                    </div>
                </div>

                {/* PASO 3 */}
                <div className="group bg-white p-5 md:p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all relative overflow-hidden text-center space-y-3 md:space-y-4">
                    <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-slate-900 font-bold text-sm md:text-base">3. Aplica solución</h3>
                        <p className="text-slate-400 text-xs leading-relaxed">
                            Diagramas y validación física listos para aplicar.
                        </p>
                    </div>
                </div>

                {/* EXPERIMENTO JUEZ (Condicional) */}
                {prodExperiment && (
                    <Link href="/dashboard/judge" className="group bg-gradient-to-br from-blue-600 to-blue-700 p-5 md:p-6 rounded-[2rem] border border-blue-500 shadow-xl shadow-blue-500/20 transition-all relative overflow-hidden text-center space-y-3 md:space-y-4 hover:scale-105 active:scale-95">
                        <div className="mx-auto w-12 h-12 bg-white/20 text-white rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                            <FlaskConical className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-white font-bold text-sm md:text-base">Experimento Juez</h3>
                            <p className="text-blue-100 text-xs leading-relaxed">
                                Evalúa la precisión del sistema mediante el modo jurado.
                            </p>
                        </div>
                    </Link>
                )}

            </div>

            {/* ── CALL TO ACTION ──────────────────────────────────────────────── */}
            <div className="flex flex-col items-center gap-6 pt-2 pb-10">
                <Link
                    href="/dashboard/go"
                    className="group relative inline-flex items-center gap-3 px-8 md:px-10 py-4 md:py-5 bg-blue-600 text-white rounded-[2rem] font-black text-sm md:text-base shadow-2xl shadow-blue-600/20 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95"
                >
                    <Zap className="w-5 h-5 md:w-5 md:h-5 text-white fill-white/20 group-hover:animate-pulse" />
                    Iniciar Diagnóstico
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] px-6 text-center">
                    <span className="flex items-center gap-1.5">
                        <Cpu className="w-3 h-3" />
                        MAS Activo
                    </span>
                    <span className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3" />
                        Knowledge
                    </span>
                    <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3 h-3" />
                        24/7 Support
                    </span>
                </div>
            </div>
        </div>
    );
}

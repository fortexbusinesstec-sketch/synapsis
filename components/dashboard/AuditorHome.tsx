"use client";

import Link from 'next/link';
import {
    FileText,
    Zap,
    ChevronRight,
    Search,
    Info,
    MessageSquare,
    UploadCloud,
    Clock,

    Activity,
    BarChart3,
    Layers,
    Images,
    BookOpen,
    RefreshCw
} from 'lucide-react';
interface AuditorStats {
    totalDocuments: number;
    totalChunks: number;
    totalImages: number;
    totalEnrich: number;
}

export function AuditorHome({ isDevMode = false, stats }: { isDevMode?: boolean; stats?: AuditorStats }) {
    return (
        <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── SECCIÓN 1: HERO / GUÍA DE AUDITORÍA ──────────────────────────── */}
            <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] bg-white border border-blue-100 shadow-2xl shadow-blue-600/5">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />

                <div className="p-5 sm:p-8 lg:p-12">
                    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 items-start">
                        <div className="flex-1 space-y-5 lg:space-y-6">
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
                                    <Search className="w-3 h-3" />
                                    Guía de Auditoría por Demanda
                                </div>
                                {isDevMode && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-white text-[9px] sm:text-[10px] font-black tracking-widest uppercase animate-pulse">
                                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        Modo Desarrollador Activo
                                    </div>
                                )}
                            </div>

                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                                ¿Cómo auditar el <span className="text-blue-600">Corpus Digital?</span>
                            </h1>

                            <p className="text-xs sm:text-sm lg:text-base text-slate-500 font-medium leading-relaxed max-w-xl">
                                Su función es validar que el conocimiento extraído de los manuales de Schindler sea exacto y útil para los técnicos en campo. Siga este flujo optimizado:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 sm:pt-4">
                                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200 hover:shadow-sm">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm">
                                        <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-tight">PASO 1: Implementar</h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-relaxed">Suba el manual (uno a la vez) en el módulo de Biblioteca Digital.</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200 hover:shadow-sm">
                                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 text-amber-600 shadow-sm">
                                        <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-[10px] sm:text-xs font-black text-slate-800 uppercase tracking-tight">PASO 2: Auditoría</h4>
                                        <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-relaxed">Revise el Pipeline, verifique los Chunks y cure las Imágenes Técnicas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </section>

            {/* ── SECCIÓN 2: MÉTRICAS CLAVE ────────────────────────────────────── */}
            {stats && (
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                        <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex-shrink-0">
                            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">{stats.totalDocuments}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Manuales</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                        <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
                            <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">{stats.totalChunks.toLocaleString()}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Fragmentos</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                        <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                            <Images className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">{stats.totalImages.toLocaleString()}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Imágenes Técnicas</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-md transition-shadow">
                        <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex-shrink-0">
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 tracking-tight">{stats.totalEnrich.toLocaleString()}</p>
                            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Verificaciones</p>
                        </div>
                    </div>
                </section>
            )}

            {/* ── SECCIÓN 3: REFINAMIENTO Y APRENDIZAJE ─────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                <div className="lg:col-span-2 bg-slate-900 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 sm:p-8 opacity-10 group-hover:scale-110 transition-transform pointer-events-none">
                        <Zap className="w-24 h-24 sm:w-32 sm:h-32 lg:w-40 lg:h-40" />
                    </div>

                    <div className="relative z-10 space-y-4 sm:space-y-6">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[9px] sm:text-[10px] font-black tracking-widest uppercase">
                            <Info className="w-3 h-3" />
                            Ciclo de Refinamiento de Conocimiento
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Modelo de Aprendizaje <span className="text-blue-400">Synapsis</span></h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pt-2 sm:pt-4">
                            <div className="space-y-2 sm:space-y-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/5">
                                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">Resolución de Dudas</h3>
                                <p className="text-[12px] sm:text-[13px] text-slate-400 leading-relaxed font-medium">
                                    El modelo puede tener dudas sobre manuales o imágenes complejas. <span className="text-white">Su función primordial es responder y validar</span> estas inconsistencias para asegurar un diagnóstico preciso.
                                </p>
                            </div>

                            <div className="space-y-2 sm:space-y-3">
                                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/5">
                                    <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider">Tiempos de Procesamiento</h3>
                                <p className="text-[12px] sm:text-[13px] text-slate-400 leading-relaxed font-medium">
                                    Al subir Información Manual, las preguntas son <span className="text-white">instantáneas</span>. Para imágenes técnicas, el procesamiento masivo puede tardar <span className="text-white">unos minutos</span> según el volumen de archivos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <Link
                    href="/dashboard/go"
                    className="bg-amber-50 rounded-2xl sm:rounded-3xl lg:rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-amber-200 flex flex-col group hover:shadow-2xl hover:border-amber-400 transition-all"
                >
                    <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm mb-6 sm:mb-8 group-hover:scale-110 transition-transform">
                        <Zap className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-amber-600 fill-amber-600/10" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-3 sm:mb-4">Validación en <span className="text-amber-600">Synapsis Go</span></h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed mb-6 sm:mb-8 flex-1">
                        Interactúe con el Comité de Agentes para verificar cómo el sistema responde a fallas reales usando el conocimiento auditado.
                    </p>

                    <div className="flex items-center gap-2 text-amber-700 font-black text-[10px] sm:text-xs uppercase tracking-widest pt-4 sm:pt-6 border-t border-amber-200 group-hover:gap-4 transition-all">
                        Lanzar Comité <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                </Link>
            </section>

            {/* ── SECCIÓN 4: ACCIONES DIRECTAS ──────────────────────────────────── */}
            <section>
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight mb-4 sm:mb-6 ml-1">Acciones Rápidas</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                    <Link
                        href="/dashboard/documentacion"
                        className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h4 className="font-black text-slate-800 text-[10px] sm:text-xs uppercase tracking-tight mb-1">Subir Manual</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-relaxed">Implementa el corpus base para el modelo RAG.</p>
                    </Link>

                    <Link
                        href="/dashboard/documentacion"
                        className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all group"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h4 className="font-black text-slate-800 text-[10px] sm:text-xs uppercase tracking-tight mb-1">Revisar Pipeline</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-relaxed">Verifica el estado de procesamiento de documentos.</p>
                    </Link>

                    <Link
                        href="/dashboard/go"
                        className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all group"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h4 className="font-black text-slate-800 text-[10px] sm:text-xs uppercase tracking-tight mb-1">Consultar Agentes</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-relaxed">Valida respuestas con el Comité de Agentes IA.</p>
                    </Link>

                    <Link
                        href="/dashboard/documentacion"
                        className="p-4 sm:p-5 lg:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group"
                    >
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <h4 className="font-black text-slate-800 text-[10px] sm:text-xs uppercase tracking-tight mb-1">Curar Imágenes</h4>
                        <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-relaxed">Revisa y cura las imágenes técnicas extraídas.</p>
                    </Link>
                </div>
            </section>

        </div>
    );
}

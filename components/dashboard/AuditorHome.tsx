
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
    ShieldCheck,
    Activity
} from 'lucide-react';
import { cn } from "@/lib/utils";

export function AuditorHome({ isDevMode = false }: { isDevMode?: boolean }) {
    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── SECCIÓN 1: AUDITORÍA POR DEMANDA (TUTORIAL HERO) ──────────────── */}
            <section className="relative overflow-hidden rounded-[2.5rem] bg-white border border-blue-100 shadow-2xl shadow-blue-600/5">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />

                <div className="p-8 md:p-12">
                    <div className="flex flex-col md:flex-row gap-10 items-start">
                        <div className="flex-1 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[10px] font-black tracking-widest uppercase">
                                    <Search className="w-3 h-3" />
                                    Guía de Auditoría por Demanda
                                </div>
                                {isDevMode && (
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                                        <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        Modo Desarrollador Activo
                                    </div>
                                )}
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-none">
                                ¿Cómo auditar el <span className="text-blue-600">Corpus Digital?</span>
                            </h1>

                            <p className="text-slate-500 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                                Su función es validar que el conocimiento extraído de los manuales de Schindler sea exacto y útil para los técnicos en campo. Siga este flujo optimizado:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                                <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 text-blue-600 shadow-sm">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">PASO 1: Ingesta</h4>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Suba el manual (uno a la vez) en el módulo de Biblioteca Digital.</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200">
                                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center flex-shrink-0 text-amber-600 shadow-sm">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">PASO 2: Auditoría</h4>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">Revise el Pipeline, verifique los Chunks y cure las Imágenes Técnicas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="w-full md:w-80 bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-600/30">
                            <div className="flex items-center gap-3 mb-6">
                                <ShieldCheck className="w-6 h-6 text-blue-200" />
                                <span className="text-xs font-black uppercase tracking-widest">Estado del Auditor</span>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-sm">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Capacidad de Carga</p>
                                    <p className="text-xl font-bold">1 Documento Activo</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-white/10 border border-white/5 backdrop-blur-sm">
                                    <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-1">Nivel de Acceso</p>
                                    <p className="text-xl font-bold">Verificación Expert</p>
                                </div>
                            </div>
                            <Link
                                href="/dashboard/documentacion"
                                className="mt-8 w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-105 transition-transform active:scale-95 shadow-lg"
                            >
                                Ir a Biblioteca <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECCIÓN 2: REFINAMIENTO Y APRENDIZAJE ─────────────────────────── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Bloque de Información de Refinamiento */}
                <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap className="w-40 h-40" />
                    </div>

                    <div className="relative z-10 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black tracking-widest uppercase">
                            <Info className="w-3 h-3" />
                            Ciclo de Refinamiento de Conocimiento
                        </div>

                        <h2 className="text-3xl font-black tracking-tight">Modelo de Aprendizaje <span className="text-blue-400">Synapsis</span></h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400 border border-white/5">
                                    <MessageSquare className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-wider">Resolución de Dudas</h3>
                                <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                                    El modelo puede tener dudas sobre manuales o imágenes complejas. <span className="text-white">Su función primordial es responder y validar</span> estas inconsistencias para asegurar un diagnóstico preciso.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 border border-white/5">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-wider">Tiempos de Procesamiento</h3>
                                <p className="text-[13px] text-slate-400 leading-relaxed font-medium">
                                    Al subir Información Manual, las preguntas son <span className="text-white">instantáneas</span>. Para imágenes técnicas, el procesamiento masivo puede tardar <span className="text-white">unos minutos</span> según el volumen de archivos.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acceso Rápido a Synapsis Go */}
                <Link
                    href="/dashboard/go"
                    className="bg-amber-50 rounded-[2.5rem] p-10 border border-amber-200 flex flex-col group hover:shadow-2xl hover:border-amber-400 transition-all"
                >
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm mb-8 group-hover:scale-110 transition-transform">
                        <Zap className="w-8 h-8 text-amber-600 fill-amber-600/10" />
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Validación en <span className="text-amber-600">Synapsis Go</span></h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 flex-1">
                        Interactúe con el Comité de Agentes para verificar cómo el sistema responde a fallas reales usando el conocimiento auditado.
                    </p>

                    <div className="flex items-center gap-2 text-amber-700 font-black text-xs uppercase tracking-widest pt-4 border-t border-amber-200 group-hover:gap-4 transition-all">
                        Lanzar Comité <ChevronRight className="w-5 h-5" />
                    </div>
                </Link>
            </section>

            {/* ── SECCIÓN 3: ACCIONES DIRECTAS ──────────────────────────────────── */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/dashboard/documentacion" className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all group">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight mb-1">Subir Manual</h4>
                    <p className="text-[11px] text-slate-500 font-medium">Ingesta el corpus base para el modelo RAG.</p>
                </Link>

                {/* Repetir o añadir otros bloques si es necesario */}
            </section>

        </div>
    );
}

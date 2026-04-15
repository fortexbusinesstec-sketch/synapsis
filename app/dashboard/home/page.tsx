import Link from 'next/link';
import { count, countDistinct, eq } from 'drizzle-orm';
import {
  FileText,
  ArrowUpFromLine,
  Settings,
  ChevronRight,
  Zap,
  Cpu,
  Activity,
  Boxes,
  Layers,
  Images,
} from 'lucide-react';

import { db } from '@/lib/db';
import { documents, documentChunks, extractedImages, enrichments } from '@/lib/db/schema';

/* ────────────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  // ── Fetch dynamic stats ───────────────────────────────────────────────────
  const [totalModelsRes, readyModelsRes, totalDocsRes, totalImagesRes, totalChunksRes, totalEnrichRes] = await Promise.all([
    db.select({ count: countDistinct(documents.equipmentModel) }).from(documents),
    db.select({ count: countDistinct(documents.equipmentModel) }).from(documents).where(eq(documents.status, 'ready')),
    db.select({ count: count() }).from(documents),
    db.select({ count: count() }).from(extractedImages),
    db.select({ count: count() }).from(documentChunks),
    db.select({ count: count() }).from(enrichments).where(eq(enrichments.isVerified, 1)),
  ]);

  const totalModels = totalModelsRes[0]?.count ?? 0;
  const readyModels = readyModelsRes[0]?.count ?? 0;
  const totalDocs = totalDocsRes[0]?.count ?? 0;
  const totalImages = totalImagesRes[0]?.count ?? 0;
  const totalChunks = totalChunksRes[0]?.count ?? 0;
  const totalEnrich = totalEnrichRes[0]?.count ?? 0;

  return (
    <div className="space-y-8">

      {/* ── Hero section ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl p-8 shadow-sm border border-sky-100"
        style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e0f3ff 50%, #bae6fd 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-sky-200/40 to-transparent pointer-events-none" />
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-blue-300/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-48 h-48 rounded-full bg-cyan-200/30 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 border border-sky-200 text-sky-600 text-xs font-bold tracking-wider uppercase">
              <Activity className="w-3.5 h-3.5" />
              SISTEMA OPERATIVO ACTIVO
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight text-slate-800">
              Bienvenido a <span className="text-blue-600">Synapsis</span>
            </h1>
            <p className="text-slate-500 text-sm md:text-base leading-relaxed">
              El cerebro digital para el transporte vertical de Schindler.
              Orquestación de agentes IA, análisis multimodal y diagnóstico predictivo en un solo lugar.
            </p>
          </div>

          <div className="flex-shrink-0 p-4 bg-white/60 rounded-2xl border border-sky-200/60 backdrop-blur-sm shadow-sm">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Modelos</p>
                <p className="text-xl font-bold text-slate-800">{totalModels}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Estado</p>
                <p className="text-xl font-bold text-emerald-500">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Modules ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* 1. CONTROL DE DOCUMENTACIÓN */}
        <Link
          href="/dashboard/documentacion"
          className="group relative bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 flex flex-col overflow-hidden"
        >
          {/* Subtle bg pattern */}
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Boxes className="w-32 h-32" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="relative w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7 text-blue-600" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                <ArrowUpFromLine className="w-3 h-3 text-white" />
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Producción
            </span>
          </div>

          <h2 className="text-slate-900 font-bold text-xl mb-2">
            Control de Documentación
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed flex-1">
            Pipeline de <strong>7 agentes</strong> (Mistral OCR + Pixtral Vision + VectorScanner).
            Extracción técnica de alta resolución con vectorización de diagramas y esquemas.
          </p>

          <div className="mt-8 flex items-center text-blue-600 text-sm font-bold gap-1 group-hover:gap-2 transition-all">
            Abrir Módulo de RAG <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

        {/* 2. SYNAPSIS GO */}
        <Link
          href="/dashboard/go"
          className="group relative bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 flex flex-col overflow-hidden"
        >
          {/* Subtle bg pattern */}
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <Zap className="w-32 h-32" />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div className="relative w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shadow-sm group-hover:scale-110 transition-transform">
              <Zap className="w-7 h-7 text-amber-600 fill-amber-600/10" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
              Producción
            </span>
          </div>

          <h2 className="text-slate-900 font-bold text-xl mb-2">
            Synapsis Go
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed flex-1">
            Comité de <strong>6 agentes</strong> (Bibliotecario, Analista, Ingeniero Jefe).
            Diagnóstico predictivo multimodal y acceso inmediato al conocimiento experto verificado.
          </p>

          <div className="mt-8 flex items-center text-amber-700 text-sm font-bold gap-1 group-hover:gap-2 transition-all">
            Lanzar Synapsis Go <ChevronRight className="w-4 h-4" />
          </div>
        </Link>

      </div>

      {/* ── Quick Stats ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Cpu, label: "IA Orquestada", value: "GPT-4o, Pixtral, Mistral, Embed-3", color: "text-blue-600" },
          { icon: Settings, label: "Infraestructura", value: "Turso Vector / Cloudflare R2", color: "text-slate-600" },
          { icon: Layers, label: "Base de Conocimiento", value: `${totalChunks.toLocaleString()} Fragmentos / ${totalEnrich} Expertos`, color: "text-purple-600" },
          { icon: Images, label: "Multimodalidad", value: `${totalImages.toLocaleString()} Imágenes Técnicas`, color: "text-emerald-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
            <div className={cn("p-2.5 rounded-2xl bg-slate-50 border border-slate-100", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-xs font-bold text-slate-700 truncate leading-tight mt-0.5">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Utility to merge classnames
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}

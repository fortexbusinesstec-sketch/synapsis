"use client";

import { useState, useRef, useCallback } from "react";
import {
  Download,
  ImageDown,
  FileJson,
  Copy,
  Check,
  Palette,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToPng, exportToSvg, exportToPng300dpi } from "@/components/graphics/export-utils";
import GraphicsCanvas from "@/components/graphics/GraphicsCanvas";
import ArchitectureDiagram from "@/components/graphics/templates/ArchitectureDiagram";
import PipelineDiagram from "@/components/graphics/templates/PipelineDiagram";
import BlankCanvas from "@/components/graphics/templates/BlankCanvas";
import GraphicalAbstract from "@/components/graphics/templates/GraphicalAbstract";

type TemplateId = "architecture" | "pipeline" | "blank" | "graphical-abstract";

interface Template {
  id: TemplateId;
  label: string;
  description: string;
  width: number;
  height: number;
}

const TEMPLATES: Template[] = [
  { id: "graphical-abstract", label: "Graphical Abstract", description: "1328×531 · Journal TOC graphic (2.5:1)", width: 1328, height: 531 },
  { id: "architecture", label: "System Architecture", description: "Full MAS architecture", width: 1200, height: 800 },
  { id: "pipeline", label: "Agent Pipelines", description: "Dual pipeline diagram", width: 1200, height: 800 },
  { id: "blank", label: "Blank Canvas", description: "Build from scratch", width: 800, height: 600 },
];

const COLOR_PRESETS = [
  { name: "Blue", primary: "#2563eb", secondary: "#dc2626" },
  { name: "Emerald", primary: "#059669", secondary: "#7c3aed" },
  { name: "Amber", primary: "#d97706", secondary: "#dc2626" },
  { name: "Violet", primary: "#7c3aed", secondary: "#059669" },
  { name: "Rose", primary: "#e11d48", secondary: "#2563eb" },
  { name: "Slate", primary: "#475569", secondary: "#dc2626" },
];

export default function GraphicsPage() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("architecture");
  const canvasRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "png300" | "svg" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [colorScheme, setColorScheme] = useState(COLOR_PRESETS[0]);

  const template = TEMPLATES.find((t) => t.id === activeTemplate)!;

  const getCanvasElement = useCallback(() => {
    if (!canvasRef.current) return null;
    return canvasRef.current.querySelector("[data-canvas]") as HTMLElement | null;
  }, []);

  const handleExport = async (format: "png" | "png300" | "svg") => {
    const el = getCanvasElement();
    if (!el) { setExportError("Canvas element not found"); return; }
    setExportError(null);
    setExporting(format);
    try {
      if (format === "svg") await exportToSvg(el, { filename: `synapsis-${activeTemplate}` });
      else if (format === "png300") await exportToPng300dpi(el, { filename: `synapsis-${activeTemplate}` });
      else await exportToPng(el, { filename: `synapsis-${activeTemplate}`, pixelRatio: 2 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportError(msg);
      console.error("Export failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleCopySvg = async () => {
    const el = getCanvasElement();
    if (!el) return;
    const svgData = el.querySelector("svg");
    if (!svgData) return;
    try {
      const code = new XMLSerializer().serializeToString(svgData);
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setExportError("Failed to copy SVG");
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white fill-white/20" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Graphics Studio
              </h1>
              <p className="text-sm text-slate-500">
                Publication-quality diagrams · Export SVG / PNG 300 DPI
              </p>
            </div>
          </div>
        </div>

        {/* Template Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTemplate(t.id)}
              className={cn(
                "text-left p-4 rounded-2xl border transition-all",
                activeTemplate === t.id
                  ? "bg-blue-50 border-blue-300 shadow-md"
                  : "bg-white border-slate-200 hover:border-slate-300"
              )}
            >
              <p className="font-bold text-sm text-slate-900">{t.label}</p>
              <p className="text-xs text-slate-400">{t.width}×{t.height}px · {t.description}</p>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-400" />
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.name}
                onClick={() => setColorScheme(c)}
                className={cn(
                  "w-7 h-7 rounded-lg border-2 transition-all",
                  colorScheme.name === c.name
                    ? "border-slate-900 ring-2 ring-slate-200 scale-110"
                    : "border-transparent hover:border-slate-300"
                )}
                style={{ backgroundColor: c.primary }}
                title={c.name}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySvg}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                copied
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                  : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy SVG</>}
            </button>
            <button
              onClick={() => handleExport("svg")}
              disabled={exporting === "svg"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <FileJson className="w-3.5 h-3.5" /> SVG
            </button>
            <button
              onClick={() => handleExport("png")}
              disabled={exporting === "png"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
            >
              <ImageDown className="w-3.5 h-3.5" /> PNG
            </button>
            <button
              onClick={() => handleExport("png300")}
              disabled={exporting === "png300"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" /> Export 300 DPI
            </button>
          </div>
        </div>

        {/* Error */}
        {exportError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <span>Export failed: {exportError}</span>
            <button onClick={() => setExportError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}

        {/* Canvas */}
        <div ref={canvasRef}>
          <GraphicsCanvas width={template.width} height={template.height} label={template.label}>
            {activeTemplate === "architecture" && (
              <ArchitectureDiagram primaryColor={colorScheme.primary} secondaryColor={colorScheme.secondary} />
            )}
            {activeTemplate === "pipeline" && (
              <PipelineDiagram primaryColor={colorScheme.primary} />
            )}
            {activeTemplate === "blank" && <BlankCanvas />}
            {activeTemplate === "graphical-abstract" && (
              <GraphicalAbstract primaryColor={colorScheme.primary} />
            )}
          </GraphicsCanvas>
        </div>
      </div>
    </div>
  );
}

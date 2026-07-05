"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Download,
  ImageDown,
  FileJson,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Ruler,
  Check,
  Copy,
  Palette,
  RotateCcw,
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
  icon: string;
}

const TEMPLATES: Template[] = [
  {
    id: "graphical-abstract",
    label: "Graphical Abstract",
    description: "1328×531 · Journal TOC graphic (2.5:1 aspect)",
    width: 1328,
    height: 531,
    icon: "🎯",
  },
  {
    id: "architecture",
    label: "System Architecture",
    description: "Full MAS architecture with Indexing Swarm, Conversational Swarm, and Infrastructure",
    width: 1200,
    height: 920,
    icon: "🏗️",
  },
  {
    id: "pipeline",
    label: "Agent Pipelines",
    description: "Dual pipeline diagram showing Indexing and Conversational swarms",
    width: 1200,
    height: 800,
    icon: "🔁",
  },
  {
    id: "blank",
    label: "Blank Canvas",
    description: "Empty canvas with grid — build your own diagram from scratch",
    width: 800,
    height: 600,
    icon: "⬜",
  },
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
    const el = canvasRef.current.querySelector("[data-canvas]") as HTMLElement | null;
    return el;
  }, []);

  const handleExportPng = async () => {
    const el = getCanvasElement();
    if (!el) { setExportError("Canvas element not found"); return; }
    setExportError(null);
    setExporting("png");
    try {
      await exportToPng(el, { filename: `synapsis-${activeTemplate}`, pixelRatio: 2 });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      console.error("Export PNG failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPng300dpi = async () => {
    const el = getCanvasElement();
    if (!el) { setExportError("Canvas element not found"); return; }
    setExportError(null);
    setExporting("png300");
    try {
      await exportToPng300dpi(el, { filename: `synapsis-${activeTemplate}` });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      console.error("Export 300DPI failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportSvg = async () => {
    const el = getCanvasElement();
    if (!el) { setExportError("Canvas element not found"); return; }
    setExportError(null);
    setExporting("svg");
    try {
      await exportToSvg(el, { filename: `synapsis-${activeTemplate}` });
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      console.error("Export SVG failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleCopySvg = async () => {
    const el = getCanvasElement();
    if (!el) return;
    try {
      const svgData = el.querySelector("svg");
      if (svgData) {
        const code = new XMLSerializer().serializeToString(svgData);
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleExportPng();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Graphics Studio
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Design and export publication-quality diagrams and graphical abstracts
          </p>
        </div>
      </div>

      {/* Template Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTemplate(t.id)}
            className={cn(
              "text-left p-4 rounded-2xl border transition-all duration-200",
              activeTemplate === t.id
                ? "bg-blue-50 border-blue-300 shadow-md shadow-blue-100"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <p className="font-bold text-sm text-slate-900">{t.label}</p>
                <p className="text-xs text-slate-400 font-medium">
                  {t.width} × {t.height}px
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.description}
            </p>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-1">
            Colors
          </span>
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
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-1">
            <Ruler className="w-3.5 h-3.5 inline mr-1" />
            {template.width}×{template.height}
          </span>

          <div className="h-6 w-px bg-slate-200 mx-1" />

          <button
            onClick={handleCopySvg}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
              copied
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100"
            )}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy SVG
              </>
            )}
          </button>

          <button
            onClick={handleExportSvg}
            disabled={exporting === "svg"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <FileJson className="w-3.5 h-3.5" />
            {exporting === "svg" ? "Exporting..." : "SVG"}
          </button>

          <button
            onClick={handleExportPng}
            disabled={exporting === "png"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            <ImageDown className="w-3.5 h-3.5" />
            {exporting === "png" ? "Exporting..." : "PNG"}
          </button>

          <button
            onClick={handleExportPng300dpi}
            disabled={exporting === "png300"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === "png300" ? "Exporting..." : "PNG 300 DPI"}
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
        <GraphicsCanvas
          width={template.width}
          height={template.height}
          label={template.label}
        >
          {activeTemplate === "architecture" && (
            <ArchitectureDiagram
              primaryColor={colorScheme.primary}
            />
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

      {/* Footer info */}
      <div className="text-center text-[10px] text-slate-400 font-medium">
        <p>
          Press <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-mono text-[10px] border border-slate-200">⌘S</kbd> to
          quickly export as PNG · All exports are rendered from the DOM at full resolution
        </p>
      </div>
    </div>
  );
}

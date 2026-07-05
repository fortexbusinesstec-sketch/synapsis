"use client";

import { useRef, useState, useCallback } from "react";
import {
  Download,
  FileJson,
  ImageDown,
  Copy,
  Check,
  EyeOff,
  Eye,
  LayoutDashboard,
  GitBranch,
  BarChart3,
  Clock,
  DollarSign,
  Grid3x3,
  Activity,
  Users,
  Bug,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportToPng, exportToSvg, exportToPng300dpi, exportToPng600dpi } from "@/components/graphics/export-utils";
import Figure1Architecture from "@/components/graphics/figures/Figure1Architecture";
import Figure2Pipeline from "@/components/graphics/figures/Figure2Pipeline";
import Figure3Ablation from "@/components/graphics/figures/Figure3Ablation";
import Figure4Latency from "@/components/graphics/figures/Figure4Latency";
import Figure5Cost from "@/components/graphics/figures/Figure5Cost";
import Figure6Confusion from "@/components/graphics/figures/Figure6Confusion";
import Figure7CostPie from "@/components/graphics/figures/Figure7CostPie";
import Figure8Scatter from "@/components/graphics/figures/Figure8Scatter";
import Figure9ErrorAnalysis from "@/components/graphics/figures/Figure9ErrorAnalysis";
import Figure10Methodology from "@/components/graphics/figures/Figure10Methodology";

interface FigureDef {
  id: string;
  label: string;
  caption: string;
  icon: React.ElementType;
  component: React.ElementType;
}

const FIGURES: FigureDef[] = [
  {
    id: "fig1",
    label: "Fig 1",
    caption: "A.2 architecture of the multi-agent diagnostic platform: Clarifier → Semantic Router → ReAct Loop (Planner, Librarian, Ctx. Sel., Analyst) → Chief Engineer → Verifier → Validated Response.",
    icon: LayoutDashboard,
    component: Figure1Architecture,
  },
  {
    id: "fig2",
    label: "Fig 2",
    caption: "Multimodal dataset preprocessing pipeline: OCR extraction, semantic chunking, and HITL validation before vector storage.",
    icon: GitBranch,
    component: Figure2Pipeline,
  },
  {
    id: "fig3",
    label: "Fig 3",
    caption: "Multimodal indexing pipeline: textual extraction → semantic processing → quality control & enrichment → vector knowledge base (Turso/LibSQL) with HITL feedback loops.",
    icon: BarChart3,
    component: Figure3Ablation,
  },
  {
    id: "fig4",
    label: "Fig 4",
    caption: "Indexing swarm information flow — sequence diagram showing document processing from ingestion through OCR, vision analysis, chunking, embedding, HITL quality assurance, curiosity-driven enrichment, and vector database storage.",
    icon: Clock,
    component: Figure4Latency,
  },
  {
    id: "fig5",
    label: "Fig 5",
    caption: "Distribution of semantic chunk types — horizontal bar chart showing the proportion of each chunk category (table, text, specification, warning, procedure) in the indexed knowledge base.",
    icon: DollarSign,
    component: Figure5Cost,
  },
  {
    id: "fig6",
    label: "Fig 6",
    caption: "Token count distribution per semantic chunk — histogram of 3,070 chunks with median (148), mean (195), and target chunk size (500) annotated.",
    icon: Grid3x3,
    component: Figure6Confusion,
  },
  {
    id: "fig7",
    label: "Fig 7",
    caption: "",
    icon: Activity,
    component: Figure7CostPie,
  },
  {
    id: "fig8",
    label: "Fig 8",
    caption: "Processing time vs. page count for 16 indexed documents. Linear regression (grey line) with Spearman's \u03C1 = 0.996, p < 0.001.",
    icon: Users,
    component: Figure8Scatter,
  },
  {
    id: "fig9",
    label: "Fig 9",
    caption: "Error analysis — failure mode categorization and Pareto distribution.",
    icon: Bug,
    component: Figure9ErrorAnalysis,
  },
  {
    id: "fig10",
    label: "Fig 10",
    caption: "Experimental methodology and evaluation framework overview.",
    icon: FlaskConical,
    component: Figure10Methodology,
  },
];

export default function GraficosPage() {
  const [activeFigure, setActiveFigure] = useState<string>("fig1");
  const svgRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"png" | "png300" | "png600" | "svg" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [colorblind, setColorblind] = useState(false);

  const current = FIGURES.find((f) => f.id === activeFigure)!;
  const FigureComponent = current.component;

  const getSvgElement = useCallback(() => {
    if (!svgRef.current) return null;
    return svgRef.current.querySelector("svg") as HTMLElement | null;
  }, []);

  const getCanvasElement = useCallback(() => {
    if (!svgRef.current) return null;
    return svgRef.current.querySelector("[data-canvas], svg")?.parentElement as HTMLElement | null;
  }, []);

  const handleExport = async (format: "png" | "png300" | "png600" | "svg") => {
    const el = getSvgElement();
    if (!el) { setExportError("SVG element not found"); return; }
    setExportError(null);
    setExporting(format);
    try {
      const el = getSvgElement()!;
      const isFig3 = current.id === "fig3";
      const label = isFig3 ? "Fig1_Indexing_Pipeline" : `synapsis-${current.id}`;
      if (format === "svg") await exportToSvg(el, { filename: label });
      else if (format === "png300") await exportToPng300dpi(el, { filename: label });
      else if (format === "png600") await exportToPng600dpi(el, { filename: label });
      else await exportToPng(el, { filename: label, pixelRatio: 2 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setExportError(msg);
      console.error("Export failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleCopySvg = async () => {
    const el = getSvgElement();
    if (!el) return;
    try {
      const code = new XMLSerializer().serializeToString(el);
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setExportError("Failed to copy SVG");
      console.error("Copy failed:", e);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scientific Figures
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publication-ready diagrams for journal submission
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {FIGURES.map((fig) => {
            const Icon = fig.icon;
            const isActive = activeFigure === fig.id;
            return (
              <button
                key={fig.id}
                onClick={() => setActiveFigure(fig.id)}
                className={cn(
                  "flex items-center gap-2 px-5 py-4 text-xs font-black tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap",
                  isActive
                    ? "text-blue-600 border-blue-600 bg-white"
                    : "text-slate-400 border-transparent hover:text-slate-600 hover:bg-slate-50"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400")} />
                {fig.label}
              </button>
            );
          })}
        </div>

        {/* Figure caption */}
        <div className="border-b border-slate-200 pb-3">
          <p className="text-sm font-bold text-slate-800">
            {current.label}. {current.caption}
          </p>
        </div>

        {/* Error display */}
        {exportError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <span>Export failed: {exportError}</span>
            <button onClick={() => setExportError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => setColorblind((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all",
              colorblind
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {colorblind ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {colorblind ? "Colorblind ON" : "Simulate Colorblindness"}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySvg}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                copied
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy SVG"}
            </button>
            <button
              onClick={() => handleExport("svg")}
              disabled={exporting === "svg"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <FileJson className="w-3.5 h-3.5" />
              {exporting === "svg" ? "Exporting..." : "SVG"}
            </button>
            <button
              onClick={() => handleExport("png")}
              disabled={exporting === "png"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <ImageDown className="w-3.5 h-3.5" />
              PNG
            </button>
            <button
              onClick={() => handleExport("png300")}
              disabled={exporting === "png300"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <ImageDown className="w-3.5 h-3.5" />
              PNG 300 DPI
            </button>
            <button
              onClick={() => handleExport("png600")}
              disabled={exporting === "png600"}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting === "png600" ? "Exporting..." : "Download PNG (600 DPI)"}
            </button>
          </div>
        </div>

        {/* SVG container */}
        <div
          className={cn(
            "border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white",
            colorblind && "grayscale"
          )}
        >
          <div ref={svgRef} className="w-full overflow-auto">
            <FigureComponent />
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[10px] text-slate-400 font-medium">
          <p>All figures at 1328 × 531 px · PNG export at 300 DPI</p>
        </div>
      </div>
    </div>
  );
}

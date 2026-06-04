"use client";

import { useRef, useState, useCallback } from "react";
import { Download, FileJson } from "lucide-react";
import { cn } from "@/lib/utils";
import Figure2Pipeline from "@/components/graphics/figures/Figure2Pipeline";

export default function GraficosFig2Page() {
  const svgRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"svg" | "png" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const getSvgElement = useCallback(() => {
    if (!svgRef.current) return null;
    return svgRef.current.querySelector("svg") as HTMLElement | null;
  }, []);

  const handleDownloadSvg = async () => {
    const el = getSvgElement();
    if (!el) { setExportError("SVG element not found"); return; }
    setExportError(null);
    setExporting("svg");
    try {
      const code = new XMLSerializer().serializeToString(el);
      const blob = new Blob([code], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = "figure2-pipeline.svg";
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      console.error("SVG export failed:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadPng300 = async () => {
    const el = getSvgElement();
    if (!el) { setExportError("SVG element not found"); return; }
    setExportError(null);
    setExporting("png");
    try {
      const svgString = new XMLSerializer().serializeToString(el);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = svgUrl;
      });
      const scale = 3.75;
      const canvas = document.createElement("canvas");
      canvas.width = 1328 * scale;
      canvas.height = 531 * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(svgUrl);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Canvas toBlob returned null");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = "figure2-pipeline-300dpi.png";
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
      console.error("PNG export failed:", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Scientific Figures
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publication-ready diagrams for journal submission
          </p>
        </div>

        <div className="border-b border-slate-200 pb-3">
          <p className="text-sm font-bold text-slate-800">
            Fig 2. Multimodal dataset preprocessing pipeline: OCR extraction, semantic chunking, and HITL validation before vector storage.
          </p>
        </div>

        {exportError && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            <span>Export failed: {exportError}</span>
            <button onClick={() => setExportError(null)} className="ml-auto text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={handleDownloadSvg}
            disabled={exporting === "svg"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition-all"
          >
            <FileJson className="w-3.5 h-3.5" />
            {exporting === "svg" ? "Exporting..." : "Download SVG"}
          </button>
          <button
            onClick={handleDownloadPng300}
            disabled={exporting === "png"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === "png" ? "Exporting..." : "Download PNG (300 DPI)"}
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
          <div ref={svgRef} className="w-full overflow-auto">
            <Figure2Pipeline />
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-400 font-medium">
          <p>ViewBox: 1328 × 531 · PNG export at 4980 × 1991 px (300 DPI)</p>
        </div>
      </div>
    </div>
  );
}

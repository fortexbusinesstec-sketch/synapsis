"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface GraphicsCanvasProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  label?: string;
}

export default function GraphicsCanvas({
  children,
  width = 1200,
  height = 800,
  label,
}: GraphicsCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);

  const recalcFit = useCallback(() => {
    if (!containerRef.current) return;
    const containerW = containerRef.current.clientWidth - 48;
    const containerH = window.innerHeight * 0.7;
    const scaleX = containerW / width;
    const scaleY = containerH / height;
    setFitScale(Math.min(scaleX, scaleY, 1));
  }, [width, height]);

  useEffect(() => {
    recalcFit();
    window.addEventListener("resize", recalcFit);
    return () => window.removeEventListener("resize", recalcFit);
  }, [recalcFit]);

  const displayScale = fitScale * zoom;
  const minScale = 1;
  const maxScale = 10;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    setZoom((z) => {
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      return Math.max(1, Math.min(maxScale, z + delta));
    });
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(maxScale, z + 0.5));
  const zoomOut = () => setZoom((z) => Math.max(1, z - 0.5));
  const resetZoom = () => setZoom(1);

  const displayPercent = Math.round(displayScale * 100);

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {label}
          </p>
          <p className="text-xs text-slate-400 font-medium">
            {width} × {height}px
          </p>
        </div>
      )}

      {/* Zoom toolbar */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={zoomOut}
          disabled={zoom <= 1}
          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-all"
          title="Zoom out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetZoom}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition-all"
          title="Fit to screen"
        >
          <Maximize2 className="w-3 h-3" />
          {displayPercent}%
        </button>

        <button
          onClick={zoomIn}
          disabled={zoom >= maxScale}
          className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 disabled:opacity-30 transition-all"
          title="Zoom in"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {zoom > 1 && (
          <span className="text-[10px] text-slate-400 ml-1">
            {zoom.toFixed(1)}× · Ctrl+scroll to zoom
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative overflow-auto rounded-2xl border border-slate-200 bg-white shadow-inner"
        style={{ maxHeight: `calc(100vh - 320px)`, minHeight: 300 }}
        onWheel={handleWheel}
      >
        <div
          style={{
            width,
            height,
            transform: `scale(${displayScale})`,
            transformOrigin: "top left",
            flexShrink: 0,
          }}
        >
          <div
            ref={canvasRef}
            data-canvas
            style={{
              width,
              height,
              position: "relative",
              overflow: "hidden",
              backgroundColor: "#ffffff",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export { type GraphicsCanvasProps };

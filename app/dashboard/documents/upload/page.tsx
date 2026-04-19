"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  CloudUpload,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Tipos ──────────────────────────────────────────────────────────────── */

type PipelineStatus =
  | "idle"
  | "uploading"
  | "analyzing"
  | "ocr"
  | "processing"
  | "embedding"
  | "ready"
  | "error";

interface StatusStep {
  key: PipelineStatus;
  label: string;
  detail?: string;
}

interface PollResponse {
  id: string;
  status: string;
  statusDetail: string | null;
  pageCount: number | null;
}

/* ── Pipeline steps definition ──────────────────────────────────────────── */

const STEPS: StatusStep[] = [
  { key: "uploading", label: "Subiendo PDF" },
  { key: "analyzing", label: "Analizando estructura" },
  { key: "ocr", label: "Extrayendo OCR" },
  { key: "processing", label: "Procesando imágenes" },
  { key: "embedding", label: "Generando embeddings" },
  { key: "ready", label: "¡Listo!" },
];

const STATUS_ORDER: PipelineStatus[] = [
  "uploading", "analyzing", "ocr", "processing", "embedding", "ready",
];

function getStepIndex(status: PipelineStatus): number {
  return STATUS_ORDER.indexOf(status);
}

/* ── Componentes de apoyo ───────────────────────────────────────────────── */

function ProgressBar({ status }: { status: PipelineStatus }) {
  const activeIdx = getStepIndex(status);
  const isError = status === "error";
  const isDone = status === "ready";

  return (
    <div className="w-full space-y-3">
      {/* Barra de progreso lineal */}
      <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
            isError ? "bg-red-500" : isDone ? "bg-emerald-500" : "bg-blue-500",
          )}
          style={{
            width: isError
              ? "100%"
              : `${Math.max(8, ((activeIdx + 1) / STEPS.length) * 100)}%`,
          }}
        />
      </div>

      {/* Steps */}
      <ol className="grid grid-cols-3 gap-y-3 sm:grid-cols-6">
        {STEPS.map((step, i) => {
          const done = !isError && activeIdx > i;
          const active = !isError && activeIdx === i;
          const pending = !active && !done;

          return (
            <li key={step.key} className="flex flex-col items-center gap-1 text-center">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors",
                  done && "border-emerald-500 bg-emerald-500 text-white",
                  active && "border-blue-500 bg-blue-50 text-blue-600",
                  pending && "border-slate-200 bg-white text-slate-400",
                  isError && i === activeIdx && "border-red-500 bg-red-50 text-red-600",
                )}
              >
                {done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : active && !isDone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isDone && active ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] leading-tight",
                  done && "text-emerald-600 font-medium",
                  active && "text-blue-600 font-semibold",
                  pending && "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */

export default function UploadDocumentPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(u => setUser(u))
      .catch(() => { })
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Validando...</p>
      </div>
    );
  }

  if (user?.role === "Técnico") {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center border-2 border-red-100 shadow-xl shadow-red-500/10">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Bloqueado</h1>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            La Ingesta de Documentos es exclusiva para perfiles <span className="text-slate-900 font-bold">Administrativos</span>.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => window.location.href = '/dashboard/home'}
            className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all active:scale-95 shadow-2xl"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    );
  }
  /* ── Estado del formulario ─────────────────────────────────────────── */
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("Schindler");
  const [model, setModel] = useState("");
  const [docType, setDocType] = useState("manual");
  const inputRef = useRef<HTMLInputElement>(null);

  /* ── Estado del pipeline ───────────────────────────────────────────── */
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>("idle");
  const [statusDetail, setStatusDetail] = useState<string>("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Polling ─────────────────────────────────────────────────────────── */
  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPolling = useCallback((docId: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${docId}/status`);
        if (!res.ok) return;
        const data: PollResponse = await res.json();

        setPipelineStatus(data.status as PipelineStatus);
        setStatusDetail(data.statusDetail ?? "");
        if (data.pageCount) setPageCount(data.pageCount);

        // Detener polling cuando el pipeline termina
        if (data.status === "ready" || data.status === "error") {
          stopPolling();
        }
      } catch {
        // silencioso — reintentará en el próximo tick
      }
    }, 2500);
  }, [stopPolling]);

  // Limpiar polling al desmontar
  useEffect(() => () => stopPolling(), [stopPolling]);

  /* ── Drag & Drop ─────────────────────────────────────────────────────── */
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "")); }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) { setFile(f); setTitle(f.name.replace(/\.[^.]+$/, "")); }
  };

  /* ── Submit ──────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setErrorMsg(null);
    setPipelineStatus("uploading");
    setStatusDetail("Subiendo archivo a Vercel Blob…");
    setPageCount(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title || file.name);
      form.append("brand", brand);
      form.append("equipmentModel", model);
      form.append("docType", docType);

      const res = await fetch("/api/upload", { method: "POST", body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Error HTTP ${res.status}`);
      }

      const { documentId: docId } = await res.json();
      setDocumentId(docId);
      setPipelineStatus("analyzing");

      // Iniciar polling ahora que tenemos el documentId
      startPolling(docId);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setErrorMsg(msg);
      setPipelineStatus("error");
    }
  };

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const isRunning = !["idle", "ready", "error"].includes(pipelineStatus);
  const isDone = pipelineStatus === "ready";
  const isError = pipelineStatus === "error";

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setModel("");
    setBrand("Schindler");
    setDocType("manual");
    setPipelineStatus("idle");
    setStatusDetail("");
    setPageCount(null);
    setDocumentId(null);
    setErrorMsg(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
          <CloudUpload className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Ingestar Documento Técnico
          </h1>
          <p className="text-sm text-slate-500">
            Sube manuales, planos o certificados Schindler para el pipeline RAG.
          </p>
        </div>
      </div>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 cursor-pointer transition-colors",
            isDragging
              ? "border-blue-400 bg-blue-50"
              : file
                ? "border-emerald-400 bg-emerald-50"
                : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50",
            isRunning && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onFileChange}
            disabled={isRunning}
          />
          {file ? (
            <>
              <FileText className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
              <p className="text-xs text-slate-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB · Haz clic para cambiar
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                Arrastra tu PDF aquí o haz clic para seleccionar
              </p>
              <p className="text-xs text-slate-400">Solo archivos PDF</p>
            </>
          )}
        </div>

        {/* Campos */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Título */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Título
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Manual de Servicio Schindler 3300"
              disabled={isRunning}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Marca */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Marca
            </label>
            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={isRunning}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="Schindler">Schindler</option>
              <option value="Otis">Otis</option>
              <option value="Kone">Kone</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Modelo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Modelo
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ej: 3300, 5500, MRL"
              disabled={isRunning}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Tipo de Documento
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              disabled={isRunning}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            >
              <option value="manual">Manual</option>
              <option value="plano">Plano</option>
              <option value="certificado">Certificado</option>
              <option value="historial">Historial</option>
            </select>
          </div>
        </div>

        {/* Botón de submit */}
        {!isRunning && !isDone && !isError && (
          <button
            type="submit"
            disabled={!file}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Iniciar Pipeline de Ingesta
          </button>
        )}
      </form>

      {/* ── Panel de progreso ─────────────────────────────────────────────── */}
      {pipelineStatus !== "idle" && (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">

          <ProgressBar status={pipelineStatus} />

          {/* Detalle del estado */}
          {statusDetail && (
            <p
              className={cn(
                "text-sm text-center",
                isError ? "text-red-600" : isDone ? "text-emerald-600 font-semibold" : "text-slate-500",
              )}
            >
              {isError && <AlertCircle className="inline h-4 w-4 mr-1 -mt-0.5" />}
              {statusDetail}
              {pageCount && !isDone && (
                <span className="ml-2 text-xs text-slate-400">
                  ({pageCount} páginas)
                </span>
              )}
            </p>
          )}

          {/* Estado: Listo */}
          {isDone && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
              <p className="text-sm font-semibold text-emerald-800">
                Documento procesado exitosamente
              </p>
              {pageCount && (
                <p className="text-xs text-emerald-600">{pageCount} páginas extraídas</p>
              )}
              {documentId && (
                <p className="text-[10px] font-mono text-slate-400">ID: {documentId}</p>
              )}
              <button
                onClick={resetForm}
                className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
              >
                Subir otro documento
              </button>
            </div>
          )}

          {/* Estado: Error */}
          {isError && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center space-y-2">
              <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
              <p className="text-sm font-semibold text-red-800">Error en el pipeline</p>
              {errorMsg && (
                <p className="text-xs text-red-600 font-mono">{errorMsg}</p>
              )}
              <button
                onClick={resetForm}
                className="mt-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

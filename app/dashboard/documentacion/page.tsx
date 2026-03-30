'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowUpFromLine,
  Settings,
  Paperclip,
  CloudUpload,
  Eye,
  CheckCircle2,
  Loader2,
  FileImage,
  FileSpreadsheet,
  X,
  Upload,
  Pencil,
  ChevronDown,
} from 'lucide-react';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';

/* ────────────────────────────────────────────────────────────────────────── */

type DocStatus = 
  | 'pending'
  | 'analyzing'
  | 'ocr'
  | 'processing'
  | 'embedding'
  | 'ready'
  | 'error'
  | 'processed'; // backward compat


interface DocEntry {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'sheet';
  status: DocStatus;
  date: string;
  size: string;
  brand: string | null;
  model: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function FileIcon({ type }: { type: DocEntry['type'] }) {
  if (type === 'image')  return <FileImage       className="w-4 h-4 text-purple-500" />;
  if (type === 'sheet')  return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
  return                        <FileText        className="w-4 h-4 text-blue-500" />;
}

function StatusBadge({ status }: { status: DocStatus }) {
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[11px] font-semibold">
        <X className="w-3 h-3" /> Error
      </span>
    );
  }
  
  if (['pending', 'analyzing', 'ocr', 'processing', 'embedding'].includes(status)) {
    const label = 
      status === 'pending'    ? 'Subido' :
      status === 'analyzing'  ? 'Analizando' :
      status === 'ocr'        ? 'OCR' :
      status === 'embedding'  ? 'Vectorizando' : 'Procesando';

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 text-[11px] font-semibold">
        <Loader2 className="w-3 h-3 animate-spin" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-semibold">
      <CheckCircle2 className="w-3 h-3" />
      Procesado
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function DocumentacionPage() {
  const [isDragging, setIsDragging]     = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading]   = useState(false);
  const [uploadError, setUploadError]   = useState<string | null>(null);
  const [docs, setDocs]                 = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading]       = useState(true);
  
  // States para el formulario de subida
  const [uploadBrand, setUploadBrand] = useState('Schindler');
  const [uploadModel, setUploadModel] = useState('3300');

  // State para edición
  const [editingDoc, setEditingDoc] = useState<DocEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── cargar documentos desde Turso ──────────────────────────────────── */
  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data: any[]) => {
        const entries: DocEntry[] = data.map((d) => ({
          id:     d.id,
          name:   d.title,
          type:   (d.docType as DocEntry['type']) ?? 'pdf',
          status: (d.status === 'ready' ? 'processed' : d.status) as DocStatus,
          date:   formatDate(d.createdAt),
          size:   d.fileSizeKb ? `${(d.fileSizeKb / 1024).toFixed(1)} MB` : '—',
          brand:  d.brand,
          model:  d.equipmentModel,
        }));
        setDocs(entries);
      })
      .catch(() => setUploadError('No se pudieron cargar los documentos.'))
      .finally(() => setIsLoading(false));
  }, []);

  /* ── drag events ─────────────────────────────────────────────────────── */
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setUploadError(null); }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) { setSelectedFile(file); setUploadError(null); }
  };

  /* ── upload ──────────────────────────────────────────────────────────── */
  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);
      formData.append('brand', uploadBrand);
      formData.append('equipmentModel', uploadModel);
      formData.append('docType', selectedFile.name.split('.').pop()?.toLowerCase() === 'pdf' ? 'pdf'
        : ['jpg','jpeg','png','webp'].includes(selectedFile.name.split('.').pop()?.toLowerCase() ?? '') ? 'image'
        : 'sheet');

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error al subir el archivo');

      const { documentId, docType: returnedDocType } = await res.json();

      const newDoc: DocEntry = {
        id:     documentId,
        name:   selectedFile.name,
        type:   (returnedDocType as DocEntry['type']) ?? 'pdf',
        status: 'pending',
        date:   formatDate(new Date().toISOString()),
        size:   `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        brand:  uploadBrand,
        model:  uploadModel,
      };

      setDocs((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err: any) {
      setUploadError(err.message ?? 'Error desconocido');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDoc) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand: editingDoc.brand,
          equipmentModel: editingDoc.model,
          title: editingDoc.name,
        }),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      
      setDocs(prev => prev.map(d => d.id === editingDoc.id ? editingDoc : d));
      setEditingDoc(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Editar Documento</h3>
              <button 
                onClick={() => setEditingDoc(null)}
                className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Título</label>
                <input 
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-900"
                  value={editingDoc.name}
                  onChange={e => setEditingDoc({...editingDoc, name: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 appearance-none shadow-sm"
                      value={editingDoc.brand || 'Schindler'}
                      onChange={e => setEditingDoc({...editingDoc, brand: e.target.value})}
                    >
                      <option value="Schindler">Schindler</option>
                      <option value="Generic">Genérico / Otros</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modelo</label>
                  <div className="relative">
                    <select 
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-slate-900 appearance-none shadow-sm"
                      value={editingDoc.model || '3300'}
                      onChange={e => setEditingDoc({...editingDoc, model: e.target.value})}
                    >
                      <option value="3300">Schindler 3300</option>
                      <option value="5500">Schindler 5500</option>
                      <option value="MRL">MRL (Sin Cuarto)</option>
                      <option value="General">Documento General</option>
                      <option value="Custom">Otro / Especial</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 bg-slate-50/50 border-t border-slate-100">
              <button 
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/10 transition-all active:scale-95 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <div className="flex items-center gap-2.5">
          <div className="relative w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
            <FileText className="w-6 h-6 text-blue-600" />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <ArrowUpFromLine className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200">
            <Settings className="w-[18px] h-[18px] text-slate-500" />
          </div>
        </div>
        <div>
          <h1 className="text-slate-900 font-bold text-xl tracking-tight">
            Control de Documentación
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Injestar y Procesar Documentación Técnica de Schindler (Manuales y Planos).
          </p>
        </div>
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Left: Upload panel (2/5) ───────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col gap-5 self-start lg:sticky lg:top-6">
          <div>
            <h2 className="text-slate-800 font-semibold text-[15px]">Subir Documento</h2>
            <p className="text-slate-400 text-xs mt-0.5">PDF, imágenes o Excel de manuales técnicos</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Marca</label>
              <div className="relative">
                <select 
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none shadow-sm cursor-pointer"
                  value={uploadBrand}
                  onChange={e => setUploadBrand(e.target.value)}
                >
                  <option value="Schindler">Schindler</option>
                  <option value="Generic">Genérico</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Modelo</label>
              <div className="relative">
                <select 
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none shadow-sm cursor-pointer"
                  value={uploadModel}
                  onChange={e => setUploadModel(e.target.value)}
                >
                  <option value="3300">Schindler 3300</option>
                  <option value="5500">Schindler 5500</option>
                  <option value="MRL">MRL (Sin Cuarto)</option>
                  <option value="General">Documento General</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[180px] px-4 py-8 text-center select-none ${
              isDragging
                ? 'border-blue-400 bg-blue-50/60'
                : 'border-slate-300 bg-slate-100/50 hover:border-slate-400 hover:bg-slate-100'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.xls,.csv"
              className="hidden"
              onChange={onFileChange}
              onClick={(e) => e.stopPropagation()}
            />

            <div className="flex items-center gap-2 text-slate-400">
              <CloudUpload className={`w-8 h-8 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
              <Paperclip className="w-5 h-5" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <p className="text-slate-700 text-sm font-medium">{selectedFile.name}</p>
                <p className="text-slate-400 text-xs">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-slate-600 text-sm font-medium">
                  Arrastra aquí o{' '}
                  <span className="text-blue-600 underline underline-offset-2">selecciona</span>
                </p>
                <p className="text-slate-400 text-xs">
                  Seleccionar PDF o Imagen (Manuales, Diagramas)
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {uploadError && (
            <p className="text-red-500 text-xs flex items-center gap-1.5">
              <X className="w-3.5 h-3.5" /> {uploadError}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-auto">
            {selectedFile && (
              <button
                onClick={() => { setSelectedFile(null); setUploadError(null); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Procesando…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Procesar Documento
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: Documents list (3/5) ───────────────────────────────── */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-slate-800 font-semibold text-[15px]">Documentos Indexados</h2>
              <p className="text-slate-400 text-xs mt-0.5">{docs.length} archivos en el corpus</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              RAG activo
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-slate-400 gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando documentos…
              </div>
            )}
            {!isLoading && docs.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-sm gap-1">
                <FileText className="w-8 h-8 mb-1 opacity-30" />
                No hay documentos indexados aún.
              </div>
            )}
            {!isLoading && docs.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Marca / Modelo
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200 flex-shrink-0">
                          <FileIcon type={doc.type} />
                        </div>
                        <span className="text-slate-700 font-medium text-[13px] truncate max-w-[180px]">
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-semibold text-[12px]">{doc.brand || 'Schindler'}</span>
                        <span className="text-slate-400 text-[10px] font-medium tracking-tight uppercase">{doc.model || '3300'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="hidden md:table-cell px-4 py-3.5 text-slate-400 text-[13px]">
                      {doc.date}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setEditingDoc(doc)}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center w-fit"
                          title="Editar metadatos"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center w-fit"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <DeleteDocumentButton 
                          documentId={doc.id} 
                          variant="icon"
                          onSuccess={() => {
                            setDocs(prev => prev.filter(d => d.id !== doc.id));
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

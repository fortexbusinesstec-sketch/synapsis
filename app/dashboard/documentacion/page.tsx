'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  CloudUpload,
  Eye,
  CheckCircle2,
  Loader2,
  FileImage,
  FileSpreadsheet,
  X,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { DeleteDocumentButton } from '@/components/DeleteDocumentButton';
import { AdminDocumentationGrid } from '@/components/dashboard/AdminDocumentationGrid';

/* ────────────────────────────────────────────────────────────────────────── */

type DocStatus =
  | 'pending'
  | 'analyzing'
  | 'ocr'
  | 'processing'
  | 'embedding'
  | 'ready'
  | 'error'
  | 'processed';

interface DocEntry {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'sheet';
  status: DocStatus;
  date: string;
  size: string;
  brand: string | null;
  model: string | null;
  auditorRecommendation: string | null;
  createdBy: string | null;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function FileIcon({ type }: { type: DocEntry['type'] }) {
  if (type === 'image') return <FileImage className="w-4 h-4 text-purple-500" />;
  if (type === 'sheet') return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
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
      status === 'pending' ? 'Subido' :
        status === 'analyzing' ? 'Analizando' :
          status === 'ocr' ? 'OCR' :
            status === 'embedding' ? 'Vectorizando' : 'Procesando';

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
  const [userInfo, setUserInfo] = useState<{ id: string | null; role: string | null; isDevMode: boolean }>({ id: null, role: null, isDevMode: false });
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [uploadBrand, setUploadBrand] = useState('Schindler');
  const [uploadModel, setUploadModel] = useState('3300');

  const [editingDoc, setEditingDoc] = useState<DocEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(async r => {
        if (!r.ok) return { id: null, role: null, isDevMode: false };
        return r.json();
      })
      .then(u => setUserInfo({ id: u.id, role: u.role, isDevMode: u.isDevMode }))
      .catch(() => setUserInfo({ id: null, role: null, isDevMode: false }))
      .finally(() => setAuthLoading(false));

    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          console.error('Invalid documents data:', data);
          setUploadError('Error al cargar la lista de documentos.');
          return;
        }
        const entries: DocEntry[] = data.map((d) => ({
          id: d.id,
          name: d.title,
          type: (d.docType as DocEntry['type']) ?? 'pdf',
          status: (d.status === 'ready' ? 'processed' : d.status) as DocStatus,
          date: formatDate(d.createdAt),
          size: d.fileSizeKb ? `${(d.fileSizeKb / 1024).toFixed(1)} MB` : '—',
          brand: d.brand,
          model: d.equipmentModel,
          auditorRecommendation: d.auditorRecommendation,
          createdBy: d.createdBy,
        }));
        setDocs(entries);
      })
      .catch(() => setUploadError('No se pudieron cargar los documentos.'))
      .finally(() => setIsLoading(false));
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError("Solo se permiten archivos PDF.");
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  }, []);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Verificando Credenciales...</p>
      </div>
    );
  }

  const isTechnician = userInfo.role === "Técnico" || userInfo.role === "Especialista Técnico";

  if (isTechnician) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center border-2 border-red-100 shadow-xl shadow-red-500/10">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Acceso Privado</h1>
          <p className="text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            La Biblioteca Digital de Manuales es exclusiva para el equipo de <span className="text-slate-900 font-bold">Administración</span> y <span className="text-blue-600 font-bold">Auditoría</span>.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => window.location.href = '/dashboard/home'}
            className="px-8 py-3 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-black transition-all active:scale-95 shadow-2xl"
          >
            Volver al Panel Técnico
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = userInfo.role === "Administrador de Sistema";
  const isAuditor = userInfo.role === "Auditor";
  const isDevMode = userInfo.isDevMode;


  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      if (file.type !== 'application/pdf') {
        setUploadError("Solo se permiten archivos PDF.");
        if (inputRef.current) inputRef.current.value = '';
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (isAuditor) {
      // El Auditor solo puede tener 1 documento creado por EL
      const hasPreviousDoc = docs.some(d => d.createdBy === userInfo.id);
      if (hasPreviousDoc) {
        setUploadError("Ya tienes un documento subido en el sistema. Elimina tu documento anterior para subir uno nuevo.");
        return;
      }
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', selectedFile.name);
      formData.append('brand', uploadBrand);
      formData.append('equipmentModel', uploadModel);
      formData.append('docType', 'pdf');

      if (isAuditor) {
        formData.append('auditorRecommendation', 'AUDITOR');
      }

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Error al subir el archivo');

      const { documentId, docType: returnedDocType } = await res.json();

      const newDoc: DocEntry = {
        id: documentId,
        name: selectedFile.name,
        type: (returnedDocType as DocEntry['type']) ?? 'pdf',
        status: 'pending',
        date: formatDate(new Date().toISOString()),
        size: `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
        brand: uploadBrand,
        model: uploadModel,
        auditorRecommendation: isAuditor ? "AUDITOR" : null,
        createdBy: userInfo.id,
      };

      setDocs((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
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

  return (
    <div className="space-y-6">

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-900">Editar Metadatos</h3>
              <button onClick={() => setEditingDoc(null)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Título del Documento</label>
                <input
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-semibold text-slate-900"
                  value={editingDoc.name}
                  onChange={e => setEditingDoc({ ...editingDoc, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold appearance-none cursor-pointer"
                      value={editingDoc.brand || 'Schindler'}
                      onChange={e => setEditingDoc({ ...editingDoc, brand: e.target.value })}
                    >
                      <option value="Schindler">Schindler</option>
                      <option value="Generic">Genérico</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Modelo</label>
                  <div className="relative">
                    <select
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold appearance-none cursor-pointer"
                      value={editingDoc.model || '3300'}
                      onChange={e => setEditingDoc({ ...editingDoc, model: e.target.value })}
                    >
                      <option value="3300">Schindler 3300</option>
                      <option value="5500">Schindler 5500</option>
                      <option value="MRL">MRL</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 bg-slate-50/50 border-t border-slate-100">
              <button onClick={() => setEditingDoc(null)} className="px-4 py-2 text-sm font-bold text-slate-500">Cancelar</button>
              <button
                onClick={handleUpdate}
                className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20"
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Modal ────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Ingestar Nuevo Manual</h2>
                  <p className="text-slate-500 text-sm">Carga documentos técnicos al corpus del RAG</p>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-2 bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Marca</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={uploadBrand}
                    onChange={e => setUploadBrand(e.target.value)}
                  >
                    <option value="Schindler">Schindler</option>
                    <option value="Generic">Genérico</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Modelo</label>
                  <select
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                    value={uploadModel}
                    onChange={e => setUploadModel(e.target.value)}
                  >
                    <option value="3300">Schindler 3300</option>
                    <option value="5500">Schindler 5500</option>
                    <option value="MRL">Schindler MRL</option>
                  </select>
                </div>
              </div>

              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed cursor-pointer transition-all min-h-[220px] px-8 py-10 text-center ${isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                  }`}
              >
                <input ref={inputRef} type="file" className="hidden" onChange={onFileChange} />
                <div className={`p-4 rounded-2xl ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                  <CloudUpload className="w-10 h-10" />
                </div>
                {selectedFile ? (
                  <div>
                    <p className="text-slate-900 font-bold text-base">{selectedFile.name}</p>
                    <p className="text-slate-400 text-xs mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-slate-700 font-bold">Arrastra el PDF aquí</p>
                    <p className="text-slate-400 text-sm mt-1">O haz clic para seleccionar archivo</p>
                  </div>
                )}
              </div>

              {uploadError && <p className="text-red-500 text-xs font-bold flex items-center gap-2 px-2"><X className="w-4 h-4" /> {uploadError}</p>}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3"
              >
                {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</> : <><Plus className="w-5 h-5" /> Iniciar Ingestión</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Biblioteca Digital</h1>
          <p className="text-slate-500 text-sm">{docs.length} documentos técnicos disponibles</p>
        </div>

        {(isAdmin || isAuditor) && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-600/10 hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" /> Ingestar Nuevo Manual
          </button>
        )}
      </div>

      {/* ── Main Area ────────────────────────────────────────────────────── */}
      {isAdmin ? (
        <AdminDocumentationGrid docs={docs} onEdit={setEditingDoc} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                    <th className="px-4 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Marca / Modelo</th>
                    <th className="px-4 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                    <th className="px-4 py-4 text-right" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {docs.map(doc => {
                    const isOwnDoc = doc.createdBy === userInfo.id;
                    const canDelete = isAdmin || (isAuditor && isDevMode) || (isAuditor && isOwnDoc);
                    return (
                      <tr key={doc.id} className="hover:bg-slate-50/50 group transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <FileIcon type={doc.type} />
                            <span className="font-bold text-slate-700">{doc.name}</span>
                            {doc.auditorRecommendation === "AUDITOR" && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-black uppercase tracking-widest border border-blue-100">Auditor</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-slate-500 text-xs">{doc.brand} {doc.model}</span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/dashboard/documents/${doc.id}`} className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                              <Eye className="w-4 h-4" />
                            </Link>
                            {canDelete && (
                              <DeleteDocumentButton documentId={doc.id} variant="icon" onSuccess={() => setDocs(p => p.filter(x => x.id !== doc.id))} />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

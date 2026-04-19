
import Link from 'next/link';
import {
    FileText,
    Pencil,
    Eye,
    CheckCircle2,
    Loader2,
    AlertCircle
} from 'lucide-react';

interface DocStatusProps {
    status: string;
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'error') return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-[10px] font-bold">Error</span>;
    if (status === 'ready' || status === 'processed') return <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">Procesado</span>;
    return <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[10px] font-bold">En Proceso</span>;
}

interface DocEntry {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'sheet';
    status: any;
    date: string;
    size: string;
    brand: string | null;
    model: string | null;
    auditorRecommendation: string | null;
    createdBy: string | null;
}

interface AdminDocumentationGridProps {
    docs: DocEntry[];
    onEdit: (doc: DocEntry) => void;
}

export function AdminDocumentationGrid({ docs, onEdit }: AdminDocumentationGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {docs.map((doc) => (
                <div key={doc.id} className="group bg-white border border-slate-200 rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all relative overflow-hidden flex flex-col h-full">

                    {/* Top Info */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform group-hover:bg-blue-50">
                            <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <StatusBadge status={doc.status} />
                    </div>

                    {/* Title & Meta */}
                    <div className="flex-1 space-y-2">
                        <h3 className="text-slate-900 font-bold text-sm leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                            {doc.name}
                        </h3>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {doc.brand && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    {doc.brand}
                                </span>
                            )}
                            {doc.model && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                    {doc.model}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-slate-400 text-[10px] font-bold">
                        <span>{doc.date}</span>
                        <span>{doc.size}</span>
                    </div>

                    {/* Hover Overlay Actions */}
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10">
                        <Link
                            href={`/dashboard/documents/${doc.id}`}
                            className="w-12 h-12 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20 flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                            title="Ver / Auditar"
                        >
                            <Eye className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={() => onEdit(doc)}
                            className="w-12 h-12 bg-white border border-slate-200 text-slate-600 rounded-2xl shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95 hover:border-blue-400 hover:text-blue-600"
                            title="Editar Metadatos"
                        >
                            <Pencil className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function DeleteDocumentButton({ 
  documentId, 
  variant = "default",
  onSuccess 
}: { 
  documentId: string;
  variant?: "default" | "icon";
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/dashboard/documentacion");
          router.refresh();
        }
      } else {
        const data = await res.json();
        alert(`Error al eliminar: ${data.error}`);
        setIsDeleting(false);
        setShowConfirm(false);
      }
    } catch (err: any) {
      alert(`Error de red: ${err.message}`);
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleShowConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(true);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowConfirm(false);
  };

  if (showConfirm) {
    if (variant === "icon") {
      return (
        <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-200">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
            title="Confirmar eliminación"
          >
            {isDeleting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={handleCancel}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-all"
            title="Cancelar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-amber-500" />
          ¿Confirmas purga?
        </span>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-1 bg-red-600 text-white text-xs font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1 shadow-sm transition-all"
        >
          {isDeleting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            "Sí, eliminar"
          )}
        </button>
        <button
          onClick={handleCancel}
          disabled={isDeleting}
          className="text-xs text-slate-400 hover:text-slate-600 px-2 font-medium"
        >
          Cancelar
        </button>
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <button
        onClick={handleShowConfirm}
        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all group-hover:opacity-100 opacity-0 md:opacity-0"
        title="Eliminar documento"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleShowConfirm}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100 group"
    >
      <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
      <span>Eliminar Documento</span>
    </button>
  );
}

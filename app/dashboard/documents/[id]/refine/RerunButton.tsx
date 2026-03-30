'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RerunButton({ documentId }: { documentId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleRerun = async () => {
    setState('loading');
    try {
      const res = await fetch(`/api/documents/${documentId}/enrich`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al lanzar el agente');
      setState('done');
    } catch {
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <p className="text-sm text-emerald-600 font-medium">
        El Agente Curioso está corriendo en background. Vuelve en unos segundos y recarga la página.
      </p>
    );
  }

  return (
    <button
      onClick={handleRerun}
      disabled={state === 'loading'}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
        state === 'error'
          ? 'border-red-200 bg-red-50 text-red-600'
          : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100',
        state === 'loading' && 'opacity-60 cursor-not-allowed',
      )}
    >
      <RefreshCw className={cn('h-4 w-4', state === 'loading' && 'animate-spin')} />
      {state === 'loading' ? 'Lanzando…' : state === 'error' ? 'Error — reintentar' : 'Re-analizar documento'}
    </button>
  );
}

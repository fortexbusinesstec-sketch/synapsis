'use client';

import { BookOpen, ListChecks, Stethoscope } from 'lucide-react';
import type { ModoType } from '@/lib/agents/prompts';

interface ModoSelectorProps {
  value: ModoType;
  onChange: (modo: ModoType) => void;
  disabled?: boolean;
}

const MODOS: {
  value: ModoType;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}[] = [
  {
    value: 'teorico',
    label: 'Teórico',
    Icon: BookOpen,
    tooltip: 'Pregunta sobre conceptos, definiciones o funcionamiento del equipo',
  },
  {
    value: 'procedimental',
    label: 'Procedimental',
    Icon: ListChecks,
    tooltip: 'Pregunta sobre cómo hacer algo, pasos o procedimientos técnicos',
  },
  {
    value: 'diagnostico',
    label: 'Diagnóstico',
    Icon: Stethoscope,
    tooltip: 'Reporta un síntoma o falla para diagnosticar',
  },
];

const BG_CLASSES: Record<ModoType, string> = {
  teorico: 'bg-blue-600 text-white shadow-sm',
  procedimental: 'bg-amber-600 text-white shadow-sm',
  diagnostico: 'bg-red-600 text-white shadow-sm',
};

export default function ModoSelector({ value, onChange, disabled }: ModoSelectorProps) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-slate-200 w-full">
      {MODOS.map(({ value: v, label, Icon, tooltip }) => {
        const isActive = value === v;
        return (
          <div key={v} className="relative flex-1 group">
            <button
              type="button"
              onClick={() => onChange(v)}
              disabled={disabled}
              className={`
                w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-semibold transition-all
                ${isActive ? BG_CLASSES[v] : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white bg-slate-800 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              {tooltip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
            </div>
          </div>
        );
      })}
    </div>
  );
}

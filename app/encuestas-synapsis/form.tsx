'use client';

import { useActionState, useEffect } from 'react';
import { User, Mail, Briefcase, Loader2, ArrowRight, Check } from 'lucide-react';
import { registrarTecnico } from './actions';

export default function RegistrationForm() {
  const [state, formAction, isPending] = useActionState(registrarTecnico, null);

  useEffect(() => {
    if (state?.success && state?.codigo) {
      window.location.href = `/encuestas-synapsis/encuesta?codigo=${state.codigo}`;
    }
  }, [state]);

  return (
    <form action={formAction} className="space-y-5">

      {/* Nombre completo */}
      <div className="space-y-1.5">
        <label className="block text-slate-700 text-[13px] font-medium">Nombre completo</label>
        <div className="relative">
          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="nombre"
            placeholder="Ej: Juan Pérez García"
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors disabled:opacity-50"
            disabled={isPending}
          />
        </div>
        <p className="text-[11px] text-slate-400">Opcional si marca anonimizar abajo.</p>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-slate-700 text-[13px] font-medium">Correo electrónico</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            name="email"
            placeholder="correo@ejemplo.com"
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Años de experiencia */}
      <div className="space-y-1.5">
        <label className="block text-slate-700 text-[13px] font-medium">
          Años de experiencia en el rubro de ascensores
        </label>
        <div className="relative">
          <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="number"
            name="experiencia"
            min={0}
            max={60}
            placeholder="Ej: 5"
            required
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors disabled:opacity-50"
            disabled={isPending}
          />
        </div>
      </div>

      {/* Consentimiento */}
      <div className="space-y-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="consentimiento"
            required
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            disabled={isPending}
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            <strong>He leído y comprendo la información anterior.</strong> Acepto participar voluntariamente
            en este estudio y permito que mis respuestas sean utilizadas con fines académicos y de
            investigación, en las condiciones de anonimato descritas.
          </span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="anonimizar"
            value="si"
            className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            disabled={isPending}
          />
          <span className="text-sm text-slate-700 leading-relaxed">
            <strong>Solicito anonimizar completamente mis datos personales</strong> (no se registrará mi nombre).
          </span>
        </label>
      </div>

      {/* Error */}
      {state && !state.success && (
        <p className="text-red-500 text-[13px] flex items-start gap-1.5 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
          {state.message}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Registrando…
          </>
        ) : (
          <>
            Comenzar encuesta
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}

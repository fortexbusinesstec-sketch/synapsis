'use client';

import { useActionState, useEffect } from 'react';
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { loginAction } from './actions';

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  useEffect(() => {
    if (state?.success) {
      window.location.href = '/dashboard/home';
    }
  }, [state]);

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white">

      {/* ── Left: brand panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-600 to-blue-800 p-12 text-white relative overflow-hidden">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-96 h-96 rounded-full bg-white/5 translate-x-1/3 translate-y-1/3" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-white fill-white/40" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-black text-base tracking-[0.2em] uppercase">SYNAPSIS</span>
            <span className="text-blue-200 text-[10px] tracking-wide mt-0.5">
              Multi-Agent System
            </span>
          </div>
        </div>

        {/* Main copy */}
        <div className="relative space-y-4">
          <h1 className="text-4xl font-bold leading-snug tracking-tight">
            Intelligent Elevator<br />Management Platform
          </h1>
          <p className="text-blue-100 text-base leading-relaxed max-w-sm">
            Sistema de orquestación Multi-Agente para diagnóstico predictivo y mantenimiento
            de ascensores Schindler 3300 / 5500.
          </p>
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '240+',  label: 'Elevadores' },
            { value: '12 ms', label: 'Latencia' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-blue-200 text-xs mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: login form ──────────────────────────────────────────── */}
      <div className="flex items-center justify-center p-8 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white fill-white/30" />
            </div>
            <span className="text-blue-600 font-black text-[15px] tracking-[0.2em] uppercase">
              SYNAPSIS
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-slate-900 text-2xl font-bold tracking-tight">Iniciar sesión</h2>
            <p className="text-slate-500 text-sm mt-1">
              Accede al sistema de orquestación MAS.
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="space-y-5">

            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 text-[13px] font-medium">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  placeholder="correo@empresa.com"
                  required
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-slate-700 text-[13px] font-medium">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  required
                  className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Error message */}
            {state && !state.success && state.message && (
              <p className="text-red-500 text-[13px] flex items-start gap-1.5 bg-red-50 border border-red-100 px-3 py-2.5 rounded-lg">
                {state.message}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-11 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando…
                </>
              ) : (
                <>
                  Acceder al sistema
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-10 text-center text-slate-400 text-[11px] leading-relaxed">
            Acceso restringido a personal autorizado Schindler.
            <br />
            © {new Date().getFullYear()} Synapsis MAS Platform
          </p>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Clock, CheckCircle2 } from "lucide-react";

export default function LandingPreview({ onContinue }: { onContinue: () => void }) {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeElapsed((prev) => {
        const next = prev + 1;
        if (next >= 30) setCanContinue(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Math.max(0, 30 - timeElapsed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Revisión de Landing Page</h2>
          <p className="text-sm text-slate-500 mt-1">Observe la landing page durante 30 segundos antes de continuar</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4 text-blue-500" />
          {canContinue ? (
            <span className="text-green-600">¡Tiempo cumplido!</span>
          ) : (
            <span className="text-slate-600">{remaining} segundos restantes</span>
          )}
        </div>
      </div>

      {/* Mock Landing Page Preview */}
      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-slate-900">SYNAPSIS</span>
          </div>
          <div className="flex gap-3">
            <div className="h-2 w-16 rounded bg-slate-200" />
            <div className="h-2 w-16 rounded bg-slate-200" />
            <div className="h-2 w-16 rounded bg-blue-600" />
          </div>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-8 py-12 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">Diagnóstico Inteligente de Ascensores</h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto">
            Plataforma IA que diagnostica fallas en ascensores usando documentación técnica y conocimiento de expertos.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 px-6 py-8">
          {[
            { title: "Chat Técnico", desc: "Resuelve fallas en tiempo real con IA entrenada con manuales" },
            { title: "Biblioteca Digital", desc: "Accede a planos, manuales y certificados al instante" },
            { title: "Experto Virtual", desc: "Conocimiento de técnicos senior siempre disponible" },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-4 bg-slate-50">
              <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <div className="h-4 w-4 rounded bg-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">{f.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="border-t border-slate-100 px-6 py-4 flex justify-center">
          <div className="h-10 w-48 rounded-xl bg-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">Solicitar Demo</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${canContinue ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${Math.min(100, (timeElapsed / 30) * 100)}%` }}
        />
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {canContinue ? (
            <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Ya revisé la landing, continuar</span>
          ) : (
            <span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Revise la landing ({remaining}s)</span>
          )}
        </Button>
      </div>
    </div>
  );
}

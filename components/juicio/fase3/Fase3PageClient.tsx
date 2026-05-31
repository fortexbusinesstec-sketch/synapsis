"use client";

import { useState } from "react";
import SurveyForm from "@/components/juicio/fase3/SurveyForm";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function Fase3PageClient({ expertoCodigo }: { expertoCodigo: string }) {
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="text-center py-16">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Encuesta Completada</h2>
        <p className="text-slate-500 mt-2">Gracias por tu participación en la Evaluación Comercial.</p>
        <Link
          href={`/dashboard/juicio/fases?expertoId=${expertoCodigo}`}
          className="mt-6 inline-block bg-blue-600 text-white rounded-xl px-6 py-2.5 font-semibold hover:bg-blue-700"
        >
          Volver a Fases
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href={`/dashboard/juicio/fases?expertoId=${expertoCodigo}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a fases
      </Link>

      <SurveyForm expertoCodigo={expertoCodigo} onSuccess={() => setDone(true)} />
    </>
  );
}

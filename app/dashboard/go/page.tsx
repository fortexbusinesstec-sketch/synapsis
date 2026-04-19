import { count, eq } from 'drizzle-orm';
import { Cpu, Zap } from 'lucide-react';

import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { SynapsisGoChat } from './SynapsisGoChat';

import { cookies } from 'next/headers';

/* ── Tipos ──────────────────────────────────────────────────────────────── */

export interface EquipmentModel {
  equipmentModel: string | null;
}

/* ── Server Component ───────────────────────────────────────────────────── */

export default async function SynapsisGoPage() {
  // Modelos con documentación lista, ordenados por marca y modelo
  const [models, totalDocs] = await Promise.all([
    db.selectDistinct({
      equipmentModel: documents.equipmentModel,
    })
      .from(documents)
      .where(eq(documents.status, 'ready'))
      .orderBy(documents.equipmentModel),

    db.select({ count: count() })
      .from(documents)
      .where(eq(documents.status, 'ready'))
  ]);

  const filteredModels = models.length > 0 ? models : [];
  const readyDocsCount = totalDocs[0]?.count ?? 0;

  const cookieStore = await cookies();
  const token = cookieStore.get('schindler_token')?.value;
  const isDevMode = cookieStore.get('schindler_dev_mode')?.value === 'true';

  let role = null;
  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        role = payload.role_id === 1 ? 'Admin' : payload.role_id === 2 ? 'Auditor' : 'Tecnico';
      }
    } catch { }
  }

  return (
    <div className="flex flex-col h-full min-h-0 space-y-0 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* ── Header de página ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 pt-5 pb-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 border border-blue-100">
          <Zap className="h-5 w-5 text-blue-600 fill-blue-100" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
            Synapsis Go
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Comité de Diagnóstico · Bibliotecario + Analista + Ingeniero Jefe
          </p>
        </div>

        {readyDocsCount > 0 && (
          <div className="ml-auto hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">
              {filteredModels.length} modelos / {readyDocsCount} manuales activos
            </span>
          </div>
        )}
      </div>

      {/* ── Chat ─────────────────────────────────────────────────────── */}
      <SynapsisGoChat models={filteredModels} userRole={role} isDevMode={isDevMode} />
    </div>
  );
}

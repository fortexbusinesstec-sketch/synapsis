import { count, eq } from 'drizzle-orm';
import { Zap } from 'lucide-react';

import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/db/auth';
import { SynapsisGoChat } from './SynapsisGoChat';

/* ── Tipos ──────────────────────────────────────────────────────────────── */

export interface EquipmentModel {
  equipmentModel: string | null;
}

/* ── Server Component ───────────────────────────────────────────────────── */

export default async function SynapsisGoPage() {
  const user = await getCurrentUser();

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

  const role = user?.role ?? null;
  const isDevMode = user?.isDevMode ?? false;

  return (
    <div className="flex flex-col h-full min-h-0 space-y-0 -mx-4 -mt-4 sm:-mx-6 sm:-mt-6">
      {/* ── Header de página ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 sm:px-6 pt-4 pb-3 bg-white flex-shrink-0 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
            Synapsis Go
          </h1>
          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
            Comité Multi-Agente · 3 modos de consulta
          </p>
        </div>
      </div>

      {/* ── Chat ─────────────────────────────────────────────────────── */}
      <SynapsisGoChat models={filteredModels} userRole={role} isDevMode={isDevMode} />
    </div>
  );
}

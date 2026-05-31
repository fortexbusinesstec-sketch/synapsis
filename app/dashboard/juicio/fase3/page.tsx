import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { expertos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Fase3PageClient from '@/components/juicio/fase3/Fase3PageClient';

export default async function JuicioFase3Page({ searchParams }: { searchParams: Promise<{ expertoId?: string }> }) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "Auditor" && user.role !== "JuicioExperto")) {
    redirect('/login');
  }

  const params = await searchParams;
  const expertoCodigo = params.expertoId;

  if (!expertoCodigo) {
    redirect('/dashboard/juicio/fases');
  }

  const [expert] = await db.select().from(expertos).where(eq(expertos.codigo, expertoCodigo));
  if (!expert) {
    redirect('/dashboard/juicio/fases');
  }

  if (expert.rolActual !== "comercial") {
    redirect(`/dashboard/juicio/fases?expertoId=${expertoCodigo}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto p-4 max-w-3xl pt-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Evaluación Comercial — Synapsis</h1>
          <p className="text-slate-500 mt-2">Usted ya conoció el sistema. Ahora evalúe su potencial de mercado.</p>
          <span className="inline-block mt-3 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
            Basado en su interacción previa con la aplicación
          </span>
        </div>
        <Fase3PageClient expertoCodigo={expertoCodigo} />
      </div>
    </div>
  );
}

import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { expertos } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Fase2Client from '@/components/juicio/fase2/Fase2Client';

export default async function Fase2Page({ searchParams }: { searchParams: Promise<{ expertoId?: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const params = await searchParams;
  const expertoCodigo = params.expertoId;
  if (!expertoCodigo) redirect('/dashboard/juicio/perfil');

  const [expert] = await db.select().from(expertos).where(eq(expertos.codigo, expertoCodigo));
  if (!expert) redirect('/dashboard/juicio/perfil');

  if (expert.rolActual !== "tecnico_especialista") {
    redirect(`/dashboard/juicio/fases?expertoId=${expertoCodigo}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto p-4 max-w-4xl pt-8">
        <Link
          href={`/dashboard/juicio/fases?expertoId=${expertoCodigo}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a fases
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4 sm:mb-6">Fase 2: Escenario Libre</h1>

        <Fase2Client expertoCodigo={expertoCodigo} />
      </div>
    </div>
  );
}

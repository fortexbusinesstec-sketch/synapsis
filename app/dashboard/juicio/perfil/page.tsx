import TabbedProfile from '@/components/juicio/TabbedProfile';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/db/auth';
import { expertos } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function JuicioPerfilPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "Auditor" && user.role !== "JuicioExperto")) {
    redirect("/login");
  }

  // Fetch last expert code for client-side display or logic if needed.
  const lastExpert = await db
    .select({
      codigo: expertos.codigo,
    })
    .from(expertos)
    .orderBy(sql`CAST(SUBSTR(${expertos.codigo}, 5) AS INTEGER) DESC`)
    .limit(1);

  let nextCodeNum = 1;
  if (lastExpert.length > 0) {
    const lastNum = parseInt(lastExpert[0].codigo.substring(4));
    nextCodeNum = lastNum + 1;
  }
  const suggestedCodigo = `EXP-${nextCodeNum.toString().padStart(3, "0")}`;

  const allExperts = await db.select().from(expertos);
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto p-4 max-w-4xl pt-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Juicio de Expertos</h1>
        <p className="text-slate-500 mb-6">Gestione los perfiles de sus expertos técnicos y comerciales</p>
        <TabbedProfile suggestedCodigo={suggestedCodigo} allExperts={allExperts} />
      </div>
    </div>
  );
}

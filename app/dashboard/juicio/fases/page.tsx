import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { expertos, sesiones, encuestasFase1, encuestasFase2, encuestasFase3 } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2, FlaskConical, CircleDotDashed, ShoppingCart } from 'lucide-react';

interface PhaseCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  hasSession: boolean;
  hasSurvey: boolean;
  disabled: boolean;
  disabledReason?: string;
}

function PhaseCard({ title, description, icon, link, hasSession, hasSurvey, disabled, disabledReason }: PhaseCardProps) {
  return (
    <Card className={`flex flex-col ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{description}</div>
        {hasSurvey && (
          <div className="flex items-center text-xs text-muted-foreground mt-2">
            <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> Completada
          </div>
        )}
        {!hasSession && !disabled && (
          <Link href={link} className="mt-4 block">
            <Button>Iniciar</Button>
          </Link>
        )}
        {hasSession && !hasSurvey && !disabled && (
          <Link href={link} className="mt-4 block">
            <Button>Continuar</Button>
          </Link>
        )}
        {disabled && disabledReason && (
          <p className="text-red-500 text-sm mt-2">{disabledReason}</p>
        )}
        {hasSurvey && (
          <Link href={`${link}/resumen`} className="mt-4 block">
            <Button variant="secondary">Ver Resumen</Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export default async function JuicioFasesPage({ searchParams }: { searchParams: Promise<{ expertoId?: string }> }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const params = await searchParams;
  const expertoCodigo = params.expertoId;

  if (!expertoCodigo) {
    redirect('/dashboard/juicio/perfil');
  }

  const [expert] = await db.select().from(expertos).where(eq(expertos.codigo, expertoCodigo));

  if (!expert) {
    redirect('/dashboard/juicio/perfil');
  }

  const userRole = expert.rolActual;
  const marcasDomina = JSON.parse(expert.marcasDomina || '[]');

  const completedSessions = await db.select({
    fase: sesiones.fase,
    id: sesiones.id
  }).from(sesiones).where(eq(sesiones.expertoId, expert.id));

  const hasSession = (phase: string) => completedSessions.some(s => s.fase === phase);

  const f1SessionIds = completedSessions.filter(s => s.fase === 'fase1_categoria').map(s => s.id);
  const f1Surveys = f1SessionIds.length > 0
    ? await db.select({ id: encuestasFase1.sesionId }).from(encuestasFase1).where(sql`${encuestasFase1.sesionId} IN (${f1SessionIds.join(',')})`)
    : [];
  const hasF1Survey = f1Surveys.length > 0;

  const f2SessionIds = completedSessions.filter(s => s.fase === 'fase2_libre').map(s => s.id);
  const f2Surveys = f2SessionIds.length > 0
    ? await db.select({ id: encuestasFase2.sesionId }).from(encuestasFase2).where(sql`${encuestasFase2.sesionId} IN (${f2SessionIds.join(',')})`)
    : [];
  const hasF2Survey = f2Surveys.length > 0;

  const f3SessionIds = completedSessions.filter(s => s.fase === 'fase3_comercial').map(s => s.id);
  const f3Surveys = f3SessionIds.length > 0
    ? await db.select({ id: encuestasFase3.sesionId }).from(encuestasFase3).where(sql`${encuestasFase3.sesionId} IN (${f3SessionIds.join(',')})`)
    : [];
  const hasF3Survey = f3Surveys.length > 0;

  // Determine disabled states and reasons
  const isFase1Disabled = userRole !== 'tecnico_especialista' || !marcasDomina.includes('Schindler');
  const fase1DisabledReason = userRole !== 'tecnico_especialista' 
    ? "Solo para técnicos especialistas" 
    : "Fase 1 solo para especialistas Schindler";

  const isFase2Disabled = userRole !== 'tecnico_especialista';
  const fase2DisabledReason = "Solo para técnicos especialistas";

  const isFase3Disabled = userRole !== 'comercial';
  const fase3DisabledReason = "Solo para rol comercial";

  return (
    <div className="container mx-auto p-4">
      <Link
        href="/dashboard/juicio/perfil"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Seleccionar Fase de Juicio</h1>
      <p className="text-lg text-gray-600 mb-4">Experto: {expert.nombre} ({expert.codigo}) - Rol: {expert.rolActual}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {userRole === 'tecnico_especialista' && (
          <PhaseCard
            title="FASE 1"
            description="Evaluación por Categorías"
            icon={<FlaskConical className="h-5 w-5 text-gray-500" />}
            link={`/dashboard/juicio/fase1?expertoId=${expert.codigo}`}
            hasSession={hasSession('fase1_categoria')}
            hasSurvey={hasF1Survey}
            disabled={isFase1Disabled}
            disabledReason={fase1DisabledReason}
          />
        )}

        {userRole === 'tecnico_especialista' && (
          <PhaseCard
            title="FASE 2"
            description="Escenario Libre"
            icon={<CircleDotDashed className="h-5 w-5 text-gray-500" />}
            link={`/dashboard/juicio/fase2?expertoId=${expert.codigo}`}
            hasSession={hasSession('fase2_libre')}
            hasSurvey={hasF2Survey}
            disabled={isFase2Disabled}
            disabledReason={fase2DisabledReason}
          />
        )}

        {userRole === 'comercial' && (
          <PhaseCard
            title="FASE 3"
            description="Evaluación Comercial"
            icon={<ShoppingCart className="h-5 w-5 text-gray-500" />}
            link={`/dashboard/juicio/fase3?expertoId=${expert.codigo}`}
            hasSession={hasSession('fase3_comercial')}
            hasSurvey={hasF3Survey}
            disabled={isFase3Disabled}
            disabledReason={fase3DisabledReason}
          />
        )}
      </div>
    </div>
  );
}

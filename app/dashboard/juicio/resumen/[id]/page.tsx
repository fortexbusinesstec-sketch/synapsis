import { getCurrentUser } from '@/lib/db/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { expertos, sesiones, mensajes, encuestasFase1, encuestasFase2, encuestasFase3, miniEncuestas } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { ArrowLeft, Bot, User, ClipboardList, MessageSquare } from 'lucide-react';

const FASE_LABELS: Record<string, string> = {
  fase1_categoria: 'Fase 1 — Evaluación por Categorías',
  fase2_libre: 'Fase 2 — Escenario Libre',
  fase3_comercial: 'Fase 3 — Evaluación Comercial',
};

export default async function JuicioResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user || (user.role !== 'Auditor' && user.role !== 'JuicioExperto')) {
    redirect('/login');
  }

  const { id } = await params;
  const sessionId = Number(id);
  console.log(`[resumen] params.id="${id}" → sessionId=${sessionId}`);

  if (Number.isNaN(sessionId)) redirect('/dashboard/juicio/fases');

  let session;
  try {
    [session] = await db
      .select()
      .from(sesiones)
      .where(eq(sesiones.id, sessionId));
  } catch (e) {
    console.error(`[resumen] DB error al buscar sesión ${sessionId}:`, e);
    redirect('/dashboard/juicio/fases');
  }

  if (!session) {
    console.error(`[resumen] Sesión ${sessionId} no encontrada en DB`);
    redirect('/dashboard/juicio/fases');
  }

  let expert;
  try {
    [expert] = await db
      .select()
      .from(expertos)
      .where(eq(expertos.id, session.expertoId));
  } catch (e) {
    console.error(`[resumen] DB error al buscar experto ${session.expertoId}:`, e);
  }

  let chatMessages: { turno: number; emisor: string; contenido: string }[] = [];
  try {
    chatMessages = await db
      .select({
        turno: mensajes.turno,
        emisor: mensajes.emisor,
        contenido: mensajes.contenido,
      })
      .from(mensajes)
      .where(eq(mensajes.sesionId, sessionId))
      .orderBy(mensajes.turno, mensajes.id);
  } catch (e) {
    console.error(`[resumen] DB error al buscar mensajes:`, e);
  }

  const faseLabel = FASE_LABELS[session.fase] || session.fase;

  let survey: Record<string, string | number | null> | null = null;
  let surveyTitle = '';

  if (session.fase === 'fase1_categoria') {
    const [row] = await db.select().from(encuestasFase1).where(eq(encuestasFase1.sesionId, sessionId));
    if (row) {
      survey = {
        '¿El sistema entendió el problema?': row.p1SistemaEntendio,
        '¿La respuesta fue correcta?': row.p2RespuestaCorrecta,
        '¿Falto preguntar algo?': row.p3FaltoPreguntar,
        'Claridad para un junior (1-5)': row.p4ClaridadJunior,
        '¿Lo usaría mañana?': row.p5UsariaManana,
        'Comentario adicional': row.comentarioAdicional,
      };
      surveyTitle = 'Encuesta Fase 1';
    }
  } else if (session.fase === 'fase2_libre') {
    const [row] = await db.select().from(encuestasFase2).where(eq(encuestasFase2.sesionId, sessionId));
    if (row) {
      survey = {
        '¿Resolvió o acercó?': row.p1ResolvioAcerco,
        'Momento de la falla': row.p2MomentoFalla,
        '¿Algo peligroso?': row.p3AlgoPeligroso,
        'Viabilidad para junior (1-5)': row.p4ViabilidadJunior,
        '¿Recomendaría?': row.p5Recomendaria,
        'Comentario adicional': row.comentarioAdicional,
      };
      surveyTitle = 'Encuesta Fase 2';
    }
  } else if (session.fase === 'fase3_comercial') {
    const [row] = await db.select().from(encuestasFase3).where(eq(encuestasFase3.sesionId, sessionId));
    if (row) {
      survey = {
        '¿En qué fase consideras que está Synapsis?': row.p1ComprendeProducto,
        'Mercado objetivo': row.p2MercadoObjetivo,
        'Modelo de cobro': row.p3ModeloCobro,
        '¿Qué falta para vender?': row.p4FaltaParaVender,
        '¿Compraría?': row.p5Compraria,
        '¿Recomendaría?': row.p6Recomendaria,
        '¿Abre nuevo servicio?': row.p7AbreServicio,
        'Comentario adicional': row.comentarioAdicional,
      };
      surveyTitle = 'Encuesta Fase 3';
    }
  }

  const [miniEncuesta] = await db
    .select()
    .from(miniEncuestas)
    .where(eq(miniEncuestas.sesionId, sessionId));

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto p-4 max-w-4xl pt-8">
        <Link
          href={`/dashboard/juicio/fases?expertoId=${expert?.codigo ?? ''}`}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a fases
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-2">Resumen de Sesión</h1>
        <p className="text-slate-500 mb-8">{faseLabel}</p>

        {/* Datos del experto y sesión */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Experto</h2>
            <p className="text-sm font-bold text-slate-900">{expert?.nombre ?? '—'}</p>
            <p className="text-xs text-slate-500">{expert?.empresa ?? ''} · {expert?.rolActual ?? ''}</p>
            <p className="text-xs text-slate-400 mt-1">Código: {expert?.codigo ?? ''}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sesión</h2>
            <p className="text-sm font-bold text-slate-900">
              {session.fechaInicio ? new Date(session.fechaInicio).toLocaleString('es-CL') : '—'}
            </p>
            <p className="text-xs text-slate-500">
              Duración: {session.duracionMinutos ? `${Math.round(session.duracionMinutos)} min` : '—'}
              {' · '}Estado: {session.estado}
            </p>
            {session.modelo && <p className="text-xs text-slate-400 mt-1">Modelo: {session.modelo}</p>}
            {session.tipoActividad && <p className="text-xs text-slate-400">Tipo: {session.tipoActividad}</p>}
          </div>
        </div>

        {/* Preguntas y Respuestas */}
        {chatMessages.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Preguntas y Respuestas ({chatMessages.length})
              </h2>
            </div>
            <div className="space-y-4">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${msg.emisor === 'experto' ? '' : 'flex-row-reverse'}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      msg.emisor === 'experto'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-zinc-900 text-white'
                    }`}
                  >
                    {msg.emisor === 'experto' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.emisor === 'experto'
                        ? 'bg-blue-50 text-slate-900 rounded-tl-sm'
                        : 'bg-zinc-100 text-slate-900 rounded-tr-sm'
                    }`}
                  >
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {msg.emisor === 'experto' ? 'Experto' : 'Sistema'}
                    </div>
                    <div className="break-words whitespace-pre-wrap">{msg.contenido}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Preguntas y Respuestas
              </h2>
            </div>
            <p className="text-sm text-slate-400">No hay preguntas y respuestas registradas en esta sesión.</p>
          </div>
        )}

        {/* Mini encuesta */}
        {miniEncuesta && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
              Mini Encuesta por Actividad
            </h2>
            <p className="text-sm">
              Utilidad: <span className="font-bold">{miniEncuesta.utilidad}/5</span>
              {miniEncuesta.modo && <span> · Modo: {miniEncuesta.modo}</span>}
            </p>
          </div>
        )}

        {/* Encuesta completa */}
        {survey && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{surveyTitle}</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(survey).map(([question, answer]) => (
                <div key={question} className="border-b border-slate-100 pb-3 last:border-0">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{question}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {answer !== null && answer !== undefined ? String(answer) : '—'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

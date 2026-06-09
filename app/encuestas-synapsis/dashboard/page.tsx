import { createClient } from '@libsql/client';
import { Clock, CheckCircle2, User, Mail, Briefcase, BarChart3, Star, AlertCircle } from 'lucide-react';

function getDb() {
  return createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });
}

interface Tecnico {
  codigo_tecnico: string;
  nombre_completo: string | null;
  email: string | null;
  anos_experiencia: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  c1: string | null;
  c2: string | null;
}

interface Respuesta {
  id_pregunta: number;
  configuracion: string;
  respuesta_texto: string;
  puntuacion_utilidad: number;
  es_seleccionada: number;
}

const CONFIG_LABELS: Record<string, string> = {
  B5: 'B5 – Pipeline completo',
  E: 'E – Sin router/verificador',
  D: 'D – Solo RAG + LLM base',
};

const CONFIG_COLORS: Record<string, string> = {
  B5: 'text-blue-700 bg-blue-100',
  E: 'text-emerald-700 bg-emerald-100',
  D: 'text-amber-700 bg-amber-100',
};

async function getTecnicos(): Promise<Tecnico[]> {
  const db = getDb();
  try {
    const result = await db.execute(`
      SELECT t.codigo_tecnico, t.nombre_completo, t.email, t.anos_experiencia,
             s.fecha_inicio, s.fecha_fin, s.c1, s.c2
      FROM encuesta_tecnicos t
      LEFT JOIN sesiones_encuesta s ON t.codigo_tecnico = s.codigo_tecnico
      ORDER BY s.fecha_inicio DESC
    `);
    return result.rows as unknown as Tecnico[];
  } finally {
    db.close();
  }
}

async function getRespuestas(codigo: string): Promise<Respuesta[]> {
  const db = getDb();
  try {
    const result = await db.execute({
      sql: `SELECT id_pregunta, configuracion, respuesta_texto, puntuacion_utilidad, es_seleccionada
            FROM respuestas_tecnicos WHERE codigo_tecnico = ? ORDER BY id_pregunta`,
      args: [codigo],
    });
    return result.rows as unknown as Respuesta[];
  } finally {
    db.close();
  }
}

function StarRating({ value, max }: { value: number; max?: number }) {
  const total = max ?? 5;
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
        />
      ))}
    </div>
  );
}

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard – Encuestas Synapsis',
};

export default async function DashboardPage() {
  const tecnicos = await getTecnicos();

  const total = tecnicos.length;
  const completadas = tecnicos.filter((t) => t.fecha_fin).length;
  const enProceso = total - completadas;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Dashboard de Encuestas
          </h1>
          <span className="text-xs text-slate-400">Synapsis</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Registrados</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completadas</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-bold text-green-600">{completadas}</p>
              {total > 0 && (
                <span className="text-xs text-slate-400 font-medium">
                  ({Math.round((completadas / total) * 100)}%)
                </span>
              )}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">En Proceso</p>
            <p className="text-3xl font-bold text-amber-500 mt-1">{enProceso}</p>
          </div>
        </div>

        {tecnicos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No hay registros aún.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tecnicos.map((tecnico) => (
              <TecnicoCard key={tecnico.codigo_tecnico} tecnico={tecnico} />
            ))}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} Synapsis – Universidad Peruana de Ciencias Aplicadas
        </p>
      </div>
    </main>
  );
}

async function TecnicoCard({ tecnico }: { tecnico: Tecnico }) {
  const respuestas = await getRespuestas(tecnico.codigo_tecnico);
  const respuestasPorPregunta = respuestas.reduce<Record<number, Respuesta[]>>((acc, r) => {
    if (!acc[r.id_pregunta]) acc[r.id_pregunta] = [];
    acc[r.id_pregunta].push(r);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <details className="group">
        <summary className="flex items-center gap-4 p-4 md:p-5 cursor-pointer hover:bg-slate-50 transition-colors [&::-webkit-details-marker]:hidden">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tecnico.fecha_fin ? 'bg-green-100' : 'bg-amber-100'}`}>
            {tecnico.fecha_fin ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <Clock className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900 truncate">{tecnico.nombre_completo ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600 truncate">{tecnico.email ?? '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-600">{tecnico.anos_experiencia} años</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tecnico.fecha_fin ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {tecnico.codigo_tecnico} — {tecnico.fecha_fin ? 'Completado' : 'En proceso'}
              </span>
            </div>
          </div>
        </summary>

        <div className="border-t border-slate-100 px-4 md:px-5 py-4 space-y-6">
          {Object.entries(respuestasPorPregunta).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sin respuestas registradas.</p>
          ) : (
            Object.entries(respuestasPorPregunta).map(([pregId, configs]) => (
              <div key={pregId}>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Pregunta {pregId}
                </h4>
                <div className="grid gap-3 sm:grid-cols-3">
                  {configs.map((r) => {
                    const isBest = r.es_seleccionada === 1;
                    return (
                      <div
                        key={r.configuracion}
                        className={`rounded-xl border p-3 text-xs space-y-2 ${isBest ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200' : 'border-slate-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`font-medium px-1.5 py-0.5 rounded text-[10px] ${CONFIG_COLORS[r.configuracion] ?? 'text-slate-600 bg-slate-100'}`}>
                            {r.configuracion}
                          </span>
                          {isBest && (
                            <span className="text-[10px] font-bold text-blue-600">MEJOR</span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed line-clamp-3">{r.respuesta_texto}</p>
                        <div className="flex items-center justify-between pt-1">
                          <StarRating value={r.puntuacion_utilidad} />
                          <span className="text-[10px] text-slate-400">{r.puntuacion_utilidad}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {tecnico.c1 && tecnico.c2 && (
            <div className="border-t border-slate-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] font-medium text-slate-500 mb-1">C1 – Utilidad general</p>
                <StarRating value={Number(tecnico.c1)} />
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[11px] font-medium text-slate-500 mb-1">C2 – Comparación</p>
                <StarRating value={Number(tecnico.c2)} />
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Código: {tecnico.codigo_tecnico}</span>
            <span>
              {tecnico.fecha_inicio && `Inicio: ${new Date(tecnico.fecha_inicio).toLocaleString('es-PE')}`}
              {tecnico.fecha_fin && ` · Fin: ${new Date(tecnico.fecha_fin).toLocaleString('es-PE')}`}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}

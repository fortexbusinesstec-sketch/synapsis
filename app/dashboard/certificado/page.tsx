import { createClient } from '@libsql/client';
import { Award, User, Mail, Briefcase, BadgeCheck, Building } from 'lucide-react';
import { db } from '@/lib/db';
import { expertos } from '@/lib/db/schema';
import { getCurrentUser } from '@/lib/db/auth';

function getSurveyDb() {
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
  consentimiento: number;
  fecha_inicio: string | null;
}

async function getTecnicos(): Promise<Tecnico[]> {
  const db = getSurveyDb();
  try {
    const result = await db.execute(`
      SELECT t.codigo_tecnico, t.nombre_completo, t.email, t.anos_experiencia, t.consentimiento,
             s.fecha_inicio
      FROM encuesta_tecnicos t
      LEFT JOIN sesiones_encuesta s ON t.codigo_tecnico = s.codigo_tecnico
      WHERE t.consentimiento = 1
      ORDER BY s.fecha_inicio DESC
    `);
    return result.rows as unknown as Tecnico[];
  } finally {
    db.close();
  }
}

export const dynamic = 'force-dynamic';

export default async function CertificadoPage() {
  const user = await getCurrentUser();
  const tecnicos = await getTecnicos();
  const allExperts = await db.select().from(expertos);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 border border-amber-200">
          <Award className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Certificado de Validación</h1>
          <p className="text-sm text-slate-500 font-medium">
            Participantes que confirmaron su consentimiento en el proceso de validación
          </p>
        </div>
      </div>

      {/* Técnicos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Técnicos Validadores</h2>
          <span className="text-xs font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
            {tecnicos.length}
          </span>
        </div>

        {tecnicos.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay técnicos registrados con consentimiento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tecnicos.map((t) => (
              <div
                key={t.codigo_tecnico}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-black shrink-0">
                    {(t.nombre_completo ?? '??').split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{t.nombre_completo ?? '—'}</p>
                    <p className="text-xs text-slate-400 font-medium">{t.codigo_tecnico}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {t.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{t.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.anos_experiencia} años de experiencia</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Consentimiento
                    </span>
                    {t.fecha_inicio && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(t.fecha_inicio).toLocaleDateString('es-PE')}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    Yo, <strong>{t.nombre_completo ?? '—'}</strong>, confirmo mi asistencia en la validación de
                    Synapsis para la Institución Universitaria Peruana de Ciencias Aplicadas.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Expertos */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-800">Expertos Participantes</h2>
          <span className="text-xs font-semibold bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
            {allExperts.length}
          </span>
        </div>

        {allExperts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay expertos registrados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allExperts.map((e) => (
              <div
                key={e.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-sm font-black shrink-0">
                    {e.nombre.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{e.nombre}</p>
                    <p className="text-xs text-slate-400 font-medium">{e.codigo}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {e.empresa && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Building className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{e.empresa}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span>{e.anosExperiencia} años de experiencia</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-xs font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {e.rolActual === 'tecnico_especialista' ? 'Técnico Especialista' : 'Comercial'}
                    </span>
                  </div>
                </div>

                {e.contacto && (
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{e.contacto}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full inline-flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    Consentimiento
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    Yo, <strong>{e.nombre}</strong>, confirmo mi asistencia en la validación de Synapsis
                    para la Institución Universitaria Peruana de Ciencias Aplicadas.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <p className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
        Synapsis – Universidad Peruana de Ciencias Aplicadas
      </p>
    </div>
  );
}

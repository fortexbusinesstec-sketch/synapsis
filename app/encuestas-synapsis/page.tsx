import { Zap, Shield, Clock, ChevronRight } from 'lucide-react';
import RegistrationForm from './form';

export const metadata = {
  title: 'Encuesta Synapsis – Validación de Asistente Técnico',
};

export default async function EncuestasLanding({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const clearCode = params.clear;
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Zap className="w-4 h-4 fill-white/40" />
            SYNAPSIS
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
            Validación de Synapsis – Sistema de Asistencia al Diagnóstico para Ascensores
          </h1>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6 text-slate-700 text-sm leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900">Estimado(a) técnico:</h2>
            <p>
              Somos un equipo de investigación de la{' '}
              <strong>Universidad Peruana de Ciencias Aplicadas (UPC)</strong>. Hemos desarrollado{' '}
              <strong>Synapsis</strong>, un sistema basado en inteligencia artificial diseñado para ayudar
              a técnicos de mantenimiento a encontrar información técnica más rápido y con mayor precisión,
              usando los manuales de ascensores.
            </p>
            <p>
              Actualmente estamos realizando un estudio para evaluar la utilidad real del sistema en el campo.
              Para ello, necesitamos su opinión experta.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-blue-500" />
              ¿En qué consiste su participación?
            </h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Le mostraremos <strong>7 preguntas o situaciones técnicas reales</strong> relacionadas con diagnósticos de ascensores.</li>
              <li>Para cada pregunta, verá <strong>tres posibles respuestas</strong> generadas por diferentes versiones del sistema.</li>
              <li>Usted deberá:
                <ul className="list-[circle] pl-5 mt-1 space-y-0.5">
                  <li>Calificar cada respuesta según su <strong>utilidad práctica</strong> (escala del 1 al 5).</li>
                  <li>Señalar cuál de las tres respuestas le parece <strong>más útil</strong> para resolver el problema.</li>
                </ul>
              </li>
              <li>Al final, responderá <strong>2 preguntas adicionales</strong> sobre la utilidad general del sistema.</li>
              <li>El tiempo estimado para completar la encuesta es de <strong>10 a 15 minutos</strong>.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              Uso de la información
            </h3>
            <p>
              Los resultados de esta encuesta serán utilizados exclusivamente con fines de investigación académica.
              Forman parte de un estudio que busca medir la calidad del sistema Synapsis y podrían ser publicados
              en la revista internacional <strong>Applied Soft Computing (Elsevier)</strong>.
            </p>
            <p>
              En dicha publicación no aparecerán nombres, apellidos ni ningún dato personal que permita identificarle
              a usted o a su empresa. Solo se reportarán resultados agregados (promedios, porcentajes, etc.) y, en
              todo caso, códigos anónimos como &quot;Técnico 1&quot;, &quot;Técnico 2&quot;, etc.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">Anonimización – Opcional pero recomendada</h3>
            <p>
              Si lo prefiere, puede marcar la casilla <strong>&quot;Solicito anonimizar mis datos&quot;</strong>.
              En ese caso:
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>No le pediremos su nombre completo.</li>
              <li>Usted será identificado únicamente con un código (ej. T01).</li>
              <li>Su empresa o lugar de trabajo nunca será mencionado.</li>
            </ul>
            <p>
              Si no marca esa opción, registraremos su nombre, pero igualmente se reemplazará por un código
              anónimo antes de cualquier publicación.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">Consentimiento voluntario</h3>
            <p>
              Su participación es completamente voluntaria. Puede retirarse en cualquier momento sin dar
              explicaciones y sin ninguna consecuencia. El hecho de avanzar en la encuesta implica que acepta
              las condiciones descritas.
            </p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-slate-900">¿Preguntas o dudas?</h3>
            <p>
              Si tiene alguna duda sobre el estudio o sobre el uso de sus datos, puede contactar al investigador
               responsable:<br />
              <strong>Fabrizio Sebastian Diaz Flores - u202010379</strong>
              <span className="text-slate-400"> / </span>
              <strong>Edson Joel Linares Huamani - u202117396</strong>
            </p>
          </section>
        </div>

        {/* Registration Form */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            Comenzar encuesta
          </h2>
          <RegistrationForm clearCode={clearCode} />
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-8">
          © {new Date().getFullYear()} Synapsis – Universidad Peruana de Ciencias Aplicadas
        </p>
      </div>
    </main>
  );
}

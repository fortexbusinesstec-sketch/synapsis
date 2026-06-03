"use client";

import { useState } from "react";
import { Copy, Check, FileText, MessageSquare, MessagesSquare, ShoppingCart } from "lucide-react";

const CATEGORIAS = [
  { id: "CAT-01", nombre: "Sistema de Tracción, Frenado y Control de Potencia Dinámica", tipo: "Mecánico/Eléctrico/Electrónico", frecuencia: "Alta" },
  { id: "CAT-02", nombre: "Lógica de Control Central, Distribución de Energía y Redes de Comunicación Bus", tipo: "Electrónico/Eléctrico", frecuencia: "Media" },
  { id: "CAT-03", nombre: "Cadena de Seguridad, Monitoreo Estático y Dispositivos de Emergencia Activa", tipo: "Seguridad/Eléctrico", frecuencia: "Alta" },
  { id: "CAT-04", nombre: "Cadenas Cinemáticas, Operadores, Interconexión y Protecciones de Puertas", tipo: "Mecánico/Electrónico/Seguridad", frecuencia: "Alta" },
  { id: "CAT-05", nombre: "Sistemas de Posicionamiento Geométrico en Hueco, Pesaje de Carga e Interfaz de Usuario", tipo: "Electrónico", frecuencia: "Media" },
];

export default function PreguntasPorFase() {
  const [fase, setFase] = useState<1 | 2 | 3>(1);

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">
        Guía para técnicos: explicación de cada fase antes de la reunión. Puedes copiar y pegar el contenido para compartirlo.
      </p>

      {/* Selector de fase */}
      <div className="flex gap-2">
        {([1, 2, 3] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFase(f)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
              fase === f
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f === 1 ? <MessagesSquare className="w-4 h-4" /> : f === 2 ? <MessageSquare className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
            Fase {f}
          </button>
        ))}
      </div>

      {fase === 1 && <Fase1Guide />}
      {fase === 2 && <Fase2Guide />}
      {fase === 3 && <Fase3Guide />}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado" : "Copiar todo"}
    </button>
  );
}

function Fase1Guide() {
  const copyContent = `FASE 1 — EVALUACIÓN POR CATEGORÍAS
===================================

🎯 OBJETIVO:
Evaluar la capacidad del sistema para diagnosticar fallas técnicas en ascensores Schindler (modelos 3300 y 5500) dentro de categorías predefinidas.

📋 DINÁMICA:
La fase consta de 6 actividades obligatorias:

1️⃣ SESIÓN (Actividad 1) — Conversación libre de hasta 5 turnos
   - Seleccionas una categoría y un modelo
   - Planteas un problema técnico relacionado con esa categoría
   - El sistema responde; puedes repreguntar hasta 5 veces
   - Evalúas con estrella (1-5) al finalizar

2️⃣ a 6️⃣ PREGUNTAS INDIVIDUALES (Actividades 2 a 6)
   - Cada una: 1 pregunta, 1 respuesta
   - Seleccionas categoría y modelo en cada una
   - NO puedes repreguntar
   - Evalúas con estrella (1-5) al finalizar cada una

🏷️ CATEGORÍAS DISPONIBLES (5):
${CATEGORIAS.map(c => `   • ${c.id} — ${c.nombre} (${c.tipo}, Frecuencia: ${c.frecuencia})`).join('\n')}

🔧 MODELOS: Schindler 3300 | Schindler 5500

📝 EJEMPLO DE PREGUNTA:
"Tengo un Schindler 3300 que se detiene entre pisos con código de error 32 en el variador. ¿Qué debo revisar primero?"

✅ AL FINALIZAR: Encuesta general sobre el sistema (5 preguntas).

📌 IMPORTANTE:
- Sé específico con el modelo, componente y síntoma
- La idea es poner a prueba qué tan bien el sistema entiende el problema
- Puedes usar fallas reales que hayas visto en terreno`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Fase 1 — Evaluación por Categorías</h2>
        <CopyButton text={copyContent} />
      </div>

      <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-bold">
        <h3>🎯 Objetivo</h3>
        <p>
          Evaluar la capacidad del sistema para diagnosticar fallas técnicas en ascensores Schindler (modelos 3300 y 5500) dentro de categorías predefinidas.
        </p>

        <h3>📋 Dinámica</h3>
        <p>La fase consta de <strong>6 actividades obligatorias</strong>:</p>

        <p>
          <strong>1️⃣ SESIÓN (Actividad 1)</strong> — Conversación libre de hasta 5 turnos.
          Seleccionas una categoría y un modelo, planteas un problema técnico relacionado con esa categoría, el sistema responde y puedes repreguntar hasta 5 veces. Al finalizar evalúas la actividad con estrellas (1-5).
        </p>

        <p>
          <strong>2️⃣ a 6️⃣ PREGUNTAS INDIVIDUALES (Actividades 2 a 6)</strong> — Cada una es 1 pregunta con 1 respuesta. Seleccionas categoría y modelo en cada una. <strong>NO puedes repreguntar.</strong> Al finalizar cada una evalúas con estrellas (1-5).
        </p>

        <h3>🏷️ Categorías disponibles (5)</h3>
        <ul>
          {CATEGORIAS.map(c => (
            <li key={c.id}><strong>{c.id}</strong> — {c.nombre} <em>({c.tipo}, Frecuencia: {c.frecuencia})</em></li>
          ))}
        </ul>

        <h3>🔧 Modelos</h3>
        <p>Schindler 3300 | Schindler 5500</p>

        <h3>📝 Ejemplo de pregunta</h3>
        <blockquote>
          "Tengo un Schindler 3300 que se detiene entre pisos con código de error 32 en el variador. ¿Qué debo revisar primero?"
        </blockquote>

        <h3>✅ Al finalizar</h3>
        <p>Encuesta general sobre el sistema (5 preguntas).</p>

        <h3>📌 Importante</h3>
        <ul>
          <li>Sé específico con el modelo, componente y síntoma</li>
          <li>La idea es poner a prueba qué tan bien el sistema entiende el problema</li>
          <li>Puedes usar fallas reales que hayas visto en terreno</li>
        </ul>
      </div>
    </div>
  );
}

function Fase2Guide() {
  const copyContent = `FASE 2 — ESCENARIO LIBRE
===================================

🎯 OBJETIVO:
Evaluar la capacidad del sistema para diagnosticar un escenario técnico libre definido por ti, sin categorías predefinidas.

📋 DINÁMICA:
La fase consta de 5 actividades obligatorias + 1 opcional:

📝 ESCENARIO (al inicio):
   - Escribes un escenario técnico completo (modelo, pisos, error, síntomas, contexto)
   - Este escenario se usará como contexto para TODAS las preguntas
   - Ejemplo: "Ascensor Schindler 3300 de 8 pisos, error 32 en variador, se para entre pisos con carga media..."

1️⃣ a 5️⃣ PREGUNTAS INDIVIDUALES (OBLIGATORIAS)
   - Cada una: 1 pregunta relacionada a tu escenario, 1 respuesta del sistema
   - NO puedes repreguntar
   - Evalúas con estrella (1-5) al finalizar cada una

6️⃣ SESIÓN (OPCIONAL)
   - Se habilita solo después de completar las 5 preguntas individuales
   - Conversación libre de hasta 5 turnos
   - Puedes profundizar el diagnóstico

🔧 MODELO: Debes seleccionar 3300 o 5500 al iniciar cada actividad (mismo que tu escenario).

📝 EJEMPLO DE PREGUNTA:
Basado en tu escenario, preguntas como:
   - "¿Qué debería medir primero según el código de error?"
   - "¿El variador podría estar dañado o es un falso contacto?"
   - "¿Qué componentes del circuito de seguridad debo revisar?"

✅ AL FINALIZAR:
Encuesta general (5 preguntas) sobre resolución, seguridad, viabilidad para junior y recomendación.

📌 IMPORTANTE:
- El escenario debe ser lo más realista y detallado posible
- Todas las preguntas deben girar en torno al mismo escenario
- Piensa en una falla real que hayas enfrentado
- La sesión opcional (actividad 6) te permite profundizar si es necesario`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Fase 2 — Escenario Libre</h2>
        <CopyButton text={copyContent} />
      </div>

      <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-bold">
        <h3>🎯 Objetivo</h3>
        <p>
          Evaluar la capacidad del sistema para diagnosticar un <strong>escenario técnico libre</strong> definido por ti, sin categorías predefinidas.
        </p>

        <h3>📋 Dinámica</h3>
        <p>La fase consta de <strong>5 actividades obligatorias + 1 opcional</strong>:</p>

        <p>
          <strong>📝 Escenario (al inicio)</strong> — Escribes un escenario técnico completo (modelo, pisos, error, síntomas, contexto). Este escenario se usa como contexto para TODAS las preguntas.
        </p>

        <p>
          <strong>1️⃣ a 5️⃣ PREGUNTAS INDIVIDUALES (OBLIGATORIAS)</strong> — Cada una es 1 pregunta relacionada a tu escenario, con 1 respuesta del sistema. <strong>NO puedes repreguntar.</strong> Al finalizar cada una evalúas con estrellas (1-5).
        </p>

        <p>
          <strong>6️⃣ SESIÓN (OPCIONAL)</strong> — Se habilita solo después de completar las 5 preguntas individuales. Conversación libre de hasta 5 turnos para profundizar el diagnóstico.
        </p>

        <h3>🔧 Modelo</h3>
        <p>Debes seleccionar 3300 o 5500 al iniciar cada actividad (debe coincidir con tu escenario).</p>

        <h3>📝 Ejemplo de escenario</h3>
        <blockquote>
          "Ascensor Schindler 3300 de 8 pisos, error 32 en variador, se para entre pisos con carga media..."
        </blockquote>

        <h3>💬 Ejemplos de preguntas</h3>
        <p>Basado en tu escenario, preguntas como:</p>
        <ul>
          <li>"¿Qué debería medir primero según el código de error?"</li>
          <li>"¿El variador podría estar dañado o es un falso contacto?"</li>
          <li>"¿Qué componentes del circuito de seguridad debo revisar?"</li>
        </ul>

        <h3>✅ Al finalizar</h3>
        <p>Encuesta general (5 preguntas) sobre resolución, seguridad, viabilidad para junior y recomendación.</p>

        <h3>📌 Importante</h3>
        <ul>
          <li>El escenario debe ser lo más realista y detallado posible</li>
          <li>Todas las preguntas deben girar en torno al mismo escenario</li>
          <li>Piensa en una falla real que hayas enfrentado</li>
          <li>La sesión opcional (actividad 6) te permite profundizar si es necesario</li>
        </ul>
      </div>
    </div>
  );
}

function Fase3Guide() {
  const copyContent = `FASE 3 — EVALUACIÓN COMERCIAL
===================================

🎯 OBJETIVO:
Evaluar el potencial comercial del sistema Synapsis desde una perspectiva de mercado.

📋 DINÁMICA:
Una vez completadas las Fases 1 y 2 (rol técnico especialista), el experto pasa a rol comercial y responde una encuesta de 7 preguntas:

1️⃣ ¿En qué fase consideras que está Synapsis? (Básica / Intermedia / Avanzada)

2️⃣ ¿Quién debería comprar esto? (Empresas de ascensores / Mantención / Técnicos independientes / Fabricantes / Capacitación / Otro)

3️⃣ ¿Cómo debería cobrarse? (Suscripción mensual / Por consulta / Licencia anual / Freemium / Por usuario / Otro)

4️⃣ ¿Qué le falta al sistema para que usted diga "esto se vende"?

5️⃣ ¿Compraría esto para su empresa o equipo? (Sí / No / Con condiciones)

6️⃣ ¿Recomendaría esto a un colega del rubro? (Sí / No / Con modificaciones)

7️⃣ ¿Esto abre algún servicio o negocio nuevo? (Sí / No)

📌 IMPORTANTE:
- Responde con honestidad, no hay respuestas correctas o incorrectas
- Tu opinión como experto en terreno es valiosa para definir el producto`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Fase 3 — Evaluación Comercial</h2>
        <CopyButton text={copyContent} />
      </div>

      <div className="prose prose-sm max-w-none text-slate-700 prose-headings:text-slate-900 prose-headings:font-bold">
        <h3>🎯 Objetivo</h3>
        <p>Evaluar el potencial comercial del sistema Synapsis desde una perspectiva de mercado.</p>

        <h3>📋 Dinámica</h3>
        <p>Una vez completadas las Fases 1 y 2 (rol técnico especialista), el experto pasa a rol comercial y responde una <strong>encuesta de 7 preguntas</strong>:</p>

        <ol>
          <li><strong>¿En qué fase consideras que está Synapsis?</strong> (Básica / Intermedia / Avanzada)</li>
          <li><strong>¿Quién debería comprar esto?</strong> (Empresas de ascensores / Mantención / Técnicos independientes / Fabricantes / Capacitación / Otro)</li>
          <li><strong>¿Cómo debería cobrarse?</strong> (Suscripción mensual / Por consulta / Licencia anual / Freemium / Por usuario / Otro)</li>
          <li><strong>¿Qué le falta al sistema para que usted diga "esto se vende"?</strong></li>
          <li><strong>¿Compraría esto para su empresa o equipo?</strong> (Sí / No / Con condiciones)</li>
          <li><strong>¿Recomendaría esto a un colega del rubro?</strong> (Sí / No / Con modificaciones)</li>
          <li><strong>¿Esto abre algún servicio o negocio nuevo?</strong> (Sí / No)</li>
        </ol>

        <h3>📌 Importante</h3>
        <ul>
          <li>Responde con honestidad, no hay respuestas correctas o incorrectas</li>
          <li>Tu opinión como experto en terreno es valiosa para definir el producto</li>
        </ul>
      </div>
    </div>
  );
}

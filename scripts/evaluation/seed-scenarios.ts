/**
 * Seed de escenarios multi-turno para el ablation study.
 * Ejecutar: npx tsx scripts/seed-scenarios.ts
 */
import { createClient } from '@libsql/client';
import { createId }     from '@paralleldrive/cuid2';

const url   = process.env.TURSO_DATABASE_URL!;
const token = process.env.TURSO_AUTH_TOKEN!;
if (!url) { console.error('TURSO_DATABASE_URL no definida'); process.exit(1); }

const client = createClient({ url, authToken: token });

interface ScenarioInput {
  id:                   string;
  title:                string;
  description:          string;
  category:             string;
  equipment_model:      string | null;
  difficulty:           string;
  resolution_criteria:  string;
  turns: Array<{
    turn_number:          number;
    technician_message:   string;
    turn_intent:          string;
    expected_behavior:    string;
    is_ambiguous:         number;
    introduces_new_data:  number;
  }>;
}

const SCENARIOS: ScenarioInput[] = [
  {
    id:          'SC01',
    title:       'Diagnóstico progresivo — Falla de puertas E07 en 3300',
    description: 'El técnico reporta puertas que no abren. El sistema debe progresivamente aclarar síntomas, pedir código y modelo, y finalmente diagnosticar causa raíz del E07.',
    category:    'diagnostico_tecnico',
    equipment_model: '3300',
    difficulty:  'medium',
    resolution_criteria: 'El sistema llega a diagnosticar la causa del E07 (sensor de cierre de puerta) y proporciona pasos de verificación concretos en los últimos 2 turnos.',
    turns: [
      {
        turn_number: 1,
        technician_message: 'Las puertas no abren.',
        turn_intent: 'ambiguous_symptom',
        expected_behavior: 'Pedir más datos: modelo, código de error, estado visual.',
        is_ambiguous: 1,
        introduces_new_data: 0,
      },
      {
        turn_number: 2,
        technician_message: 'Es un Schindler 3300, la SCIC muestra E07.',
        turn_intent: 'data_provision',
        expected_behavior: 'Reconocer E07 en 3300 como fallo de sensor de cierre. Preguntar estado de DCS/sensor.',
        is_ambiguous: 0,
        introduces_new_data: 1,
      },
      {
        turn_number: 3,
        technician_message: '¿Qué sensor debo revisar primero?',
        turn_intent: 'procedure_request',
        expected_behavior: 'Indicar sensor DCS en la puerta de piso y el procedimiento de verificación de continuidad.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
      {
        turn_number: 4,
        technician_message: 'El DCS marca continuidad pero las puertas siguen sin abrir.',
        turn_intent: 'data_provision',
        expected_behavior: 'Refinar hipótesis: descartar DCS, sugerir revisar el motor de puerta o el freno de puerta.',
        is_ambiguous: 0,
        introduces_new_data: 1,
      },
      {
        turn_number: 5,
        technician_message: '¿Puede ser el motor de la puerta?',
        turn_intent: 'confirmation_request',
        expected_behavior: 'Confirmar que sí puede ser el motor DOE. Dar pasos de diagnóstico del motor y criterio de sustitución.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
    ],
  },
  {
    id:          'SC02',
    title:       'Procedimiento de evacuación — Schindler 5500',
    description: 'El técnico necesita evacuar a un pasajero atrapado en un 5500. El sistema debe guiar el procedimiento de evacuación manual PEBO paso a paso.',
    category:    'secuencial',
    equipment_model: '5500',
    difficulty:  'hard',
    resolution_criteria: 'El sistema completa los pasos de evacuación PEBO correctamente y el técnico confirma que el pasajero fue liberado.',
    turns: [
      {
        turn_number: 1,
        technician_message: 'Hay un pasajero atrapado en el 5500, el ascensor paró entre pisos.',
        turn_intent: 'emergency_report',
        expected_behavior: 'Modo EMERGENCY. Preguntar modelo exacto y si hay alimentación. Indicar que la evacuación es prioritaria.',
        is_ambiguous: 0,
        introduces_new_data: 1,
      },
      {
        turn_number: 2,
        technician_message: 'Sí, el 5500 tiene alimentación. ¿Cómo lo evacúo?',
        turn_intent: 'procedure_request',
        expected_behavior: 'Iniciar procedimiento PEBO paso 1: abrir cuadro de maniobra y localizar palanca de rescate.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
      {
        turn_number: 3,
        technician_message: 'Abrí el cuadro, veo la palanca roja. ¿Qué hago?',
        turn_intent: 'step_confirmation',
        expected_behavior: 'Paso 2: cortar alimentación y activar freno manual. Dar acción exacta sobre la palanca.',
        is_ambiguous: 0,
        introduces_new_data: 1,
      },
      {
        turn_number: 4,
        technician_message: 'Activé el freno. El ascensor se movió un poco. ¿Cómo abro las puertas?',
        turn_intent: 'step_confirmation',
        expected_behavior: 'Paso 3: usar llave de triángulo para abrir puertas del piso más cercano. Indicar precauciones de seguridad.',
        is_ambiguous: 0,
        introduces_new_data: 1,
      },
    ],
  },
  {
    id:          'SC03',
    title:       'Consulta informativa — Arquitectura del SCIC',
    description: 'Un técnico nuevo pregunta sobre el SCIC del 3300: qué es, cómo funciona y sus parámetros principales. Evaluación de capacidad de enseñanza progresiva.',
    category:    'diagnostico_tecnico',
    equipment_model: '3300',
    difficulty:  'easy',
    resolution_criteria: 'Al final de la sesión el técnico comprende qué es el SCIC, sus funciones y cómo interpretar sus indicadores.',
    turns: [
      {
        turn_number: 1,
        technician_message: '¿Qué es el SCIC?',
        turn_intent: 'education_info',
        expected_behavior: 'Modo LEARNING. Explicar que SCIC es el controlador de seguridad integrado del 3300. Mencionar sus funciones principales.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
      {
        turn_number: 2,
        technician_message: '¿Qué LEDs tiene y qué significan?',
        turn_intent: 'education_info',
        expected_behavior: 'Listar LEDs del SCIC con su significado: PWR, ERR, COM, etc.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
      {
        turn_number: 3,
        technician_message: '¿Cómo accedo a la tabla de errores del SCIC?',
        turn_intent: 'procedure_request',
        expected_behavior: 'Modo PROCEDURAL. Indicar cómo navegar el menú del SCIC para ver el historial de errores.',
        is_ambiguous: 0,
        introduces_new_data: 0,
      },
    ],
  },
];

async function seed() {
  let created = 0;
  let skipped = 0;

  for (const s of SCENARIOS) {
    // Verificar si ya existe
    const existing = await client.execute({
      sql:  'SELECT id FROM ablation_scenarios WHERE id = ?',
      args: [s.id],
    });

    if (existing.rows.length > 0) {
      console.log(`[SKIP] ${s.id} — ya existe`);
      skipped++;
      continue;
    }

    // Insertar escenario
    await client.execute({
      sql: `INSERT INTO ablation_scenarios
              (id, title, description, category, equipment_model, difficulty, max_turns, resolution_criteria, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        s.id, s.title, s.description, s.category,
        s.equipment_model, s.difficulty, s.turns.length, s.resolution_criteria,
      ],
    });

    // Insertar turnos
    for (const t of s.turns) {
      await client.execute({
        sql: `INSERT INTO ablation_scenario_turns
                (id, scenario_id, turn_number, technician_message, turn_intent, expected_behavior, is_ambiguous, introduces_new_data)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          createId(), s.id, t.turn_number, t.technician_message,
          t.turn_intent, t.expected_behavior, t.is_ambiguous, t.introduces_new_data,
        ],
      });
    }

    console.log(`[OK] ${s.id} — ${s.title} (${s.turns.length} turnos)`);
    created++;
  }

  console.log(`\nResumen: ${created} creados, ${skipped} omitidos.`);
  process.exit(0);
}

seed().catch((err) => { console.error(err); process.exit(1); });

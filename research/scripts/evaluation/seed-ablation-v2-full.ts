/**
 * Script para resetear el banco de preguntas de ablación
 * 1. Borra scores, chunks, runs y summary previos (limpieza total)
 * 2. Borra todas las preguntas actuales
 * 3. Inserta el nuevo set de 20 preguntas (P01-P20)
 *
 * Ejecutar: npx tsx scripts/seed-ablation-v2-full.ts
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

// Cargar .env manualmente
try {
  const envPath = resolve(process.cwd(), '.env');
  const lines   = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch { /* .env no encontrado */ }

const client = createClient({
  url:       process.env.TURSO_URL_TESIS!,
  authToken: process.env.TURSO_TOKEN_TESIS,
});

const questions = [
  {
    "id": "P01",
    "category": "diagnostico_tecnico",
    "category_number": 1,
    "question_text": "¿Qué significa el código de error 0020 en un ascensor Schindler 3300?",
    "expected_agent_critical": "bibliotecario+analista",
    "difficulty": "medium",
    "ground_truth": "E_ELEVATOR_S_CHAIN_BRIDGED_PERMANENT. El circuito de seguridad no se abrió en el momento en que se esperaba que se abriera (por ejemplo, cuando se abren las puertas).",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P02",
    "category": "diagnostico_tecnico",
    "category_number": 1,
    "question_text": "En un Schindler 5500, ¿qué indica el mensaje 'BatFlt' en el SMLCD?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "easy",
    "ground_truth": "Indica que se produjo un fallo en la batería de alimentación de emergencia.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P03",
    "category": "diagnostico_tecnico",
    "category_number": 1,
    "question_text": "Si la HMI de un 3300 muestra el error 1514, ¿cuál es el diagnóstico y qué debe comprobarse?",
    "expected_agent_critical": "bibliotecario+analista",
    "difficulty": "hard",
    "ground_truth": "Diagnóstico: E_FC_CONVERTER_OVERTEMPERATURE. La temperatura del disipador de calor está por encima de +75 °C. Se debe comprobar: el flujo de aire frío, que el disipador no esté sucio, la temperatura ambiental y la frecuencia de conmutación.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P04",
    "category": "diagnostico_tecnico",
    "category_number": 1,
    "question_text": "¿Qué significa el mensaje 'Ovrload' en el SMLCD de un Schindler 5500?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "easy",
    "ground_truth": "Indica que el ascensor está sobrecargado.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P05",
    "category": "ambigua",
    "category_number": 2,
    "question_text": "Técnico reporta: 'El ascensor no se mueve'.",
    "expected_agent_critical": "estratega",
    "difficulty": "medium",
    "ground_truth": "La IA debe solicitar la siguiente información: 1. ¿Hay algún código de error en la HMI o SMLCD? 2. ¿Cuál es el estado del circuito de seguridad? 3. ¿En qué modo de funcionamiento está el equipo (Normal, Inspección, ESE)? 4. ¿Están las puertas cerradas y bloqueadas?.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 1,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P06",
    "category": "ambigua",
    "category_number": 2,
    "question_text": "El técnico indica: 'La puerta no cierra'.",
    "expected_agent_critical": "estratega",
    "difficulty": "medium",
    "ground_truth": "La IA debe pedir: 1. ¿Se activa el error 0301? 2. ¿Hay obstáculos visibles en el carril o fotocélulas? 3. ¿Está bloqueada la cortina óptica (lámpara RPHT)? 4. ¿Cuál es el estado de la señal KET-S?.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 1,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P07",
    "category": "ambigua",
    "category_number": 2,
    "question_text": "El técnico menciona: 'Hay un ruido extraño en el equipo'.",
    "expected_agent_critical": "estratega",
    "difficulty": "hard",
    "ground_truth": "La IA debe pedir: 1. ¿El ruido proviene de la cabina, del hueco o del cuarto de máquinas/tracción? 2. ¿Ocurre durante el viaje, en la aceleración o en la frenada? 3. ¿Es un ruido mecánico (rozamiento) o eléctrico? 4. ¿Estado de lubricación de los rieles y guías?.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 1,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P08",
    "category": "ambigua",
    "category_number": 2,
    "question_text": "Técnico reporta: 'No puedo acceder a los parámetros'.",
    "expected_agent_critical": "estratega",
    "difficulty": "medium",
    "ground_truth": "La IA debe preguntar: 1. ¿Está intentando acceder a través del Menú 40? 2. ¿Aparece el mensaje 'Login' o el acceso está bloqueado? 3. ¿Se ha habilitado el modo de configuración (cambiando 0 a 1 en el menú 40)? 4. ¿Tiene instalada una tarjeta SIM válida?.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 1,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P09",
    "category": "secuencial",
    "category_number": 3,
    "question_text": "¿Cuál es el procedimiento para registrar las LOP (Menú 40) en el Schindler 3300?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "hard",
    "ground_truth": "1. Entrar en modo configuración (Menú 40, cambiar 0 por 1). 2. Seleccionar CF00 y confirmar con 'OK'. 3. Cambiar a [LE 00] con los botones subir/bajar. 4. Pulsar 'OK' (el conteo LOP se indica mediante [LC] parpadeando). 5. Una vez terminado, salir del modo configuración desactivando el menú 40 (cambiar [40 1] a [40 0]).",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 1,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P10",
    "category": "secuencial",
    "category_number": 3,
    "question_text": "¿Cómo se realiza un Reset normal de la maniobra en un Schindler 3300/5500?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "easy",
    "ground_truth": "1. Localizar el botón RESET en el circuito impreso de control (SMICHMI o SCIC). 2. Pulsar el botón una vez. 3. Esperar hasta que la inicialización y el arranque del software hayan finalizado.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 1,
    "is_ambiguous": 0,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P11",
    "category": "secuencial",
    "category_number": 3,
    "question_text": "Indique los pasos para la evacuación manual PEBO en un Schindler 5500.",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "hard",
    "ground_truth": "1. Desconectar el interruptor principal JH. 2. Activar el interruptor de evacuación JEM. 3. Pulsar el botón DEM; los frenos se abrirán por impulsos. 4. Continuar hasta que la cabina llegue a la zona de puerta (indicado por el LED LUET encendido y distancia en SMLCD). 5. Desactivar JEM y conectar JH.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 1,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P12",
    "category": "secuencial",
    "category_number": 3,
    "question_text": "Procedimiento para la calibración manual del par previo (Menú 123) en el Schindler 3300.",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "hard",
    "ground_truth": "1. Asegurarse de que la cabina esté completamente montada y vacía (0 kg). 2. En la HMI, seleccionar menú principal 10, submenú 123. 3. Cambiar de [123 0] a [123 1] y pulsar OK. 4. La cabina viaja al piso de la LDU y abre puertas; pulsar OK. 5. La cabina viaja al piso más alto y luego al más bajo para calibrar. 6. Cambiar de [123 1] a [123 0] para finalizar.",
    "requires_visual": 0,
    "requires_enrichment": 0,
    "requires_ordering": 1,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P13",
    "category": "enriquecimiento",
    "category_number": 4,
    "question_text": "¿Cuál es el rango de resistencia nominal para las bobinas de freno MGB y MGB1 en máquinas FML/PML 160/200?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "medium",
    "ground_truth": "La resistencia debe estar en el rango de 190 a 1700 Ω.",
    "requires_visual": 0,
    "requires_enrichment": 1,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P14",
    "category": "enriquecimiento",
    "category_number": 4,
    "question_text": "Defina qué es el estado 'RdvBVR' en la interfaz SMLCD del Schindler 5500.",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "medium",
    "ground_truth": "Listo para un reset del limitador de velocidad. Indica que la maniobra ha detectado la conexión GBP_RESET y solo permitirá viajes de inspección o recuperación para resetear el limitador manualmente.",
    "requires_visual": 0,
    "requires_enrichment": 1,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P15",
    "category": "enriquecimiento",
    "category_number": 4,
    "question_text": "¿Qué requisitos de sensibilidad debe cumplir el multímetro para diagnósticos en el CO SC 1.0 (Schindler 5500)?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "medium",
    "ground_truth": "Debe tener una sensibilidad mayor a 25 kΩ/V y un rango de medición de hasta 1000 VDC.",
    "requires_visual": 0,
    "requires_enrichment": 1,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P16",
    "category": "enriquecimiento",
    "category_number": 4,
    "question_text": "¿Qué componente representa la abreviatura KTC en la documentación de Schindler?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "easy",
    "ground_truth": "Contact door car (Contacto de puerta de cabina).",
    "requires_visual": 0,
    "requires_enrichment": 1,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "General",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P17",
    "category": "visual",
    "category_number": 5,
    "question_text": "¿Dónde se encuentra ubicada físicamente la HMI en un sistema Bionic 5?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "easy",
    "ground_truth": "Se encuentra en la LDU (Landing Door Unit), ubicada en el marco de la puerta de piso del piso superior (o el piso inferior a este si no está disponible).",
    "requires_visual": 1,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P18",
    "category": "visual",
    "category_number": 5,
    "question_text": "En la placa SMICHMI21, ¿qué indica el LED azul 'LUET'?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "medium",
    "ground_truth": "Indica que el ascensor se encuentra en la zona de puerta (LUET: Ascensor en zona de puerta).",
    "requires_visual": 1,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P19",
    "category": "visual",
    "category_number": 5,
    "question_text": "En una máquina FML/PML 160/200, ¿qué patillas corresponden al contacto KB cerrado?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "hard",
    "ground_truth": "Corresponden a las patillas 1 y 2.",
    "requires_visual": 1,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "5500",
    "is_active": 1,
    "created_at": 1712793600
  },
  {
    "id": "P20",
    "category": "visual",
    "category_number": 5,
    "question_text": "¿Dónde están ubicadas las baterías de respaldo en el sistema Schindler 3300?",
    "expected_agent_critical": "bibliotecario",
    "difficulty": "medium",
    "ground_truth": "Están ubicadas en el hueco (hoistway), dentro de una caja de acero montada cerca del piso superior, sujeta al riel del contrapeso, denominada TSU (Transfer Switch Unit).",
    "requires_visual": 1,
    "requires_enrichment": 0,
    "requires_ordering": 0,
    "is_ambiguous": 0,
    "equipment_model": "3300",
    "is_active": 1,
    "created_at": 1712793600
  }
];

async function run() {
  console.log('\n=== Reseteando banco de preguntas de ablación ===\n');

  try {
    // 1. Limpieza de tablas dependientes
    console.log('── Limpiando resultados previos…');
    await client.execute({ sql: 'DELETE FROM ablation_scores',    args: [] });
    await client.execute({ sql: 'DELETE FROM ablation_run_chunks', args: [] });
    await client.execute({ sql: 'DELETE FROM ablation_runs',       args: [] });
    await client.execute({ sql: 'DELETE FROM ablation_summary',    args: [] });
    
    // 2. Borrado de preguntas
    console.log('── Borrando preguntas antiguas…');
    await client.execute({ sql: 'DELETE FROM ablation_questions', args: [] });

    // 3. Inserción de nuevas preguntas
    console.log(`── Insertando ${questions.length} preguntas nuevas…`);
    
    for (const q of questions) {
      await client.execute({
        sql: `INSERT INTO ablation_questions 
                (id, category, category_number, question_text, expected_agent_critical, 
                 difficulty, ground_truth, requires_visual, requires_enrichment, 
                 requires_ordering, is_ambiguous, equipment_model, is_active, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          q.id, q.category, q.category_number, q.question_text, q.expected_agent_critical,
          q.difficulty, q.ground_truth, q.requires_visual, q.requires_enrichment,
          q.requires_ordering, q.is_ambiguous, q.equipment_model, q.is_active, q.created_at
        ]
      });
      console.log(`  ✓ [${q.id}] ${q.category}`);
    }

    console.log('\n=== Proceso completado exitosamente ===\n');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.close();
  }
}

run();

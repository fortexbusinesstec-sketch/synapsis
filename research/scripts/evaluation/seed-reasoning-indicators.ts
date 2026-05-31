/**
 * Actualiza reasoning_indicators en las 20 preguntas de ablación.
 * NO toca ningún otro campo ni borra datos de runs/scores.
 *
 * Ejecutar: npx tsx scripts/seed-reasoning-indicators.ts
 */

import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

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

/**
 * reasoning_indicators: señales de que la respuesta RAZONÓ y no solo repitió el manual.
 * El juez los usa como guía para score_diagnostic (0.0–2.0).
 */
const indicators: Record<string, string[]> = {

  // ── DIAGNÓSTICO TÉCNICO ────────────────────────────────────────────────────

  P01: [
    "Explica que el error 0020 indica que el circuito de seguridad (cadena de seguridad) no se abrió cuando debía, por ejemplo al abrirse las puertas",
    "Distingue que 'PERMANENT' implica que la condición persiste, no es un transitorio, lo que sugiere cortocircuito en algún nodo del circuito",
    "Propone verificar nodos concretos del circuito de seguridad: contactos de puerta (KTC, KTL), contactos de límite de viaje, paracaídas",
    "Advierte que operar con este error activo es un riesgo de seguridad porque el ascensor no puede detectar apertura de puertas en marcha",
    "Menciona que la secuencia de diagnóstico debe ir de los contactos más accesibles (puertas de cabina) hacia los más difíciles (circuito de pozo)"
  ],

  P02: [
    "Explica que la batería de emergencia alimenta la maniobra durante un corte de red para permitir un viaje de rescate al piso más cercano",
    "Distingue entre fallo de carga (cargador defectuoso), fallo de celda (batería agotada/dañada) y fallo de conexión (cables flojos)",
    "Sugiere verificar el voltaje en bornes de la batería con multímetro para cuantificar el estado real de carga",
    "Advierte que una batería fallida impide la evacuación automática de pasajeros en caso de corte de luz",
    "Indica que la antigüedad típica de reemplazo de baterías de emergencia es 3-5 años como criterio de decisión"
  ],

  P03: [
    "Explica que el error 1514 es una protección térmica del variador de frecuencia (FC), no del motor, y que el umbral es +75°C en el disipador",
    "Distingue las causas probables en orden de frecuencia: obstrucción de ventilación > temperatura ambiente alta > ciclo de trabajo excesivo > ventilador del FC defectuoso",
    "Propone verificar el flujo de aire comprobando que los filtros/rejillas no estén obstruidos antes de revisar componentes eléctricos",
    "Advierte que si el error se repite tras enfriarse, indica un problema estructural (ciclo de trabajo, temperatura del local) no un evento puntual",
    "Señala que la frecuencia de conmutación del FC puede reducirse como medida paliativa mientras se resuelve la causa raíz"
  ],

  P04: [
    "Explica que 'Ovrload' activa la señal de sobrecarga (sensor de carga SLD/célula de carga) y bloquea el movimiento para proteger la estructura",
    "Distingue entre sobrecarga real de pasajeros y un mal calibrado del sensor de carga que reporta sobrecarga con la cabina vacía",
    "Propone el paso de diagnóstico: vaciar la cabina y verificar si la señal persiste; si persiste con cabina vacía, el sensor está descalibrado",
    "Menciona que la recalibración del sensor de carga (tara a cero) se hace desde el menú de parámetros del SCIC/SMICHMI"
  ],

  // ── AMBIGUAS ──────────────────────────────────────────────────────────────

  P05: [
    "Prioriza preguntar por códigos de error en HMI/SMLCD antes de cualquier otra cosa, ya que concentran el diagnóstico inmediatamente",
    "Solicita el estado del modo de operación (Normal/Inspección/ESE) porque el diagnóstico cambia completamente según el modo",
    "Pregunta por el estado del circuito de seguridad (indicador KSK o equivalente) para separar fallo eléctrico de fallo mecánico",
    "Verifica el estado de las puertas porque un contacto de puerta abierto es la causa más frecuente de parada inesperada",
    "No da un diagnóstico definitivo sin información, dejando claro al técnico qué dato es el más determinante"
  ],

  P06: [
    "Diferencia entre puerta que no cierra por obstáculo físico vs. por señal eléctrica errónea (fotocélula, KET-S)",
    "Pregunta específicamente si se activa error 0301 (timeout de cierre de puerta) para separar fallo mecánico de eléctrico",
    "Solicita el estado de la cortina óptica (RPHT) como causa más frecuente de falso positivo de obstáculo",
    "Menciona verificar la señal KET-S (contacto de puerta de cabina) que es parte del circuito de seguridad",
    "Propone un orden de verificación: obstáculo visual > fotocélula > contactos eléctricos > operador de puerta"
  ],

  P07: [
    "Localiza el origen del ruido (cabina / pozo / cuarto de máquinas) como primer paso diagnóstico antes de cualquier otra acción",
    "Distingue entre ruido mecánico (rozamiento, vibración) y ruido eléctrico (zumbido, chasquido) para orientar la búsqueda",
    "Correlaciona el momento del ruido (aceleración / velocidad constante / frenada) con el componente probable (freno, guías, tracción)",
    "Pregunta por el estado de lubricación de rieles y guías como causa frecuente de ruido mecánico en el pozo",
    "Sugiere que ruido durante la frenada apunta al sistema de freno (MGB) mientras que ruido constante en viaje apunta a guías o polea"
  ],

  P08: [
    "Identifica que el acceso a parámetros requiere habilitar el modo configuración desde Menú 40 (cambiar 0 → 1)",
    "Distingue entre 'Login' (credenciales incorrectas) y bloqueo por modo configuración desactivado como causas distintas",
    "Pregunta si aparece algún mensaje específico en la HMI para clasificar el tipo de bloqueo",
    "Menciona que algunos parámetros requieren tarjeta SIM válida con permisos de nivel de servicio",
    "Indica que sin habilitar el Menú 40 primero, los submenús de configuración no son accesibles"
  ],

  // ── SECUENCIALES ──────────────────────────────────────────────────────────

  P09: [
    "Explica por qué el orden importa: el modo configuración (Menú 40=1) debe estar activo ANTES de seleccionar CF00",
    "Describe qué indica la señal [LC] parpadeando: el sistema está en proceso de conteo/registro activo de las LOP",
    "Menciona que el sistema cuenta automáticamente las LOP en movimiento (no es manual), el técnico solo inicia el proceso",
    "Advierte que si no se desactiva el Menú 40 al final, el ascensor puede quedar en modo configuración indefinidamente",
    "Distingue entre el registro de LOP (aprendizaje de posiciones) y la calibración de par previo como procesos distintos"
  ],

  P10: [
    "Explica que el reset reinicializa el software del SCIC/SMICHMI y limpia errores transitorios almacenados en RAM",
    "Distingue entre reset normal (botón RESET) y reset de fábrica (reseteo de parámetros) para evitar confusión",
    "Menciona que hay que esperar a que finalice el proceso de inicialización antes de considerar el reset completado",
    "Advierte que el reset no soluciona errores permanentes con causa activa (ej. circuito de seguridad abierto físicamente)"
  ],

  P11: [
    "Explica que desconectar JH primero es obligatorio por seguridad: elimina la alimentación principal antes de manipular frenos",
    "Describe el principio de apertura de freno por impulsos DEM: evita caída libre, solo permite movimiento controlado lento",
    "Explica el significado del LED LUET encendido: indica zona de puerta, momento seguro para detener la evacuación",
    "Advierte sobre el riesgo crítico de no activar JEM antes de pulsar DEM: el freno podría abrir sin control de velocidad",
    "Menciona que tras la evacuación, JEM debe desactivarse antes de reconectar JH para restaurar el estado normal del sistema"
  ],

  P12: [
    "Explica por qué la cabina debe estar vacía: el par previo se calibra para compensar el desequilibrio cabina/contrapeso con 0 kg",
    "Describe que la secuencia de viajes (piso LDU → piso más alto → piso más bajo) es necesaria para medir el desequilibrio en toda la carrera",
    "Menciona que cambiar 123=1 inicia un proceso automático; el técnico solo necesita confirmar con OK en el piso LDU",
    "Advierte que una calibración con cabina cargada resultará en errores de nivel y vibraciones durante la operación normal",
    "Indica que al finalizar se debe volver a 123=0 para evitar que el sistema intente recalibrar en el siguiente arranque"
  ],

  // ── ENRIQUECIMIENTO ───────────────────────────────────────────────────────

  P13: [
    "Explica que la resistencia de la bobina de freno determina la corriente de activación; fuera de rango indica bobina dañada o conexión deteriorada",
    "Distingue: resistencia baja (<190Ω) indica cortocircuito en la bobina (riesgo de sobrecalentamiento del driver), alta (>1700Ω) indica circuito abierto (freno no se libera)",
    "Propone medir la resistencia con el equipo desconectado de la alimentación para obtener una lectura real del devanado",
    "Advierte que una bobina fuera de rango puede causar frenada incompleta o no liberación, ambos críticos para la seguridad",
    "Menciona que el rango 190-1700Ω aplica específicamente a máquinas FML/PML 160/200, otros modelos pueden tener rangos distintos"
  ],

  P14: [
    "Explica que el limitador de velocidad (GBP) es un dispositivo mecánico de seguridad que activa el paracaídas si se supera la velocidad nominal",
    "Describe por qué 'RdvBVR' restringe el movimiento a inspección o recuperación: el sistema no puede certificar que el limitador está en posición normal",
    "Indica que el reset del limitador requiere un viaje específico para que el dispositivo mecánico vuelva a su posición de reposo",
    "Advierte que intentar operar en modo normal con GBP no reseteado puede activar el paracaídas inesperadamente"
  ],

  P15: [
    "Explica que la alta impedancia (>25kΩ/V) es necesaria para no cargar el circuito medido y obtener lecturas precisas en circuitos de baja corriente",
    "Distingue que en circuitos de seguridad con resistencias internas altas, un multímetro de baja impedancia daría lecturas incorrectamente bajas",
    "Menciona que el rango de 1000VDC es necesario porque la alimentación del bus DC del variador puede superar los 600V",
    "Advierte que usar un multímetro inadecuado puede dar falsos positivos/negativos en el diagnóstico del CO SC 1.0"
  ],

  P16: [
    "Explica que KTC (Contact door car) es el contacto eléctrico que verifica el cierre de la puerta de cabina, parte del circuito de seguridad",
    "Describe su posición en el circuito de seguridad: en serie con los demás contactos; si KTC está abierto, el circuito no se completa y el ascensor no arranca",
    "Distingue entre KTC (puerta de cabina) y KTL (puerta de piso) para evitar confusión en el diagnóstico de fallos de puerta",
    "Menciona que verificar la continuidad de KTC es uno de los primeros pasos al diagnosticar un error de circuito de seguridad relacionado con puertas"
  ],

  // ── VISUAL ────────────────────────────────────────────────────────────────

  P17: [
    "Explica qué es la LDU (Landing Door Unit): unidad combinada que integra la puerta de piso y la HMI de puesta en marcha en Bionic 5",
    "Describe por qué está en el piso superior: facilita el acceso inicial durante la instalación cuando aún no hay cabina en posición",
    "Menciona la excepción: si el piso superior no es accesible, se usa el siguiente piso inferior disponible",
    "Indica que la HMI de la LDU es el punto de acceso primario para configuración en obra, diferente al SMLCD de servicio en la cabina"
  ],

  P18: [
    "Explica que LUET (LED azul) indica que el ascensor está en la zona de apertura de puertas (±100mm del nivel de piso aproximadamente)",
    "Describe su importancia durante evacuación manual: cuando LUET está encendido, es seguro detener el movimiento y abrir puertas",
    "Menciona que LUET apagado durante una parada de emergencia indica que la cabina NO está nivelada con el piso, no se deben abrir puertas",
    "Relaciona LUET con la señal de control de puertas: el operador de puerta solo recibe comando de apertura cuando LUET está activo"
  ],

  P19: [
    "Explica que el contacto KB es el contacto de freno cerrado (Kontakt Bremse), que verifica que los frenos están aplicados",
    "Describe que las patillas 1 y 2 corresponden al NC (normalmente cerrado) del contacto, que se abre cuando el freno se libera",
    "Menciona que verificar KB es parte del diagnóstico de errores de freno: medir continuidad entre patillas 1 y 2 con freno aplicado debe dar circuito cerrado",
    "Advierte que confundir las patillas puede llevar a diagnósticos incorrectos al medir la señal complementaria (NO del contacto)"
  ],

  P20: [
    "Explica qué es la TSU (Transfer Switch Unit): unidad de conmutación que cambia automáticamente de alimentación red a baterías en caso de corte",
    "Describe la lógica de ubicación: cerca del piso superior para minimizar la longitud del cableado al tablero de control y estar fuera de la zona de trabajo habitual",
    "Menciona que el montaje en el riel del contrapeso (no en la pared del pozo) es específico de Schindler 3300 para optimizar el espacio del hueco",
    "Indica que al realizar mantenimiento de baterías, el acceso requiere abrir el pozo desde el piso superior con el equipo en modo inspección"
  ],
};

async function run() {
  console.log('\n=== Actualizando reasoning_indicators (20 preguntas) ===\n');

  let ok = 0;
  let fail = 0;

  for (const [id, inds] of Object.entries(indicators)) {
    try {
      const result = await client.execute({
        sql:  `UPDATE ablation_questions SET reasoning_indicators = ? WHERE id = ?`,
        args: [JSON.stringify(inds), id],
      });

      if ((result.rowsAffected ?? 0) === 0) {
        console.warn(`  ⚠ ${id}: fila no encontrada (¿pregunta no existe en DB?)`);
        fail++;
      } else {
        console.log(`  ✓ ${id}: ${inds.length} indicadores`);
        ok++;
      }
    } catch (err: unknown) {
      console.error(`  ✗ ${id}: ${(err as Error).message}`);
      fail++;
    }
  }

  console.log(`\n── Resultado: ${ok} OK, ${fail} fallidos`);

  if (fail > 0) {
    console.warn('\n⚠ Algunas preguntas no fueron actualizadas.');
    console.warn('  Si la columna no existe, ejecuta primero: npx tsx scripts/migrate-dual-rubric.ts');
  } else {
    console.log('\n✅ Todos los reasoning_indicators cargados correctamente.');
    console.log('   El juez ahora tiene referencia de razonamiento para las 20 preguntas.\n');
  }

  await client.close();
}

run().catch(err => {
  console.error('ERROR fatal:', err);
  process.exit(1);
});

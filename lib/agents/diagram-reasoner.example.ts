/**
 * Ejemplo / test manual del DiagramReasoner
 *
 * Ejecutar con:
 *   npx tsx lib/agents/diagram-reasoner.example.ts
 *
 * Requiere OPENAI_API_KEY en el entorno o en .env.local
 */

import 'dotenv/config';
import {
  runDiagramReasoner,
  serializeDiagramKnowledge,
  isDiagramEligible,
  type DiagramReasonerInput,
} from './diagram-reasoner';
import type { ImageResult } from './vision';

/* ── Caso 1: Diagrama de tracción con relé K1 ───────────────────────────── */

const inputTraction: DiagramReasonerInput = {
  pageNumber:      14,
  imageId:         'img_014_01',
  description:
    'Relay K1 energizes traction motor M1 when safety chain is closed. ' +
    'Contactor K2 provides emergency stop. ' +
    'ACVF variable frequency drive controls motor speed via CAN bus. ' +
    'Safety chain includes door contacts KSE-U and KSE-L plus buffer switch KTS.',
  markdownContext:
    '## 3.2 Traction Drive Control\n\n' +
    'The traction motor M1 is a 3-phase induction motor rated at 11 kW, 400 VAC.\n' +
    'Motor direction is controlled by contactors K1 (up) and K2 (down).',
};

/* ── Caso 2: Esquema de puerta con sensor DZS ───────────────────────────── */

const inputDoor: DiagramReasonerInput = {
  pageNumber:      27,
  imageId:         'img_027_02',
  description:
    'Door motor DM1 is driven by door controller SDIC. ' +
    'Door zone sensor DZS detects landing zone. ' +
    'Interlock relay K5 prevents door opening above 0.3 m/s car speed. ' +
    'SMIC board sends open/close commands via LON bus.',
  markdownContext:
    '## 5.1 Door System\n\n' +
    'The door system uses a VVVF door drive with encoder feedback.\n' +
    'Maximum door speed: 0.45 m/s.',
};

/* ── Caso 3: Descripción insuficiente (debe devolver null/vacío) ─────────── */

const inputInsufficient: DiagramReasonerInput = {
  pageNumber:  3,
  imageId:     'img_003_01',
  description: 'Cover page logo.',
  markdownContext: '',
};

/* ── Verificación de guard isDiagramEligible ────────────────────────────── */

const mockDiagramResult: Partial<ImageResult> = { type: 'diagram' };
const mockSchematicResult: Partial<ImageResult> = { type: 'schematic' };
const mockPhotoResult: Partial<ImageResult> = { type: 'photo' };

console.assert(isDiagramEligible(mockDiagramResult   as ImageResult) === true,  'diagram should be eligible');
console.assert(isDiagramEligible(mockSchematicResult as ImageResult) === true,  'schematic should be eligible');
console.assert(isDiagramEligible(mockPhotoResult     as ImageResult) === false, 'photo should NOT be eligible');
console.log('✓ isDiagramEligible guard — OK\n');

/* ── Ejecutar los casos ─────────────────────────────────────────────────── */

async function runAll() {
  console.log('═══ CASO 1: Diagrama de tracción ═══\n');
  const { data: r1, usage: u1 } = await runDiagramReasoner(inputTraction);
  if (r1) {
    console.log('Output:\n', JSON.stringify(r1, null, 2));
    console.log('\nMarkdown inyectado en chunker:');
    console.log(serializeDiagramKnowledge(r1, inputTraction.imageId));
  } else {
    console.log('(sin salida)');
  }
  console.log(`\nTokens: prompt=${u1.prompt_tokens} completion=${u1.completion_tokens}\n`);

  console.log('═══ CASO 2: Esquema de puerta ═══\n');
  const { data: r2, usage: u2 } = await runDiagramReasoner(inputDoor);
  if (r2) {
    console.log('Output:\n', JSON.stringify(r2, null, 2));
  } else {
    console.log('(sin salida)');
  }
  console.log(`\nTokens: prompt=${u2.prompt_tokens} completion=${u2.completion_tokens}\n`);

  console.log('═══ CASO 3: Descripción insuficiente ═══\n');
  const { data: r3, usage: u3 } = await runDiagramReasoner(inputInsufficient);
  console.log('Resultado:', r3 === null ? 'null (correcto — descripción muy corta)' : JSON.stringify(r3));
  console.log(`Tokens: prompt=${u3.prompt_tokens} completion=${u3.completion_tokens}\n`);

  // Verificar estructura del caso 1
  if (r1) {
    console.log('═══ Verificaciones de estructura (caso 1) ═══\n');
    console.assert(['traction','door','safety','unknown'].includes(r1.system_type), 'system_type debe ser válido');
    console.assert(Array.isArray(r1.components),    'components debe ser array');
    console.assert(Array.isArray(r1.connections),   'connections debe ser array');
    console.assert(Array.isArray(r1.control_logic), 'control_logic debe ser array');
    console.assert(Array.isArray(r1.dependencies),  'dependencies debe ser array');
    console.assert(Array.isArray(r1.failure_modes), 'failure_modes debe ser array');
    console.assert(typeof r1.summary === 'string',  'summary debe ser string');
    console.assert(r1.system_type === 'traction',   'system_type debe ser traction');
    console.assert(r1.components.every(c => c.id && c.type), 'cada componente debe tener id y type');
    console.log('✓ Todas las verificaciones pasaron\n');
  }
}

runAll().catch(console.error);

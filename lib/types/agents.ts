/**
 * Tipos compartidos entre agentes del pipeline Synapsis Go.
 * Fuente única de verdad para AnalistaOutput, GapDescriptor, LoopState.
 */

/* ── Modos de respuesta del Ingeniero Jefe ───────────────────────────────── */
export type ResponseMode =
  | 'EMERGENCY'
  | 'TROUBLESHOOTING'
  | 'LEARNING'
  | 'QUICK_CONFIRM'
  | 'PROCEDURAL'
  | 'AMBIGUOUS'
  | 'DEEP_ANALYSIS';

/* ── Descriptor estructurado del gap de información ─────────────────────── */
export interface GapDescriptor {
  /** Categoría de lo que falta */
  type: 'component' | 'error_code' | 'measurement' | 'procedure' | 'location';
  /** Entidad técnica específica: "CN7 pin 4", "E07 SCIC", "freno KM1" */
  target: string;
  /** Por qué ese dato es necesario para el diagnóstico */
  reason: string;
  /** 2-4 palabras técnicas para la búsqueda vectorial */
  search_hint: string;
}

/* ── Output del Analista Estratégico ─────────────────────────────────────── */
export interface AnalistaOutput {
  root_cause_hypothesis: string;
  confidence:            number;       // 0.0–1.0
  requires_verification: boolean;
  next_step:             string;
  response_mode:         ResponseMode;
  needs_more_info:       boolean;      // true → dispara re-loop del Planificador
  gap:                   GapDescriptor | null; // descriptor estructurado del gap
  thought_process?:       string;              // razonamiento interno (CoT)
}

/* ── Estado de una iteración del bucle React ─────────────────────────────── */
export interface LoopState {
  loopIndex:   number;
  confidence:  number;
  gap:         GapDescriptor | null;
  chunks_used: string[];               // chunk_ids seleccionados en esa iteración
}

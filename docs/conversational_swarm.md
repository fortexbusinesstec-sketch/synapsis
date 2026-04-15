# Enjambre de Conversación — Comité de Diagnóstico v3

**Módulo:** Synapsis Go Chat (`/dashboard/go`)
**Endpoint:** `POST /api/chat`
**Tiempo máximo de ejecución:** 60 segundos (`maxDuration = 60`)
**Modos:** `test` (sin persistencia) / `record` (guarda métricas y ratings)

---

## Arquitectura: Pipeline v3 con Bucle React + Gap Engine

El pipeline ya no es lineal. Ejecuta un **bucle React** (Planificador → Bibliotecario → Selector → Analista) hasta 3 veces, guiado por un `GapDescriptor` estructurado que describe con precisión qué información falta y de qué tipo. El `shouldLoop()` decide si continuar con 3 reglas de parada inteligentes.

```
Consulta del técnico
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NODO 0 — CLARIFICADOR (gpt-4o-mini)                                        │
│  Análisis silencioso. NUNCA reescribe la query.                             │
│  Salida: intent + entities[] + is_ambiguous + confidence                    │
└────────────────────────────┬────────────────────────────────────────────────┘
                             │  intent + entities (query original intacta)
                             ▼
        ╔════════════════════════════════════════════════════════╗
        ║  BUCLE REACT — máximo 3 iteraciones                   ║
        ║                                                        ║
        ║  ┌─────────────────────────────────────────────────┐  ║
        ║  │  NODO 1 — PLANIFICADOR (gpt-4o-mini)            │  ║
        ║  │  Plan dual: text_query + image_query            │  ║
        ║  │  Re-loop: usa GapDescriptor para queries        │  ║
        ║  │  quirúrgicas. Recibe SearchMemory (no repite)   │  ║
        ║  └──────────────────────┬──────────────────────────┘  ║
        ║                         │  SearchPlan                  ║
        ║                         ▼                              ║
        ║  ┌─────────────────────────────────────────────────┐  ║
        ║  │  NODO 2 — BIBLIOTECARIO (Turso vectorial)       │  ║
        ║  │  3 queries paralelas: chunks + enrichments +    │  ║
        ║  │  imágenes ancladas.                             │  ║
        ║  │  Score: 0.6·sim + 0.2·warning + 0.2·enrich     │  ║
        ║  │  Penalización gap-aware: -0.25 chunks vistos    │  ║
        ║  │  salvo si son relevantes para el gap actual     │  ║
        ║  └──────────────────────┬──────────────────────────┘  ║
        ║                         │  ScoredChunk[] (top 10)      ║
        ║                         ▼                              ║
        ║  ┌─────────────────────────────────────────────────┐  ║
        ║  │  NODO 3 — SELECTOR DE CONTEXTO (sin LLM)        │  ║
        ║  │  Lógica determinística. Selecciona 3-5 chunks.  │  ║
        ║  │  Modo gap: getGapTerms() por tipo → prioriza    │  ║
        ║  │  chunks que contienen target + search_hint      │  ║
        ║  └──────────────────────┬──────────────────────────┘  ║
        ║                         │  ScoredChunk[] seleccionados ║
        ║                         ▼                              ║
        ║  ┌─────────────────────────────────────────────────┐  ║
        ║  │  NODO 4 — ANALISTA (gpt-4o-mini · T=0.2)        │  ║
        ║  │  Hipótesis de causa raíz + GapDescriptor        │  ║
        ║  │  estructurado. shouldLoop() decide re-plan.     │  ║
        ║  └──────────────────────┬──────────────────────────┘  ║
        ║                         │                              ║
        ║       shouldLoop() = true? ──→ siguiente iteración     ║
        ║       shouldLoop() = false? ──→ salir del bucle        ║
        ╚═════════════════════════╪══════════════════════════════╝
                                  │  groundTruth acumulado
                                  │  + GapDescriptor final
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NODO 5 — INGENIERO JEFE (gpt-4o · streaming)                               │
│  Formato dinámico según response_mode. Usa el groundTruth acumulado         │
│  de todos los loops. Al finalizar → NODO 6 (Metrificador).                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Tipos Compartidos (`lib/types/agents.ts`)

Fuente única de verdad para todos los agentes del pipeline:

```typescript
// Descriptor estructurado del gap de información — núcleo del Gap Engine
interface GapDescriptor {
  type:        'component' | 'error_code' | 'measurement' | 'procedure' | 'location';
  target:      string;      // entidad técnica: "CN7 pin 4", "E07 SCIC", "freno KM1"
  reason:      string;      // por qué ese dato es necesario para el diagnóstico
  search_hint: string;      // 2-4 palabras para la búsqueda vectorial
}

// Output completo del Analista
interface AnalistaOutput {
  root_cause_hypothesis: string;
  confidence:            number;       // 0.0–1.0
  requires_verification: boolean;
  next_step:             string;
  response_mode:         ResponseMode;
  needs_more_info:       boolean;
  gap:                   GapDescriptor | null;
}

// Estado de una iteración del bucle React
interface LoopState {
  loopIndex:   number;
  confidence:  number;
  gap:         GapDescriptor | null;
  chunks_used: string[];
}
```

---

## Descripción Detallada de Cada Agente

### Nodo 0 — Clarificador (`gpt-4o-mini`)
**Archivo:** `lib/agents/clarifier.ts`
**Actúa:** Siempre, de forma invisible para el usuario.

Analiza la consulta para extraer intención y entidades. **Nunca reescribe ni enriquece la query** — la query original del técnico llega intacta al Planificador. Esto es intencional: reescribir la query desplaza el vector embedding y degrada el retrieval.

```typescript
interface ClarifierOutput {
  is_ambiguous:      boolean;
  intent:            'troubleshooting' | 'education_info' | 'emergency_protocol';
  entities:          string[];   // ["E07", "SCIC", "bus CAN"] — usados como filtros SQL
  confidence:        number;
  use_original_query: boolean;
}
```

La función `resolveQuery(original, clarifier)` devuelve `null` si la query es ambigua (el pipeline continúa en modo `education_info`) o la query original inalterada en caso contrario.

**Failsafe:** `{ is_ambiguous: false, intent: 'troubleshooting', entities: [], confidence: 0.5 }`

---

### Nodo 1 — Planificador (`gpt-4o-mini`)
**Archivo:** `lib/agents/planner.ts`
**Actúa:** Al inicio de cada iteración del bucle React.

Genera un **plan de búsqueda dual** optimizado para dos canales de recuperación distintos:

```typescript
interface SearchPlan {
  text_query:  string;   // optimizada para chunks, procedimientos, tablas de error
  image_query: string;   // optimizada para descripciones de diagramas y esquemas
}
```

**En re-planificación (loopIndex ≥ 1):** recibe el `GapDescriptor` del Analista y genera queries quirúrgicas centradas exclusivamente en `gap.target` y `gap.search_hint`. Las queries anteriores de `SearchMemory` se inyectan en el prompt para evitar repetición.

```typescript
interface PlannerInput {
  query:        string;       // SIEMPRE la query original
  intent:       string;
  entities:     string[];
  loopIndex:    number;
  analystFeedback?: {
    gap:        GapDescriptor;
    confidence: number;
  };
  searchMemory?: SearchMemory;
}
```

**Fallback determinístico:** `defaultPlannerOutput(query)` devuelve `{ text_query: query, image_query: query }` sin llamada al LLM.

---

### Nodo 2 — Bibliotecario (Retrieval vectorial)
**Archivo:** `lib/agents/bibliotecario.ts`
**Sin LLM** — Búsqueda vectorial directa en Turso.

Ejecuta **3 queries SQL en paralelo** y consolida los resultados con un score compuesto:

```
final_score = 0.6 × similarity + 0.2 × has_warning + 0.2 × enrichment_match
```

**Query A — document_chunks + LEFT JOIN enrichments**
Recupera fragmentos de manual con su enriquecimiento Q&A si existe. Aplica filtros de `equipment_model` y entidades del Clarificador.

**Query B — enrichments standalone**
Recupera pares pregunta-respuesta validados por experto (`is_verified = 1`) con su chunk original asociado. Enriquece o añade al resultado de Query A.

**Query C — extracted_images ancladas**
Solo ejecutada si `flags.images = true`. Usa el `image_query` del Planificador y limita la búsqueda a los `document_id` encontrados en Query A. Previene alucinaciones visuales cross-manual.

**Penalización contextual de redundancia (gap-aware):**
En re-loops, aplica penalización -0.25 a chunks ya vistos en iteraciones previas. Un chunk **no se penaliza** si su contenido incluye `gap.target` o `gap.search_hint` — es decir, si es directamente relevante para resolver el gap actual. Si la penalización deja < 3 chunks válidos, usa penalización suave -0.12.

```typescript
// Firma completa
async function runBibliotecario(
  plan:             SearchPlan,
  equipmentModel:   string | null,
  entities:         string[],
  flags:            BibliotecarioFlags,
  previousChunkIds: string[]           = [],
  gap:              GapDescriptor | null = null,
): Promise<BibliotecarioResult>

interface BibliotecarioResult {
  chunks:           ScoredChunk[];
  redundantAvoided: number;
}
```

**Fallback de rescate:** Si en loop 0 ningún chunk supera similitud 0.45, relanza búsqueda con intent `education_info` sobre principios generales.

**Side-effect:** Incrementa `times_retrieved` en `enrichments` para cada Q&A usado.

---

### Nodo 3 — Selector de Contexto (sin LLM)
**Archivo:** `lib/agents/selector.ts`
**Lógica determinística y auditable.** Selecciona 3-5 chunks del top-10 del Bibliotecario.

**Modo estándar (loop 0):**
1. Warning chunk de mayor score (máx. 1)
2. Chunk de mayor `final_score` global
3. Enrichment (Q&A experto) de mayor score
4. Completar hasta 4 chunks por score DESC
5. Imagen con `distance < 0.40` como slot 5

**Modo gap (loopIndex ≥ 1, con `GapDescriptor`):**
Usa `getGapTerms(gap)` que expande el vocabulario según el tipo de gap:

| Tipo gap | Términos añadidos |
| :--- | :--- |
| `measurement` | voltaje, resistencia, VDC, mA, Ω, nominal |
| `error_code` | error, falla, código, causa, reset, diagnóstico |
| `component` | placa, módulo, conector, pin, borne, circuito |
| `procedure` | paso, procedimiento, verificar, ajustar, calibrar |
| `location` | ubicación, posición, rack, tablero, slot, panel |

Prioriza hasta 2 chunks con al menos 1 coincidencia de términos del gap (ordenados por número de coincidencias), luego completa hasta 4 por score.

---

### Nodo 4 — Analista (`gpt-4o-mini`) — Gap Engine
**Archivo:** `lib/agents/analista.ts`
**Temperatura 0.2** — consistencia sobre creatividad.

Evalúa la suficiencia del contexto recuperado y produce un `AnalistaOutput` con `GapDescriptor` estructurado cuando necesita más información:

**Output JSON completo:**
```json
{
  "root_cause_hypothesis": "Fallo en la comunicación CAN del módulo SCIC — probable interrupción del segmento de bus entre la placa principal y la puerta",
  "confidence": 0.55,
  "requires_verification": true,
  "next_step": "Medir continuidad en el cable CAN entre X1 y X2 del SCIC",
  "response_mode": "DEEP_ANALYSIS",
  "needs_more_info": true,
  "gap": {
    "type": "component",
    "target": "conector X1 SCIC",
    "reason": "No se encontró el pinout del conector X1 para verificar la continuidad del bus",
    "search_hint": "pinout X1 SCIC CAN bus"
  }
}
```

**Reglas de `gap`:**
- Si `gap` es `null` → `needs_more_info` **debe** ser `false`
- Si `needs_more_info` es `true` → `gap` **no puede** ser `null`
- Failsafe: si el LLM devuelve `needs_more_info=true` pero gap inválido, construye gap mínimo desde la hipótesis + entities del Clarificador

**Tipos de gap:**
| Tipo | Cuándo usarlo |
| :--- | :--- |
| `component` | Falta info de un componente físico específico |
| `error_code` | Falta definición o causa de un código de error |
| `measurement` | Falta un valor técnico (voltaje, resistencia, torque) |
| `procedure` | Falta un procedimiento paso a paso |
| `location` | Falta ubicación física de un elemento |

**`shouldLoop()` — 3 reglas de parada (en orden):**

```typescript
function shouldLoop(
  analista:    AnalistaOutput,
  loopIndex:   number,       // índice del loop recién completado (0-based)
  loopHistory: LoopState[],  // loops anteriores al actual
): boolean
```

| Regla | Condición | Efecto |
| :--- | :--- | :--- |
| 1 — Max loops | `loopIndex ≥ 2` | Parar. Razón: `max_loops` |
| 2 — Sin mejora | `confidence ≤ confidence_loop_anterior` | Parar. Razón: `no_confidence_gain` |
| 3 — Gap atascado | `gap.target` y `gap.type` iguales al loop anterior | Parar. Razón: `gap_unchanged` → fuerza `DEEP_ANALYSIS` |

Si ninguna regla para, retorna `analista.needs_more_info`.

**Modos de respuesta (primera regla en cascada):**

| Modo | Condición |
| :--- | :--- |
| `EMERGENCY` | intent = `emergency_protocol` O síntoma menciona: atrapado, accidente, rescate, peligro |
| `QUICK_CONFIRM` | Pregunta binaria o validación explícita |
| `LEARNING` | intent = `education_info` O query empieza con: cómo funciona, qué es, explícame |
| `DEEP_ANALYSIS` | confidence < 0.6, múltiples síntomas, o gap atascado |
| `TROUBLESHOOTING` | Cualquier otro caso de fallo activo |

**Failsafe:** `ANALISTA_FAILSAFE` = confidence 0.5, mode TROUBLESHOOTING, gap null.

---

### Nodo 5 — Ingeniero Jefe (`gpt-4o`)
**Implementado en:** `app/api/chat/route.ts` → `streamText()`
**Streaming** — la respuesta llega al cliente en tiempo real.

Único agente visible para el técnico. Recibe el `groundTruth` acumulado de todos los loops y el `response_mode` del Analista.

**Personalidad base (aplica en todos los modos):**
- **Cero adulación:** No saluda, no valida, va directo al grano técnico.
- **Par a par:** Tono de colega senior, no de chatbot de soporte.
- **Un paso a la vez:** Nunca más de una instrucción física por mensaje. Cierra siempre con pregunta cerrada esperando resultado.
- **Precisión espacial:** Nombra placa exacta, conector específico, pin, color de cable, estado visual esperado. El texto es el plano de trabajo del técnico.

**Formato dinámico por `response_mode`:**

| Modo | Tono | Longitud | Cierre |
| :--- | :--- | :--- | :--- |
| `EMERGENCY` | Imperativo, sin intro | Ultra-corto (2-3 acciones) | **Sin pregunta** — segundos cuentan |
| `TROUBLESHOOTING` | Directo, experto | Corto-medio | **Pregunta cerrada obligatoria** |
| `LEARNING` | Pedagógico, analogías | Medio | Pregunta reflexiva opcional |
| `QUICK_CONFIRM` | Ultra-directo | 1-2 oraciones | Sin pregunta |
| `DEEP_ANALYSIS` | Analítico | Largo, hipótesis ordenadas | Pregunta reflexiva de alto nivel |

**Glosario obligatorio:** Si la respuesta contiene cualquier acrónimo de hardware (SCIC, SCMAIN, CN7, KET-O, etc.), la respuesta **debe** terminar con `📚 Glosario Rápido` listando todos los acrónimos con definición de una línea.

**Prioridad de documentación:** Si el contexto contiene `⚖️ NORMATIVA GENERAL SCHINDLER`, es marco legal y de seguridad con prioridad absoluta sobre cualquier manual de modelo.

---

### Nodo 6 — Metrificador
**Archivo:** `lib/agents/metrifier.ts`
**Sin LLM** — actúa en modo `record` en el callback `onFinish` del stream.

Persiste en `chat_metrics`:

| Métrica | Descripción |
| :--- | :--- |
| `phase1_ms` | Latencia total del retrieval (todos los loops) |
| `phase2_ms` | Latencia total del Analista (todos los loops) |
| `phase2_tokens` | Tokens acumulados del Analista |
| `phase3_ms` | Latencia del stream del Ingeniero Jefe |
| `phase3_input_tokens` | Tokens de entrada del Ingeniero Jefe |
| `phase3_output_tokens` | Tokens de salida del Ingeniero Jefe |
| `chunks_retrieved` | Chunks de texto seleccionados (acumulado de loops) |
| `images_retrieved` | Imágenes incluidas en el contexto |
| `enrichments_used` | `1` si se usaron Q&A de experto |
| `total_cost_usd` | Costo total del turno |

---

## Memoria Inter-Loop

El pipeline mantiene dos estructuras entre iteraciones del bucle React:

**`SearchMemory`** — evita queries redundantes:
```typescript
interface SearchMemory {
  previous_queries:   string[];   // text_query + image_query de cada loop
  previous_chunk_ids: string[];   // chunk_ids recuperados en loops anteriores
}
```

**`loopHistory`** — base para las 3 reglas de `shouldLoop()`:
```typescript
// Una entrada por iteración completada
{
  loopIndex:   0 | 1 | 2,
  confidence:  number,
  gap:         GapDescriptor | null,
  chunks_used: string[],
}
```

**`loopStoppedReason`** — calculado después del bucle:
| Razón | Condición |
| :--- | :--- |
| `resolved` | `needs_more_info = false` |
| `max_loops` | Se completaron 3 iteraciones |
| `no_confidence_gain` | Confianza igual o menor al loop anterior |
| `gap_unchanged` | Mismo `gap.target` y `gap.type` → `DEEP_ANALYSIS` forzado |

---

## Headers de Respuesta HTTP

| Header | Contenido |
| :--- | :--- |
| `x-urgency-level` | `baja` / `media` / `alta` / `critica` |
| `x-response-mode` | `EMERGENCY` / `TROUBLESHOOTING` / `LEARNING` / `QUICK_CONFIRM` / `DEEP_ANALYSIS` |
| `x-session-id` | ID de sesión |
| `x-message-id` | ID de fila en `chat_metrics` |
| `x-loops-used` | Número de iteraciones del bucle React ejecutadas |
| `x-phase1-ms` | Latencia total del retrieval |
| `x-phase2-ms` | Latencia total del Analista |
| `x-phase2-tokens` | Tokens del Analista |
| `x-chunks-retrieved` | Chunks de texto seleccionados (acumulado) |
| `x-images-retrieved` | Imágenes incluidas |
| `x-enrichments-used` | `1` si se usaron Q&A de experto |
| `x-selector-kept` | Total de chunks pasados al Analista (acumulado) |
| `x-planner-queries` | JSON array con `{text_query, image_query}` por loop |
| `x-final-confidence` | Confianza final del Analista (último loop) |
| `x-redundant-avoided` | Chunks descartados por penalización de redundancia |
| `x-gap-types-seen` | JSON array de tipos de gap por loop: `["error_code","error_code"]` |
| `x-gap-resolved` | `1` si el gap cambió entre loops (progreso real) |
| `x-loop-stopped-reason` | Razón de parada del bucle |
| `x-active-agents` | Lista de agentes activos separados por coma |

---

## Flags de Agentes (`AgentFlags`)

El endpoint acepta `agentFlags` en el body para habilitar/deshabilitar agentes individualmente. Usado por el framework de ablación:

```typescript
interface AgentFlags {
  clarifier:     boolean;   // Nodo 0
  planner:       boolean;   // Nodo 1
  bibliotecario: boolean;   // Nodo 2
  enrichments:   boolean;   // Sub-flag del Bibliotecario
  images:        boolean;   // Sub-flag del Bibliotecario
  selector:      boolean;   // Nodo 3
  analista:      boolean;   // Nodo 4
  metrifier:     boolean;   // Nodo 6
}
```

---

## Tablas de Base de Datos Afectadas

| Tabla | Operación | Agente / Sistema |
| :--- | :--- | :--- |
| `document_chunks` | `SELECT` (búsqueda vectorial) | Bibliotecario |
| `extracted_images` | `SELECT` (búsqueda vectorial, anclada) | Bibliotecario |
| `enrichments` | `SELECT` + `UPDATE times_retrieved` | Bibliotecario |
| `chat_sessions` | `INSERT` (al crear sesión en ablación) | ablation/run |
| `chat_metrics` | `INSERT` + `UPDATE` (rating) | Metrificador |
| `ablation_runs` | `UPDATE` (métricas de loop + gap) | ablation/run |

**Columnas de ablation_runs relevantes al pipeline:**

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `loop_count` | INTEGER | Iteraciones del bucle React ejecutadas |
| `planner_queries` | TEXT | JSON de planes generados por loop |
| `selector_kept` | INTEGER | Chunks totales pasados al Analista |
| `final_confidence` | REAL | Confianza del último Analista |
| `redundant_chunks_avoided` | INTEGER | Chunks descartados por penalización |
| `gap_types_seen` | TEXT | JSON array de tipos de gap por loop |
| `gap_resolved` | INTEGER | `1` si el gap cambió entre loops |
| `loop_stopped_reason` | TEXT | `resolved`/`max_loops`/`no_confidence_gain`/`gap_unchanged` |

---

## Agentes Implementados — No Integrados al Pipeline Activo

Estos agentes existen en el repositorio pero no están conectados al flujo `POST /api/chat`:

### Enrutador Semántico (`gpt-4o-mini`)
**Archivo:** `lib/agents/semantic_router.ts`
Extrae entidades físicas y marcas para construir filtros SQL precisos antes del vector search. Incluye `buildSqlFilters()` para inyectar cláusulas WHERE.

### Verificador de Fidelidad (`gpt-4o`)
**Archivo:** `lib/agents/verifier.ts`
Auditor de seguridad operativa. Compara la hipótesis del Analista contra la fuente RAG y bloquea planes con datos no respaldados por documentación oficial. Temperatura 0, el único agente completamente determinístico del sistema.

---

*Archivos principales activos: `app/api/chat/route.ts` · `lib/agents/clarifier.ts` · `lib/agents/planner.ts` · `lib/agents/bibliotecario.ts` · `lib/agents/selector.ts` · `lib/agents/analista.ts` · `lib/agents/metrifier.ts` · `lib/types/agents.ts`*

*Agentes no integrados: `lib/agents/semantic_router.ts` · `lib/agents/verifier.ts`*

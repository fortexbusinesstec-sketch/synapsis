# Metodología de Evaluación Experimental — Proyecto Synapsis MAS

**Investigador:** Fabrizio Diaz  
**Proyecto:** Synapsis MAS — Sistema Multi-Agente RAG para Mantenimiento de Ascensores Schindler  
**Versión del documento:** 1.0 | Mayo 2026

---

## Parte I — Dataset de Evaluación (Ground Truth)

### ¿Tienes un dataset de evaluación con ground truth?

Sí. El sistema cuenta con un banco de preguntas estructurado (tabla `ablation_questions`) con identificadores `P01..P30`, compuesto por **30 preguntas técnicas** centradas en diagnóstico de ascensores de la marca Schindler (modelos 3300, 5500 y similares).

### ¿Quién creó las preguntas?

Las preguntas fueron construidas de forma **híbrida**:

- **Base documental real:** Las preguntas derivan de situaciones de falla reales documentadas en los manuales técnicos de Schindler (por ejemplo: error codes, pinouts de conectores, procedimientos de reset, lecturas de sensores).
- **Refinamiento manual:** El investigador seleccionó y redactó las preguntas asegurando que tuvieran respuesta verificable dentro del corpus de manuales indexados.
- **No se usó generación sintética masiva:** No se aplicó fine-tuning ni aumentación sintética (ej. T5, GPT-4 autogeneración) para crear el banco de preguntas. Cada pregunta tiene correlación directa con el corpus documental disponible.

> **Declaración explícita:** No se realizó fine-tuning de ningún modelo (ni el modelo de embedding ni los modelos de generación). Se usan modelos pre-entrenados tal como los proveen sus fabricantes: `text-embedding-3-small` (OpenAI), `gpt-4o-mini` y `gpt-4o` (OpenAI), y `mistral-ocr-latest` (Mistral AI).

### ¿Cómo se define el "split" de datos?

Se utilizó un diseño de **conocimiento completo sin holdout de documentos**, que es el esquema correcto para sistemas RAG de dominio cerrado:

- **Todos los manuales van al índice.** No se reserva un subconjunto de páginas para "test". El corpus completo es la base de conocimiento que el sistema debe consultar.
- **Las preguntas son completamente independientes del índice.** El banco de 30 preguntas evalúa la capacidad del sistema de *recuperar y razonar* sobre el corpus, no de memorizar.
- **Justificación:** En sistemas RAG operativos de dominio cerrado (como soporte técnico de equipos industriales), ocultar documentos al índice no tiene sentido operativo. Lo que se evalúa es si el sistema encuentra y sintetiza correctamente información que *sí está* en la base de conocimiento.

---

## Parte II — El Estudio de Ablación

### ¿Qué es un estudio de ablación?

Un **estudio de ablación** (del inglés *ablation study*) es una técnica experimental de la investigación en IA/ML que consiste en **desactivar componentes del sistema de forma sistemática** para cuantificar la contribución individual de cada uno al rendimiento total. El término viene de la cirugía: así como un cirujano extirpa tejido para entender la función de cada órgano, el investigador "extirpa" módulos para entender su impacto.

En Synapsis, el mecanismo de ablación está implementado a través de `AgentFlags`:

```typescript
interface AgentFlags {
  clarifier:     boolean;  // Nodo 0: Análisis silencioso
  planner:       boolean;  // Nodo 1: Plan de búsqueda dual
  bibliotecario: boolean;  // Nodo 2: Retrieval vectorial
  enrichments:   boolean;  // Sub-flag: Q&A de expertos
  images:        boolean;  // Sub-flag: diagramas técnicos
  selector:      boolean;  // Nodo 3: Selección determinística
  analista:      boolean;  // Nodo 4: Gap Engine
  metrifier:     boolean;  // Nodo 6: Telemetría
}
```

Cada combinación de flags define una **configuración experimental diferente**, y el endpoint `POST /api/ablation/run` ejecuta cada configuración de forma automatizada.

### ¿Cómo se condujo el estudio de ablación?

El proceso tuvo dos fases claras:

**Fase 1 — Exploración amplia (más de 7 configuraciones):**  
Se probaron más de 7 configuraciones diferentes del sistema multi-agente, variando la activación de los agentes (clarificador, planificador, analista con Gap Engine, enrichments, imágenes). El objetivo era entender qué módulos tenían impacto positivo y cuáles podían ser prescindibles o incluso perjudiciales en ciertos escenarios.

**Fase 2 — Evaluación de las 4 mejores:**  
Tras el primer barrido, se seleccionaron las **4 configuraciones con mejor ranking** según las métricas iniciales. Estas 4 configuraciones fueron sometidas al protocolo formal de ablación:

- **Formato de evaluación por escenarios:** Cada configuración fue evaluada sobre un conjunto de **5 preguntas técnicas** (P01–P05 o similar), presentadas como un **escenario conversacional**. Esto va más allá de preguntas aisladas: el sistema debe demostrar que **recuerda el contexto** de la conversación (ej. el técnico menciona el modelo en el turno 1, y el sistema lo usa en el turno 3).
- **Evaluación de memoria conversacional:** Se verifica explícitamente que el sistema no "olvide" información mencionada en turnos anteriores dentro de la misma sesión.
- **Mismo set de preguntas para todas las configuraciones:** Las 5 preguntas/escenario son idénticas para las 4 configuraciones, garantizando comparabilidad directa.

### El Juez IA — GPT-4o como evaluador

La métrica central del estudio de ablación es la evaluación por un **Juez IA implementado con `gpt-4o`**, el modelo más capaz disponible. Se eligió `gpt-4o` (y no `gpt-4o-mini`) deliberadamente porque:

1. **Criterio de calidad:** El juez debe ser más capaz que el sistema que evalúa. Un juez "barato" no puede detectar errores sutiles o inconsistencias técnicas.
2. **Evaluación multi-dimensional:** El juez no solo dice "correcto/incorrecto"; critica activamente la respuesta en múltiples criterios:
   - **Fidelidad al manual:** ¿La respuesta está respaldada por el corpus documental o hay alucinaciones?
   - **Relevancia técnica:** ¿La respuesta resuelve el problema real del técnico?
   - **Precisión específica:** ¿Nombra placas, conectores, pins, valores correctos?
   - **Seguridad operativa:** ¿Incluye advertencias de seguridad cuando aplica?
   - **Coherencia conversacional:** ¿Recuerda y usa el contexto de turnos anteriores?
3. **Score estructurado:** El juez devuelve una puntuación numérica (0.0–1.0) más una justificación en texto, ambas persisten en `ablation_scores`.

---

## Parte III — Comparación entre los 3 Niveles (L0 vs L1 vs L2)

Tras elegir la **mejor configuración del ablación** (Level 2 — Synapsis MAS completo), se realizó un **enfrentamiento entre generaciones** comparando tres niveles de solución al mismo problema:

| Nivel | Nombre | Descripción |
|:---:|:---|:---|
| **L0** | GOMS (Baseline Humano) | Simulación del operador humano buscando en PDFs con Google Drive/smartphone |
| **L1** | BM25 + BERT (Baseline Clásico) | Retrieval léxico + reranking con embeddings, sin agentes ni loop |
| **L2** | Synapsis MAS (Sistema Propuesto) | Pipeline multi-agente completo con Gap Engine y Juez IA |

### ¿Qué es GOMS en este contexto?

**GOMS** (Goals, Operators, Methods, Selection rules) es un **modelo de usabilidad computacional** desarrollado por Card, Moran & Newell (1983). En Synapsis, GOMS **no es una técnica de mantenimiento predictivo**; es un **baseline matemático reproducible** que simula el comportamiento de un técnico real buscando información en manuales PDF desde su smartphone.

Los cuatro operadores están calibrados para el contexto peruano:

| Operador | Símbolo | Valor | Justificación |
|:---|:---:|:---:|:---|
| Mental | M | 1.2 s | Preparación cognitiva estándar (Card et al., 1983) |
| Keystroke (táctil) | K | 0.2 s/char | Escritura en teclado virtual con corrección automática |
| System/Scroll | S | 5.0 s | Latencia de red 4G + carga PDF en campo (Lima) |
| Pointing | P | 1.5 s | Fitts' Law para targets ≥48dp (Material Design) |

**¿Por qué GOMS como baseline y no solo "sin sistema"?**  
GOMS convierte al humano-buscando-PDFs en un *experimento reproducible*. No depende de qué tan rápido tipea un técnico específico: los parámetros son constantes, calibrados y justificados académicamente. Esto permite comparar las 3 soluciones en las mismas unidades de tiempo.

### ¿Cómo se evaluaron L0, L1 y L2?

Para los 3 niveles se usó el **mismo banco de preguntas** (P01–P30), evaluadas de forma **individual** (no en escenarios conversacionales como en el ablación, ya que L0 y L1 no tienen memoria de sesión). Las métricas se generaron de forma **automática** (scripts de evaluación):

- **L0/GOMS:** `scripts/evaluate_level0.ts` — simula el flujo del técnico con los operadores GOMS y produce `total_ms`, `success_score`, `mrr`, etc.
- **L1/BM25+BERT:** ejecuta el pipeline de retrieval clásico sobre las mismas preguntas.
- **L2/Synapsis:** ejecuta el pipeline completo con todos los agentes habilitados.

En los 3 niveles, las respuestas generadas fueron evaluadas por el **Juez IA (GPT-4o)** con los mismos criterios, garantizando comparabilidad metodológica.

---

## Parte IV — Métricas de Evaluación

### 4.1 Métricas de Retrieval (calidad de recuperación)

| Métrica | Definición en Synapsis | Usado en |
|:---|:---|:---:|
| **Success Score** | 1.0 = éxito directo, 0.5 = multi-hop cognitivo, 0.0 = fallo total | L0, L1, L2 |
| **Recall@3** (`recall_at_3`) | Binario: ¿alguno de los 3 términos/chunks top coincide con el ground truth? | L0, L1 |
| **MRR** (Mean Reciprocal Rank) | `1/i` donde `i` es la posición (1-indexed) del primer chunk/término correcto | L0, L1, L2 |
| **Safe Decision Rate** | Binario: ¿el sistema/usuario llegó a una decisión basada en información? | L0 |
| **Redundant Chunks Avoided** | Chunks descartados por la penalización gap-aware del Bibliotecario | L2 |
| **Final Confidence** | Confianza del Analista al terminar el loop (0.0–1.0) | L2 |

> **Nota importante:** Synapsis **no usa BM25 ni BERT en su pipeline de producción**. El retrieval es 100% **Dense** (vectorial) con la fórmula compuesta `0.6·sim + 0.2·has_warning + 0.2·enrichment_match`. BM25+BERT es el **Nivel L1**, el baseline clásico contra el cual se compara el sistema propuesto.

### 4.2 Métricas de Generación (calidad de la respuesta)

El sistema **no usa BLEU, ROUGE-L, ni BERTScore** como métricas primarias. La razón es que estas métricas de n-gram no capturan calidad de razonamiento técnico: una respuesta puede ser correcta sin compartir tokens con el ground truth de referencia.

En cambio, se emplea la **evaluación por Juez IA (LLM-as-a-Judge)**:

| Dimensión de Evaluación | Descripción |
|:---|:---|
| **Fidelidad al corpus** | ¿La respuesta está respaldada por los manuales indexados? (evita alucinaciones) |
| **Relevancia técnica** | ¿Resuelve el problema real del técnico en campo? |
| **Precisión espacial** | ¿Nombra placa exacta, conector, pin, color de cable? |
| **Seguridad operativa** | ¿Incluye advertencias de seguridad cuando aplica? |
| **Score total** | Valor numérico 0.0–1.0 agregado de las dimensiones anteriores |

### 4.3 Métricas de Eficiencia Computacional

Estas métricas son capturadas automáticamente por el **Nodo 6 — Metrificador** y persistidas en `chat_metrics` y `ablation_runs`:

| Métrica | Descripción |
|:---|:---|
| `phase1_ms` | Latencia total del retrieval (todos los loops) |
| `phase2_ms` | Latencia total del Analista (todos los loops) |
| `phase3_ms` | Latencia del stream del Ingeniero Jefe |
| `phase2_tokens` | Tokens acumulados del Analista |
| `phase3_input_tokens` | Tokens de entrada del Ingeniero Jefe |
| `phase3_output_tokens` | Tokens de salida del Ingeniero Jefe |
| `total_cost_usd` | Costo total del turno en dólares |
| `loop_count` | Iteraciones del bucle React ejecutadas (1–3) |
| `total_ms` (L0) | Tiempo simulado total del operador humano |
| `cost_usd` (L0) | Costo laboral del técnico (`total_ms / 3600 × $1.35/h`) |

El `HOURLY_RATE_USD = 1.35` está justificado con datos del mercado laboral peruano (MTPE 2024, Ley 27735, TC BCRP 2024-2025), lo que permite una comparación económica directa entre el costo de usar el sistema vs. no usarlo.

---

## Parte V — Diseño Experimental

### Parámetros Fijos (invariantes entre métodos)

| Parámetro | Valor | Justificación |
|:---|:---|:---|
| Modelo de embedding | `text-embedding-3-small` | Mismo vector space para todos los niveles que usan embeddings |
| Dimensión del vector | 1536 | Valor por defecto del modelo |
| Función de similitud | Cosine similarity | Estándar para embeddings de texto |
| Banco de preguntas | 30 preguntas (P01–P30) | Mismo set para L0, L1 y L2 |
| Ground truth | Definido por el investigador | Basado en los manuales indexados |
| Juez evaluador | `gpt-4o` | Mismo modelo para todos los niveles |

### Parámetros Variables (difieren entre métodos)

| Parámetro | L0 (GOMS) | L1 (BM25+BERT) | L2 (Synapsis MAS) |
|:---|:---:|:---:|:---:|
| Retrieval strategy | Manual (PDF search) | BM25 léxico + reranking BERT | Dense vectorial + scoring compuesto |
| Top-k chunks | N/A | Configurable | 3–5 (Selector determinístico) |
| Temperatura generación | N/A | Según config L1 | 0.2 (Analista) / streaming (Jefe) |
| Número de loops | Saltos cognitivos (1–3) | 1 (sin loop) | 1–3 (Gap Engine) |
| Agentes activos | Ninguno (humano) | Solo retrieval + LLM | 6 agentes especializados |
| Memoria conversacional | Ninguna | Ninguna | `SearchMemory` + `loopHistory` |
| Enriquecimientos HITL | No | No | Sí (`enrichments` tabla) |
| Multimodal (imágenes) | No | No | Sí (diagramas técnicos anclados) |

### ¿Cuántas runs por método?

Cada pregunta del banco fue ejecutada **una vez** por método (L0, L1, L2). Dado que L0 es determinístico (GOMS) y L1 puede ser determinístico según configuración, la varianza es estructural, no aleatoria. Para L2, la temperatura baja del Analista (T=0.2) y la naturaleza del Ingeniero Jefe (streaming con seed implícito) minimizan la varianza run-a-run.

> **Transparencia:** No se reporta desviación estándar entre runs del mismo método. La varianza reportada es **entre métodos** (L0 vs L1 vs L2) sobre el mismo set de preguntas. Esto es una limitación que debe declararse en la sección de trabajo futuro.

### ¿Se hicieron pruebas estadísticas formales?

Con un banco de 30 preguntas, los resultados permiten aplicar pruebas no paramétricas:

- **Prueba recomendada:** Wilcoxon signed-rank test (pareado, no paramétrico), ya que las puntuaciones son ordinales (0.0–1.0) y no se asume normalidad.
- **Alternativa si la distribución es aproximadamente normal:** t-test de Student de dos colas.
- **Hipótesis nula:** No hay diferencia significativa en `success_score` entre L2 y L1 (o entre L2 y L0).
- **Umbral α:** 0.05 (convención estándar).

> **Nota:** Los valores p exactos deben calcularse sobre los datos reales de `ablation_scores`. Este documento establece el protocolo; los valores concretos van en la tabla de resultados de la tesis.

### ¿Se definió un baseline?

Sí, hay **dos baselines**:

1. **L0 — GOMS (baseline humano):** El técnico sin sistema automatizado, buscando en PDFs. Es el estado actual del sector.
2. **L1 — BM25+BERT (baseline clásico de IR):** Representa el estado del arte en recuperación de información pre-LLM. Sirve para mostrar que Synapsis MAS no solo es mejor que el humano, sino también mejor que los enfoques clásicos de retrieval.

---

## Parte VI — Preguntas Transversales

### ¿Hay un diagrama del pipeline completo? ¿Puedes describir los nodos?

El pipeline tiene **dos flujos diferenciados**:

**Flujo de Indexación (de PDF a base de conocimiento):**

```
PDF Upload → Agente OCR (mistral-ocr-latest)
           → Orchestrator (gpt-4o-mini): estrategia text_heavy / image_heavy / balanced
           → Chunker (gpt-4o-mini): segmentación semántica con tipos (procedure, warning, table)
           → Embedder (text-embedding-3-small): vectores float32 en Turso
           → [estado: 'ready']
           → Agente Curioso (gpt-4o-mini, background): detecta lagunas → tabla enrichments
           → HITL: técnico experto responde lagunas en dashboard → knowledge enriched
```

**Flujo de Consulta (de pregunta a respuesta):**

```
Técnico pregunta
→ Nodo 0: Clarificador (gpt-4o-mini) — extrae intent + entities, NO reescribe la query
→ [BUCLE REACT, máx. 3 iteraciones]
   → Nodo 1: Planificador (gpt-4o-mini) — genera SearchPlan {text_query, image_query}
   → Nodo 2: Bibliotecario (Turso vectorial) — 3 queries paralelas, score = 0.6·sim + 0.2·warning + 0.2·enrich
   → Nodo 3: Selector (determinístico) — elige 3-5 chunks priorizando gaps
   → Nodo 4: Analista (gpt-4o-mini, T=0.2) — Gap Engine: ¿necesito más info? → GapDescriptor
   → shouldLoop() decide: continuar o salir
→ Nodo 5: Ingeniero Jefe (gpt-4o, streaming) — respuesta final al técnico
→ Nodo 6: Metrificador (sin LLM) — persiste latencias, costos, tokens
```

### ¿El sistema es solo RAG o tiene planificación de mantenimiento predictivo?

Synapsis es un **sistema de soporte al diagnóstico en tiempo real**, no un sistema de mantenimiento predictivo. El técnico está frente a un ascensor con un fallo activo y necesita respuesta inmediata. El sistema:

1. Recupera información técnica relevante de los manuales.
2. Razona sobre qué información falta.
3. Genera una respuesta diagnóstica paso a paso.

No hay módulo de predicción de fallos futuros, series temporales de sensores, ni scheduling de mantenimiento. El componente GOMS es exclusivamente para **evaluación de usabilidad**, no para planificación.

### ¿Hay un componente multimodal real?

Sí, el sistema es genuinamente multimodal. El pipeline de indexación incluye:

1. **Extracción de imágenes:** El Agente OCR (`mistral-ocr-latest`) rasteriza las páginas del PDF. El Agente Vision (`lib/agents/vision.ts`) analiza cada imagen candidata.
2. **Modelo de visión:** Se usa **GPT-4o Vision** (y como alternativa **Pixtral** de Mistral) para generar descripciones técnicas de diagramas de circuitos, esquemas eléctricos y planos de instalación.
3. **Integración con RAG:** El Bibliotecario ejecuta una **Query C anclada**: solo busca imágenes en los documentos que ya fueron relevantes en la Query A textual, previniendo alucinaciones visuales cross-manual.
4. **Curaduría HITL:** El administrador puede marcar imágenes como "No útiles" desde el dashboard; esas imágenes son excluidas del pipeline de retrieval.

### ¿Tienes una tabla comparativa con números reales?

La tabla comparativa se construye a partir de los datos persisten en `ablation_runs` y `ablation_scores`. A continuación, la estructura de la tabla final que debe reportarse (los valores numéricos provienen de los registros en Turso):

| Métrica | L0 — GOMS | L1 — BM25+BERT | L2 — Synapsis MAS |
|:---|:---:|:---:|:---:|
| Success Score promedio | ~0.40–0.60 | [valor real] | [valor real] |
| MRR promedio | ~0.45–0.65 | [valor real] | [valor real] |
| Recall@3 promedio | [valor real] | [valor real] | [valor real] |
| Latencia promedio (ms) | ~300,000–700,000 | [valor real] | ~8,000 |
| Costo por consulta (USD) | ~$0.14–$0.24 | [valor real] | [valor real] |
| Loop count promedio | ~2–3 búsquedas | N/A | ~1–2 loops |
| Juez IA Score promedio | [valor real] | [valor real] | [valor real] |

---

## Parte VII — Preguntas Específicas del Reviewer

### ¿Hiciste evaluación humana con evaluadores?

La evaluación humana directa (panel de expertos humanos calificando cada respuesta) **no fue el mecanismo primario**. Se utilizó el paradigma **LLM-as-a-Judge** con `gpt-4o`. Este enfoque está validado en la literatura reciente (Zheng et al., 2023 — MT-Bench; OpenAI, 2023). Si el comité revisor requiere evaluación humana complementaria, se puede declarar como trabajo futuro o limitación.

Sin embargo, existe evaluación humana **indirecta** a través del flujo HITL: los técnicos expertos de Schindler Perú validan y enriquecen las lagunas de conocimiento detectadas por el Agente Curioso, lo que constituye una validación humana del corpus.

### ¿Cómo se comparan los 3 métodos estadísticamente?

- **Métrica de comparación:** `success_score` (escalar 0.0–1.0) y `judge_score` (Juez IA, escalar 0.0–1.0) por pregunta.
- **Test recomendado:** Wilcoxon signed-rank (n=30, datos no normales).
- **Comparaciones a reportar:** L2 vs L0 y L2 vs L1 (dos comparaciones pareadas).
- **Corrección de Bonferroni:** Si se hacen comparaciones múltiples, ajustar α a 0.025.

### ¿Qué es Applied Soft Computing y qué valorará?

Si el paper se envía a Applied Soft Computing (Elsevier), el journal valora especialmente:

1. ✅ **Métricas de eficiencia computacional** — Synapsis reporta latencia, tokens y costo por consulta (Nodo 6).
2. ✅ **Comparación con baselines múltiples** — L0, L1 y L2 cubren el espacio desde humano hasta SOTA.
3. ✅ **Reproducibilidad** — Los parámetros GOMS son constantes documentadas; el código está en producción en Vercel.
4. ⚠️ **Desviación estándar** — Declarar la limitación de 1 run por configuración; proponer multi-run como trabajo futuro.
5. ⚠️ **Dataset público** — Considerar publicar el banco de 30 preguntas como dataset anonimizado si es posible.

---

*Documento generado a partir del código fuente y la documentación del repositorio Synapsis. Para citar: Diaz, F. (2026). Synapsis MAS: Sistema Multi-Agente RAG para Diagnóstico Técnico de Ascensores. Maestría en Inteligencia Artificial.*

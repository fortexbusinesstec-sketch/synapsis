# Enjambre de Indexación — Pipeline RAG

**Entrada:** PDF técnico (manual Schindler)
**Salida:** Chunks vectorizados en Turso + preguntas HITL para enriquecimiento humano
**Tiempo máximo de ejecución:** 5 minutos (Vercel `maxDuration = 300s`)
**Patrón de ejecución:** Non-blocking — el cliente recibe `{ documentId, status: 'pending' }` inmediatamente. El pipeline completo corre con `waitUntil` en segundo plano.

---

## Mapa del Pipeline

```
PDF Upload
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FASE 1: OCR (mistral-ocr-latest)                                   │
│  Extrae texto e imágenes rasterizadas. Calcula costOcr por página.  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FASE 2: ORCHESTRATOR (gpt-4o-mini)                                 │
│  Analiza las 2 primeras páginas. Decide estrategia de procesamiento │
│  (text_heavy / image_heavy / balanced) e idioma del documento.      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FASE 3: CHUNKER (gpt-4o-mini)                                      │
│  Segmentación semántica de todo el texto. Preserva advertencias,    │
│  procedimientos, tablas. Marca hasWarning en chunks de seguridad.   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FASE 4: EMBEDDER (text-embedding-3-small)                          │
│  Genera vectores para cada chunk. Insertion masiva en Turso         │
│  (tabla document_chunks con columna embedding blob float32).        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    status → 'ready'
                               │
                     (background, no bloquea)
                               │
                               ▼
                    ┌──────────────────────┐
                    │   AGENTE CURIOSO     │
                    │   (gpt-4o-mini)      │
                    │   Detecta lagunas    │
                    │   de conocimiento    │
                    └──────────────────────┘
```

---

## Descripción Detallada de Cada Agente

### Agente 1 — OCR (`mistral-ocr-latest`)
**Archivo:** `lib/agents/ocr.ts`
**Costo:** `$0.001 USD / página` (no por tokens)

Extrae el contenido completo del PDF. El resultado es una estructura de páginas (`OcrPage[]`), donde cada página contiene:
- `markdown` — texto estructurado de la página
- `images[]` — imágenes rasterizadas binarias (base64)
- `index` — número de página (0-indexed)

También detecta cuántas páginas carecen de imágenes rasterizadas pero tienen texto técnico denso. Estas páginas son candidatas para el **Vector Scanner** (agente eliminado del pipeline automático; ahora HITL).

**Métricas guardadas:** `pageCount`, `costOcr`, `totalCost`

---

### Agente 2 — Orchestrator (`gpt-4o-mini`)
**Archivo:** `lib/agents/orchestrator.ts`

Recibe un preview de las 2 primeras páginas (post-OCR) y produce un JSON de estrategia:

```json
{
  "strategy": "text_heavy" | "image_heavy" | "balanced",
  "priority_pages": [5, 12, 34],
  "estimated_complexity": "low" | "medium" | "high",
  "language": "es" | "en" | "de" | "fr"
}
```

Si el modelo falla o devuelve JSON inválido, se usa un fallback predeterminado (`balanced`, complejidad `medium`, idioma `es`).

**Métricas guardadas:** `costOrchestrator`

---

### Agente 3 — Chunker (`gpt-4o-mini`)
**Archivo:** `lib/agents/chunker.ts`

Divide el texto de todas las páginas en fragmentos con sentido técnico. Cada chunk incluye:

| Campo | Descripción |
| :--- | :--- |
| `content` | Texto del fragmento |
| `chunk_type` | `procedure`, `specification`, `warning`, `table`, `text` |
| `section_title` | Sección del manual a la que pertenece |
| `has_warning` | `1` si el fragmento contiene advertencias de seguridad |
| `page_number` | Número de página de origen |
| `token_estimate` | Estimación del tamaño en tokens |

**Métricas guardadas:** `costChunker`

---

### Agente 4 — Embedder (`text-embedding-3-small`)
**Archivo:** `lib/agents/embedder.ts`

Vectoriza cada chunk de texto individualmente usando el modelo de OpenAI `text-embedding-3-small`. Los vectores se almacenan como blobs binarios `float32` en la columna `embedding` de la tabla `document_chunks` en Turso, lo que habilita búsqueda vectorial nativa por cosine similarity (`vector_distance_cos`).

**Métricas guardadas:** `costEmbedder`

---

### Agente 5 — Curioso (`gpt-4o-mini`) — Background
**Archivo:** `lib/agents/curious.ts`

Se dispara tras el `status = 'ready'` sin bloquear la disponibilidad del documento. Analiza hasta **10 chunks** y **5 imágenes técnicas** buscando *lagunas de conocimiento* — términos, acrónimos, o procedimientos sin definición explícita.

**Detección de lagunas:** clasifica como laguna cuando el texto menciona:
- Componentes sin explicar (ej. `placa SCMAIN`, `módulo SDIC`)
- Códigos sin definición (ej. `E07`, `CAN bus`, `fallo F12`)
- Valores sin contexto (ej. "resistencia nominal")
- Referencias cruzadas a documentos no disponibles

**Sistema de herencia en cascada (3 niveles):** antes de crear una pregunta nueva, el Curioso busca si ya existe una respuesta verificada en el sistema:

| Nivel | Búsqueda | Acción |
| :---: | :--- | :--- |
| L0 | Mismo documento | No duplicar; evitar saturar al usuario |
| L1 | Término exacto en todos los documentos | Hereda la respuesta del experto |
| L2 | Filtro por modelo de equipo + término | Hereda respuesta específica del modelo |
| L3 | Similitud semántica vectorial (umbral ≤ 0.25) | Hereda por cercanía conceptual |

Las lagunas sin respuesta se guardan como `answerSource: 'pending'` en la tabla `enrichments`, y aparecen en el dashboard para que el técnico experto las responda (flujo HITL).

---

---

## Costos del Pipeline (FinOps)

| Agente | Modelo | Tarifa |
| :--- | :--- | :--- |
| OCR | `mistral-ocr-latest` | $0.001 / página |
| Orchestrator | `gpt-4o-mini` | $0.15 input / $0.60 output (por 1M tokens) |
| Chunker | `gpt-4o-mini` | $0.15 input / $0.60 output (por 1M tokens) |
| Embedder | `text-embedding-3-small` | $0.02 / 1M tokens |
| Curioso | `gpt-4o-mini` | $0.15 input / $0.60 output (por 1M tokens) |

El botón **"Recalcular Costos"** del dashboard permite recalcular `costOcr` y `costVision` desde las métricas reales guardadas (`pageCount × $0.001` y `hitlImages × $0.0002`).

---

## Tablas de Base de Datos Afectadas

| Tabla | Operación | Agente |
| :--- | :--- | :--- |
| `documents` | `UPDATE` (status, costs, pageCount) | Todos |
| `document_chunks` | `INSERT` (content, embedding, tipo) | Chunker + Embedder |
| `agent_logs` | `INSERT` (start/end/error) | Logger (todos) |
| `enrichments` | `INSERT` (pending / inherited) | Curioso |
| `indexing_metrics` | `UPSERT` (snapshot final) | Curioso |

---

*Archivos principales: `app/api/upload/route.ts` · `lib/agents/` · `lib/utils/costs.ts`*

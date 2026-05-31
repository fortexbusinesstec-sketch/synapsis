# Diagrama 3 — Base de Datos: Modelo Relacional con Vectores

**Sistema:** Synapse MAS — RAG Multi-Agente para Diagnóstico Técnico de Elevadores Schindler
**Motor:** Turso LibSQL (SQLite-compatible) · `libsql://htl-synapse-ia.turso.io`
**ORM:** Drizzle ORM v0.40 · `lib/db/schema.ts`
**Nivel:** Diseño de datos · Vista de entidades y relaciones
**Apto para:** Presentación en tesis, documentación de modelo de datos

> **Tablas excluidas:** `agent_logs` (observabilidad operacional) · `indexing_metrics` (FinOps por pipeline)

---

## Finalidad

Modelo relacional de las 5 entidades de negocio centrales del sistema. Destaca las columnas `F32_BLOB(1536)` que habilitan la búsqueda vectorial nativa por similitud coseno, el sistema de herencia en cascada de `enrichments` y el ciclo HITL (Human-in-the-Loop) que convierte conocimiento experto en contexto RAG activo.

---

## Diagrama

```mermaid
erDiagram
    documents {
        text id PK "cuid2 - primary key"
        text title "NOT NULL"
        text brand "default: Schindler"
        text equipment_model "idx: idx_documents_model"
        text doc_type "manual | plano | certificado"
        text language "es | en | de | fr"
        text pdf_url "NOT NULL - Cloudflare R2"
        int page_count
        text status "pending|processing|ready|error - idx"
        text status_detail
        text ocr_completed_at
        text embedded_at
        real cost_orchestrator "USD - gpt-4o-mini"
        real cost_ocr "USD - $0.001/pag"
        real cost_vision "USD - pixtral-12b"
        real cost_chunker "USD - gpt-4o-mini"
        real cost_embedder "USD - text-emb-3-small"
        real total_cost "USD - sum all agents FinOps"
        text auditor_recommendations "JSON Array - VectorScanner"
        text created_at
        text updated_at
    }

    document_chunks {
        text id PK "cuid2"
        text document_id FK "ON DELETE CASCADE"
        text content "NOT NULL - chunk text body"
        int page_number "source page origin"
        int chunk_index "order within page"
        text section_title "semantic section header"
        text chunk_type "procedure|specification|warning|table|text"
        int has_warning "0|1 - safety critical flag"
        int content_tokens "estimated token count"
        blob embedding "F32_BLOB(1536) - cosine vector search"
        text created_at
    }

    extracted_images {
        text id PK "cuid2"
        text document_id FK "ON DELETE CASCADE"
        text related_chunk_id FK "nullable - textual context link"
        int page_number
        text image_url "Cloudflare R2 path"
        text image_type "diagram|schematic|photo|table|other"
        real confidence "pixtral-12b classification score 0-1"
        text description "Vision agent free text output"
        int is_critical "0|1 - safety-relevant image"
        int is_discarded "0|1 - manually excluded by HITL"
        int is_useful "0=pending | 1=util | -1=discard"
        text user_comment "HITL expert annotation"
        blob embedding "F32_BLOB(1536) - cosine vector search"
        text created_at
    }

    enrichments {
        text id PK "cuid2"
        text document_id FK "ON DELETE CASCADE"
        text reference_id "FK polymorphic - chunk.id OR image.id"
        text reference_type "chunk | image"
        text original_excerpt "NOT NULL - source fragment text"
        text generated_question "NOT NULL - detected knowledge gap"
        text question_context "surrounding context"
        text expert_answer "NULL until HITL responds"
        text answer_source "pending|expert|manual_ref|inherited"
        int inheritance_level "1=exact | 2=model | 3=semantic"
        real confidence "0.0 to 1.0 - gap certainty"
        int is_verified "0|1 - gate: activates RAG inclusion"
        int page_number "source page of gap"
        int times_retrieved "RAG usage frequency counter"
        int answer_length_tokens "context budget control"
        blob embedding "F32_BLOB(1536) - cosine vector search"
        text created_at
        text reviewed_at
    }

    rag_queries {
        text id PK "cuid2"
        text query_text "NOT NULL - original user query"
        text equipment_model "filter applied in retrieval"
        text top_chunk_ids "JSON array - retrieved chunk ids"
        text top_image_ids "JSON array - retrieved image ids"
        text answer_text "final Ingeniero Jefe response"
        int was_helpful "0|1 - user feedback signal"
        int response_ms "end-to-end latency measurement"
        text created_at
    }

    documents ||--o{ document_chunks  : "indexed by OCR + Chunker"
    documents ||--o{ extracted_images : "extracted by Vision"
    documents ||--o{ enrichments      : "gaps detected by Curioso"
    document_chunks }o--o| extracted_images : "related_chunk_id context bridge"
    document_chunks ||--o{ enrichments    : "reference_type = chunk"
    extracted_images ||--o{ enrichments   : "reference_type = image"
```

---

## Descripción por Entidad

### `documents` — Tabla Maestra de Documentos
Registro central de cada PDF técnico procesado. Actúa como raíz de la jerarquía de datos y como registro de estado del pipeline de indexación.

| Grupo de campos | Descripción |
|---|---|
| **Taxonomía** | `brand`, `equipment_model`, `doc_type`, `language` — permiten filtrar el espacio de búsqueda vectorial por modelo de equipo |
| **Storage** | `pdf_url` → path en Cloudflare R2 (`docId/original.pdf`) |
| **Pipeline state** | `status` con índice: `pending → processing → ready → error`. Consultado por polling desde el frontend |
| **FinOps** | `cost_*` por agente y `total_cost` en USD. Actualizados al finalizar cada agente del Enjambre A |
| **Auditor** | `auditor_recommendations` — JSON producido por VectorScanner con observaciones sobre la calidad del índice |

---

### `document_chunks` — Fragmentos de Texto RAG
Resultado de la segmentación semántica del Chunker. Cada registro representa un fragmento de conocimiento técnico con su vector asociado.

| Campo clave | Descripción |
|---|---|
| `chunk_type` | Clasifica el contenido: `procedure` (pasos operativos), `specification` (valores técnicos), `warning` (advertencias de seguridad), `table`, `text` |
| `has_warning` | Flag `1` en chunks con advertencias de seguridad. Permite al Analista priorizar fragmentos críticos |
| `content_tokens` | Estimación de tokens para gestionar el presupuesto de contexto del Ingeniero Jefe |
| `embedding` | `F32_BLOB(1536)` generado por `text-embedding-3-small`. Habilita `vector_distance_cos()` en Turso |

**Índices:** `idx_chunks_document`, `idx_chunks_page`, `idx_chunks_warning`

---

### `extracted_images` — Imágenes Multimodales RAG
Imágenes extraídas por OCR y clasificadas por Vision (pixtral-12b-2409). Incluye el ciclo HITL completo de revisión humana.

| Campo clave | Descripción |
|---|---|
| `image_type` | Clasificación de Vision: `diagram`, `schematic`, `photo`, `table`, `other` |
| `confidence` | Score de certeza de pixtral-12b (0.0–1.0) sobre la clasificación |
| `is_critical` | Imágenes que Vision marca como safety-relevant (circuitos de seguridad, esquemas de emergencia) |
| `is_useful` | Estado HITL: `0=pendiente`, `1=útil`, `-1=descartar`. Controlado desde el EnrichmentReviewer |
| `user_comment` | Anotación libre del técnico experto: "es el diagrama SCIC que controla el frenado" |
| `related_chunk_id` | FK que vincula la imagen al chunk de texto de su misma página para contexto cruzado |
| `embedding` | `F32_BLOB(1536)` generado desde la `description` de Vision. Habilita búsqueda semántica de imágenes |

**Índices:** `idx_images_document`, `idx_images_critical`, `idx_images_type`

---

### `enrichments` — Conocimiento Experto HITL
Tabla central del ciclo Human-in-the-Loop. Almacena las lagunas de conocimiento detectadas por el Curioso y las respuestas de los expertos humanos que enriquecen el RAG.

| Campo clave | Descripción |
|---|---|
| `reference_id` / `reference_type` | Relación polimórfica: apunta a un `document_chunk.id` o `extracted_image.id` según `reference_type` |
| `generated_question` | La laguna detectada por el Curioso: "¿Qué significa el código E407 en el módulo SDIC?" |
| `expert_answer` | `NULL` hasta que el experto responde en el EnrichmentReviewer |
| `answer_source` | Trazabilidad: `pending` (sin responder) → `expert` (respondido) → `inherited` (propagado por herencia) |
| `inheritance_level` | **L1**: misma pregunta exacta en otro doc → hereda respuesta. **L2**: mismo modelo de equipo → hereda. **L3**: similitud semántica vectorial ≤0.25 → hereda. Reduce carga sobre el experto |
| `is_verified` | **Gate de calidad crítico**: solo los enrichments con `is_verified=1` se incluyen en el contexto RAG del Bibliotecario Texto (LEFT JOIN) |
| `times_retrieved` | Contador de veces que el RAG sirvió este enrichment en consultas reales. Permite análisis de utilidad |
| `embedding` | `F32_BLOB(1536)` de la `expert_answer`. Habilita que el Bibliotecario recupere enrichments por similitud semántica |

**Índices:** `idx_enrichments_document`, `idx_enrichments_reference`, `idx_enrichments_pending`

---

### `rag_queries` — Registro de Sesiones RAG
Log de cada consulta completada por el Enjambre B. Base de datos para análisis de calidad, latencia y feedback loop del sistema.

| Campo clave | Descripción |
|---|---|
| `top_chunk_ids` | JSON array con los IDs de los chunks que formaron el `groundTruth` de esa sesión |
| `top_image_ids` | JSON array con los IDs de las imágenes que aportaron `imageContext` |
| `was_helpful` | Señal de feedback del técnico (0/1). Futura base para fine-tuning o reranking |
| `response_ms` | Latencia end-to-end desde la query del técnico hasta el cierre del stream SSE |

---

## Relaciones

| Relación | Cardinalidad | Descripción |
|---|---|---|
| `documents` → `document_chunks` | 1:N | Un documento genera múltiples chunks tras OCR + Chunker |
| `documents` → `extracted_images` | 1:N | Un documento produce múltiples imágenes tras OCR + Vision |
| `documents` → `enrichments` | 1:N | El Curioso genera múltiples lagunas por documento |
| `document_chunks` → `extracted_images` | N:1 (nullable) | `related_chunk_id` vincula imagen con el texto de su misma página |
| `document_chunks` → `enrichments` | 1:N | Un chunk puede tener múltiples lagunas detectadas (`reference_type=chunk`) |
| `extracted_images` → `enrichments` | 1:N | Una imagen puede tener múltiples lagunas detectadas (`reference_type=image`) |

---

## Notas sobre el Motor Vectorial

Turso LibSQL implementa búsqueda vectorial nativa mediante la función `vector_distance_cos(col, vector32(?))` que computa la similitud coseno entre dos vectores `F32_BLOB(1536)`.

```sql
-- Query del Bibliotecario Texto (Nodo 2A)
SELECT dc.content, vector_distance_cos(dc.embedding, vector32(?)) AS distance
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.status = 'ready' AND dc.embedding IS NOT NULL
ORDER BY distance ASC
LIMIT 5;

-- Query del Bibliotecario de Imágenes (Nodo 2B)
SELECT ei.description, vector_distance_cos(ei.embedding, vector32(?)) AS distance
FROM extracted_images ei
WHERE ei.is_useful != -1 AND ei.embedding IS NOT NULL
ORDER BY distance ASC
LIMIT 3;
```

El parámetro `?` recibe el vector de la query del técnico vectorizado por `text-embedding-3-small` (1536 dimensiones) como `Uint8Array` derivado de `Float32Array`.

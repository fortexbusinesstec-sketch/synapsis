# Diagrama 1 — Lógico: Interacción entre Agentes y Flujo RAG

**Sistema:** Synapse MAS — RAG Multi-Agente para Diagnóstico Técnico de Elevadores Schindler
**Nivel:** Diseño lógico · Vista de componentes y flujos de datos
**Apto para:** Presentación en tesis, documentación técnica de arquitectura

---

## Finalidad

Mapa completo de interacción entre los dos enjambres del sistema. El **Enjambre A** transforma PDFs técnicos en conocimiento vectorial persistente. El **Enjambre B** recupera ese conocimiento en tiempo real y lo procesa en cadena para producir diagnósticos técnicos verificados y transmitidos por streaming al técnico.

---

## Diagrama

```mermaid
flowchart TD
    classDef user     fill:#FFF3CD,stroke:#D97706,color:#1C1917,font-weight:bold
    classDef frontend fill:#DBEAFE,stroke:#1D4ED8,color:#1C1917
    classDef api      fill:#D1FAE5,stroke:#065F46,color:#1C1917,font-weight:bold
    classDef agent    fill:#EDE9FE,stroke:#6D28D9,color:#1C1917
    classDef sentinel fill:#FEE2E2,stroke:#991B1B,color:#1C1917,font-weight:bold
    classDef hitl     fill:#FEF3C7,stroke:#92400E,color:#1C1917
    classDef db       fill:#E0F2FE,stroke:#0369A1,color:#1C1917
    classDef storage  fill:#ECFDF5,stroke:#047857,color:#1C1917
    classDef staged   fill:#F3F4F6,stroke:#9CA3AF,color:#6B7280,stroke-dasharray:5 5

    TECH["👤 Técnico / Ingeniero\nElevadores Schindler"]:::user
    ADMIN["👔 Administrador\nGestión Documental"]:::user

    subgraph PRES["🖥️  PRESENTATION — Next.js 16 · App Router · React 19"]
        CHAT_UI["💬 SynapsisGoChat\n/dashboard/go · SSE Streaming"]:::frontend
        DASH_UI["📊 Document Manager\n/dashboard/documents"]:::frontend
        ENRICH_UI["🔍 EnrichmentReviewer\n/documents/id/refine · HITL Expert Answers"]:::hitl
    end

    AUTH["🔐 Auth Middleware\nproxy.ts · schindler_session cookie"]:::api

    subgraph APIL["⚙️  API LAYER — Next.js Route Handlers · Vercel AI SDK v4.1"]
        API_CHAT["⚡ POST /api/chat\nmaxDuration: 60s · streamText · SSE"]:::api
        API_UPLOAD["📤 POST /api/upload\nmaxDuration: 300s · waitUntil · multipart"]:::api
    end

    subgraph SWB["🧠  ENJAMBRE B — Comité de Diagnóstico · Agentic Loop max=3"]
        direction TB
        N0["[N0] 🔤 Clarificador\ngpt-4o-mini\nIntent Classification\nQuery Expansion · enriched_query"]:::agent
        N05["[N0.5] 🗺️ Enrutador Semántico\ngpt-4o-mini · staged\nfiltros_metadatos · entidades_criticas\nbuildSqlFilters"]:::staged
        N1["[N1] 📋 Planificador\ngpt-4o-mini\nDual Search Plan\ntext_query + image_query"]:::agent
        N2A["[N2A] 📚 Bibliotecario Texto\nvector_distance_cos\ndocument_chunks + enrichments\nLIMIT 5+3+3 Schindler General"]:::agent
        N2B["[N2B] 🖼️ Bibliotecario Imgs\nvector_distance_cos\nextracted_images · buildImageContext\nLIMIT 3"]:::agent
        N3["[N3] 🔬 Analista / Evaluador\ngpt-4o-mini\nurgency · responseMode\nis_resolved · missing_info"]:::agent
        N35["[N3.5] 🛡️ Verificador de Fidelidad\ngpt-4o · Safety Auditor · staged\nis_valid · confidence_score\nsafe_fallback_response"]:::staged
        N4["[N4] ⚡ Ingeniero Jefe\ngpt-4o · streamText\nRespuesta técnica hiperprecisa\nEMERGENCY / TROUBLESHOOTING / LEARNING"]:::agent
        N5["[N5] 📈 Metrificador\nINSERT rag_queries\ncosts · latencia · hasEnrichments"]:::agent
    end

    subgraph SWA["⚙️  ENJAMBRE A — Indexing Pipeline · 8 Agentes"]
        direction TB
        A1["[A1] 📖 OCR\nmistral-ocr-latest · $0.001/pág\nOcrPage[] · markdown + images"]:::agent
        A2["[A2] 🎯 Orchestrator\ngpt-4o-mini\nstrategy · priority_pages\nestimated_complexity · language"]:::agent
        A3["[A3] 👁️ Vision\npixtral-12b-2409\nimageType · confidence\nisCritical · description"]:::agent
        A4["[A4] 🔷 DiagramReasoner\ngpt-4o-mini\ncomponents · connections\ncontrol_logic · failure_modes"]:::agent
        A5["[A5] ✂️ Chunker\ngpt-4o-mini\nchunkType · hasWarning\nsectionTitle · tokenEstimate"]:::agent
        A6["[A6] 🔢 Embedder\ntext-embedding-3-small\nF32_BLOB 1536-dim\nbatch INSERT Turso"]:::agent
        A7["[A7] 🔍 VectorScanner\nauditorRecommendations\nasync · scan"]:::agent
        A8["[A8] 🤔 Curioso — HITL\ngpt-4o-mini · Background\nGap Detection\nHerencia L1 L2 L3"]:::hitl
    end

    subgraph DL["🗄️  DATA LAYER — Turso LibSQL · vector_distance_cos()"]
        direction LR
        DDOC["📄 documents\nbrand · model · status\ncosts · pdfUrl · pageCount"]:::db
        DCHK["📦 document_chunks\ncontent · chunkType · hasWarning\nF32_BLOB 1536 · contentTokens"]:::db
        DIMG["🖼️ extracted_images\nimageType · isCritical · isUseful\nF32_BLOB 1536 · userComment"]:::db
        DENR["💡 enrichments\ngeneratedQuestion · expertAnswer\nanswerSource · inheritanceLevel\nF32_BLOB 1536 · isVerified"]:::db
        DRAG["🔁 rag_queries\nqueryText · topChunkIds\nwasHelpful · responseMs"]:::db
    end

    BLOB["☁️ Cloudflare R2\nhtl-ascensores-lib\nPDFs + Imágenes procesadas"]:::storage

    TECH --> CHAT_UI
    ADMIN --> DASH_UI
    ADMIN --> ENRICH_UI
    AUTH -.->|"validates cookie"| CHAT_UI
    AUTH -.->|"validates cookie"| DASH_UI
    CHAT_UI -->|"messages[] · equipmentModel · sessionId"| API_CHAT
    DASH_UI -->|"multipart/form-data · PDF binary"| API_UPLOAD
    ENRICH_UI -->|"expert_answer · isVerified=1"| DENR

    API_CHAT --> N0
    N0 -->|"enriched_query · intent"| N05
    N05 -.->|"filtros_metadatos staged"| N1
    N0 -->|"enriched_query fallback"| N1
    N1 -->|"text_query"| N2A
    N1 -->|"image_query"| N2B
    N2A -->|"groundTruth context"| N3
    N2B -->|"imageContext descriptions"| N3
    N3 -->|"missing_info · GAP DETECTADO"| N1
    N3 -->|"is_resolved=true · hipotesis"| N35
    N35 -.->|"is_valid=true · staged"| N4
    N35 -.->|"safe_fallback · staged"| N4
    N3 -->|"approved fallback"| N4
    N4 -->|"SSE stream chunks"| API_CHAT
    N4 --> N5
    API_CHAT -->|"text/event-stream"| CHAT_UI

    API_UPLOAD -->|"INSERT status=pending"| DDOC
    API_UPLOAD -->|"PUT object"| BLOB
    DDOC -.->|"trigger pipeline"| A1
    A1 -->|"OcrPage[] markdown"| A2
    A1 -->|"images[] base64"| A3
    A2 -->|"strategy · language"| A5
    A3 -->|"type=diagram · type=schematic"| A4
    A4 -->|"structured_knowledge injection"| A5
    A3 -->|"INSERT imageType · embedding"| DIMG
    A5 -->|"PreparedChunk[]"| A6
    A6 -->|"INSERT chunks + F32_BLOB"| DCHK
    A6 -->|"UPDATE status=ready · costs"| DDOC
    A7 -.->|"async UPDATE recommendations"| DDOC
    A8 -.->|"INSERT pending gaps L1-L3"| DENR

    N2A -->|"vector_distance_cos LIMIT 11"| DCHK
    N2A -->|"LEFT JOIN is_verified=1"| DENR
    N2B -->|"vector_distance_cos LIMIT 3"| DIMG
    N5 -->|"INSERT metrics"| DRAG
```

---

## Descripción por Capa

| Capa | Rol |
|---|---|
| **Presentation** | Next.js 16 con App Router: UI de chat (SSE streaming), gestión de documentos y revisión HITL del experto |
| **API Layer** | Route handlers de Next.js que orquestan ambos pipelines sobre Vercel Serverless |
| **Enjambre B** | Pipeline conversacional con agentic loop: cada iteración refina la búsqueda hasta que el contexto es suficiente o se alcanzan 3 loops |
| **Enjambre A** | Pipeline de indexación no bloqueante (`waitUntil`): convierte un PDF en chunks vectorizados y lanza el Curioso en background |
| **Data Layer** | Turso LibSQL con búsqueda vectorial nativa `vector_distance_cos()` sobre blobs `F32_BLOB(1536)` |

## Descripción por Componente — Enjambre B

| Nodo | Modelo | Responsabilidad |
|---|---|---|
| **[N0] Clarificador** | gpt-4o-mini | Clasifica el intent (`troubleshooting / education_info / emergency_protocol`) y expande la query con contexto del historial |
| **[N0.5] Enrutador Semántico** | gpt-4o-mini *(staged)* | Extrae entidades explícitas para construir filtros SQL precisos pre-retrieval. Reduce el espacio de búsqueda vectorial |
| **[N1] Planificador** | gpt-4o-mini | Genera un plan de búsqueda dual: `text_query` optimizada para fragmentos de texto y `image_query` para descripciones de esquemas |
| **[N2A] Bibliotecario Texto** | — | Ejecuta `vector_distance_cos` sobre `document_chunks` con `LEFT JOIN enrichments is_verified=1`. Devuelve hasta 11 fragmentos como `groundTruth` |
| **[N2B] Bibliotecario Imgs** | — | Ejecuta `vector_distance_cos` sobre `extracted_images`. Devuelve hasta 3 imágenes con sus descripciones como `imageContext` |
| **[N3] Analista / Evaluador** | gpt-4o-mini | Evalúa si el contexto acumulado es suficiente para diagnosticar. Si no: define el `missing_info` (gap) y regresa al Planificador. Si sí: aprueba y pasa al siguiente nodo |
| **[N3.5] Verificador de Fidelidad** | gpt-4o *(staged)* | Auditor de seguridad estricto. Contrasta la hipótesis del Analista contra la fuente RAG. Si algún dato técnico no está respaldado: `is_valid=false` y emite `safe_fallback_response` |
| **[N4] Ingeniero Jefe** | gpt-4o | Genera la respuesta técnica final en modo streaming SSE. Adapta el tono según `responseMode`: EMERGENCY, TROUBLESHOOTING, LEARNING o DEEP_ANALYSIS |
| **[N5] Metrificador** | — | Persiste la sesión en `rag_queries` con métricas de costo, latencia, chunks usados e indicadores de calidad |

## Descripción por Componente — Enjambre A

| Nodo | Modelo | Responsabilidad |
|---|---|---|
| **[A1] OCR** | mistral-ocr-latest | Extrae texto e imágenes rasterizadas del PDF. Produce `OcrPage[]` con markdown por página a $0.001/pág |
| **[A2] Orchestrator** | gpt-4o-mini | Analiza las 2 primeras páginas y decide la estrategia: `text_heavy / image_heavy / balanced`, `priority_pages` e idioma |
| **[A3] Vision** | pixtral-12b-2409 | Clasifica cada imagen: `imageType`, `confidence`, `isCritical`, `description` libre. Solo procesa imágenes no descartadas |
| **[A4] DiagramReasoner** | gpt-4o-mini | Se activa cuando Vision detecta `diagram` o `schematic`. Produce conocimiento estructurado: componentes, conexiones, lógica de control y modos de fallo. Se inyecta en el markdown del Chunker |
| **[A5] Chunker** | gpt-4o-mini | Segmentación semántica del texto de todas las páginas. Produce chunks con `chunkType`, `hasWarning`, `sectionTitle` y `tokenEstimate` |
| **[A6] Embedder** | text-embedding-3-small | Vectoriza cada chunk. Inserta en `document_chunks` como `F32_BLOB(1536)`. Actualiza `status=ready` al completar |
| **[A7] VectorScanner** | — | Escanea de forma asíncrona la base vectorial y genera `auditorRecommendations` para el dashboard |
| **[A8] Curioso** | gpt-4o-mini | Corre en background tras `status=ready`. Detecta lagunas de conocimiento y aplica herencia en cascada L1 (exacto) → L2 (modelo) → L3 (semántico) antes de crear una nueva pregunta HITL |

## Flujo Principal del Sistema

```
[INDEXACIÓN]
Administrador sube PDF
  → waitUntil desacopla respuesta HTTP del pipeline
  → OCR extrae texto e imágenes
  → Orchestrator decide estrategia
  → Vision clasifica imágenes (paralelo con Chunker)
    → DiagramReasoner enriquece diagramas con knowledge graph
  → Chunker segmenta el texto con metadata semántica
  → Embedder vectoriza y persiste en Turso (status=ready)
  → Curioso detecta lagunas y genera preguntas HITL en background
  → Experto responde en EnrichmentReviewer (isVerified=1)

[CONSULTA RAG]
Técnico envía consulta
  → Clarificador expande query y clasifica intent
  → Planificador genera plan de búsqueda dual
  → Bibliotecarios recuperan chunks e imágenes en paralelo
  → Analista evalúa suficiencia del contexto
    → Si insuficiente: define gap → regresa al Planificador (max 3x)
    → Si suficiente: aprueba hipótesis
  → [Verificador audita fidelidad contra fuente RAG - staged]
  → Ingeniero Jefe transmite respuesta técnica por SSE
  → Metrificador persiste sesión
```

---

> **Nota sobre componentes staged:** El Enrutador Semántico (`lib/agents/semantic_router.ts`) y el Verificador de Fidelidad (`lib/agents/verifier.ts`) están implementados y testeados pero pendientes de integración en `app/api/chat/route.ts`. Se muestran con borde discontinuo en el diagrama.

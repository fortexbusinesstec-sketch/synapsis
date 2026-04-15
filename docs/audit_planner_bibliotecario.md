# Auditoría Técnica: Planificador & Bibliotecario
**Fase de Métricas — Preparación de la Configuración A (Sistema Completo)**
*Fecha: 2026-04-11 | Ingeniería Synapsis Go*

---

## 1. PLANIFICADOR (`lib/agents/planner.ts`)

### 1.1 Vulnerabilidades Encontradas

| # | Tipo | Descripción | Impacto |
|---|------|-------------|---------|
| VUL-P1 | **Overthinking / Role Creep** | El system_prompt no prohíbe explícitamente que el Planificador emita diagnósticos o hipótesis. El LLM infiere un rol de Analista asistente cuando el contexto del gap es ambiguo. | El `text_query` se contamina con texto diagnóstico que sesga el embedding hacia intenciones en lugar de términos literales del manual. |
| VUL-P2 | **Output sin schema estricto** | Parsing manual con `JSON.parse`. Si el LLM devuelve frases diagnósticas dentro de `text_query`, ese texto va directamente al vector de búsqueda. | Recuperación irrelevante en el Bibliotecario. |
| VUL-P3 | **Default fallback sin normalización** | `defaultPlannerOutput` devuelve la query raw del técnico. Si contiene jerga informal, el embedding es pésimo. | Baja similitud en Loop 0 y activación innecesaria del fallback de rescate. |
| VUL-P4 | **Sin límite de longitud de output** | El LLM puede devolver párrafos enteros como queries, generando embeddings polisémicos. | El vector apunta a múltiples intenciones a la vez, degradando la precisión. |

### 1.2 Refactors Aplicados

**① PROHIBICIÓN EXPLÍCITA DE DIAGNÓSTICO** inyectada en el system_prompt:
```
ESTRICTAMENTE PROHIBIDO: emitir diagnósticos, hipótesis de causa raíz, conclusiones
o recomendaciones de acción. Eso es responsabilidad exclusiva del Analista.
Tu output son queries de búsqueda, no veredictos.
```

**② GUÍA DE FORMATO con ejemplos buenos/malos:**
```
BIEN: "resistencia bobina freno MGB Schindler 3300"
MAL:  "verificar si la bobina está quemada porque el freno no suelta"
```

**③ TRUNCADO FORZADO** de `text_query` e `image_query` a 120 caracteres máximo post-parsing para garantizar embeddings monomodales.

**④ NORMALIZACIÓN MÍNIMA** del `defaultPlannerOutput`: extrae modelo del equipo + entidades técnicas antes de usar la query raw, asegurando que el vector sea específico desde el Loop 0.

---

## 2. BIBLIOTECARIO (`lib/agents/bibliotecario.ts`)

### 2.1 Vulnerabilidades Encontradas

| # | Tipo | Descripción | Impacto |
|---|------|-------------|---------|
| VUL-B1 | **historyContext ignorado en el embedding** | El Bibliotecario solo recibe `plan.text_query`. Si en el Turno 3 el técnico pregunta "el freno", la búsqueda no incluye el modelo ni el código de error mencionados en el Turno 1. | **Fallo en Categoría III (Secuencial)**: pasos de procedimientos largos no se recuperan porque la query pierde el contexto acumulado. |
| VUL-B2 | **Sin extracción garantizada de modelo/código** | En bypass de Loop 0, la query es la frase raw sin modelo. | Alta variabilidad en recuperación dependiendo del turno. |
| VUL-B3 | **Query A: LIMIT 12 insuficiente para procedimientos multi-página** | Procedimientos del Menú 40 o calibraciones tienen chunks en páginas separadas. Los primeros 12 por similitud pueden ser genéricos, dejando fuera pasos 3-7. | Omisión de pasos críticos en escenarios secuenciales. |
| VUL-B4 | **Query B: LIMIT 5 excesivamente bajo** | Solo 5 enrichments máximo, subexplotando el conocimiento experto validado. | Subutilización del Q&A de expertos. |
| VUL-B5 | **Query C (imágenes) ancla a documentos de Query A** | Si la similitud textual es baja, Query C busca imágenes en documentos equivocados. | Evidencia visual ausente o irrelevante en los peores casos. |
| VUL-B6 | **`countEntityMatches` filtra entidades con `/^[A-Z0-9]/`** | Mediciones como `"20 ohmios"` o `"450"` no pasan el filtro y no aumentan el score de chunks con tablas de valores nominales. | Chunks con tablas de resistencia subpuntuados vs. chunks genéricos. |

### 2.2 Refactors Aplicados

**① Nuevo parámetro `historyContext` en la firma**: Se extrae el modelo del equipo, el código de error y el síntoma del historial, y se concatenan al `text_query` antes de generar el embedding cuando el Planificador usa bypass (Loop 0).

**② Aumento de LIMITs**: Query A de `12 → 18`, Query B de `5 → 8`, garantizando cobertura de procedimientos largos.

**③ `countEntityMatches` mejorado**: El filtro ahora también acepta entidades numéricas puras (códigos de error, valores de medición) que no empiezan con mayúscula ni con el símbolo de ohmios Ω.

**④ Query C con fallback de documentos ampliado**: Si `textChunks` tiene menos de 2 documentos únicos, la búsqueda de imágenes se amplía por modelo de equipo para no depender de una recuperación textual deficiente.

---

## 3. IMPACTO ESPERADO EN LAS MÉTRICAS FINALES

| Categoría de Pregunta | Score Actual (est.) | Score Esperado Post-Fix |
|---|---|---|
| I. Diagnóstico Técnico | 1.50 | ≥ 1.70 |
| II. Ambigua/Multi-hipótesis | 0.75–1.13 | ≥ 1.00 |
| **III. Secuencial (Procedimientos)** | **Alto riesgo omisión** | **+30% completitud** |
| IV. Enriquecimiento (Q&A Experto) | 1.50–1.75 | ≥ 1.75 (sin regresión) |

---

*Refactors aplicados directamente al código fuente. Archivo generado: 2026-04-11.*

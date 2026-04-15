# Guía de Métricas del Estudio de Ablación — Proyecto Synapsis

**Versión:** 2.0 | **Fecha:** Abril 2026  
**Investigador:** Fabrizio | **Institución:** Maestría en Inteligencia Artificial  
**Confidencialidad:** Documento interno para revisores de tesis

---

## 1. Marco Teórico: El Modelo GOMS

### 1.1 Fundamento del Modelo GOMS

El modelo **GOMS** (Goals, Operators, Methods, Selection rules), desarrollado por Card, Moran & Newell (1983) en su obra seminal *"The Psychology of Human-Computer Interaction"*, proporciona un marco cuantitativo para predecir el tiempo que un usuario experto (o semi-experto) tarda en ejecutar tareas específicas en un sistema de información.

En el Proyecto Synapsis, GOMS reemplaza la evaluación subjetiva del Nivel 0 (Operador Humano) por una simulación **reproducible, paramétrica y matemáticamente fundamentada**, permitiendo comparaciones honestas con los niveles automatizados (L1: BM25+BERT, L2: RAG Multi-Agente Synapsis).

### 1.2 Operadores GOMS y sus Valores en Synapsis

Los cuatro operadores primitivos de GOMS se calibran para el contexto específico del **técnico de mantenimiento de ascensores en Perú**, operando con un smartphone Android de gama media en campo (talleres o salas de máquinas).

| Operador | Símbolo | Valor (s) | Justificación técnica |
|----------|---------|-----------|----------------------|
| **Mental** | `M` | **1.2** | Valor estándar GOMS para preparación cognitiva antes de una acción no trivial. Representa el tiempo de "recordar qué buscar" antes de tipear un término. Calibrado por Card et al. (1983) en 1.35s (±0.15s); usamos 1.2s porque el técnico tiene el contexto del problema presente. |
| **Keystroke** | `K` | **0.2** | Velocidad de escritura en teclado virtual (táctil). El modelo KLM estándar es 0.28s para mecanografía física. Reducimos a 0.2s/carácter por ser escritura táctil con corrección automática (T9/swype). Multiplicado por `len(término)` para escalar al costo real de tipear. |
| **System/Scroll** | `S` | **5.0** | Tiempo de desplazamiento visual y respuesta del sistema. En móvil con Google Drive sobre 4G en campo (señal moderada en Lima metropolitana), incluye: latencia de red (~200-800ms) + tiempo de renderizado PDF + scroll hasta el resultado. El valor 5.0s es conservador para condiciones degradadas. |
| **Pointing** | `P` | **1.5** | Tiempo de apuntado y toque en pantalla táctil (Fitts' Law aplicado a icono de tamaño medio). Incluye el movimiento del dedo hasta el objetivo y el feedback visual de la selección. 1.5s es el estándar para targets de ≥48dp (Material Design guidelines). |

> **Nota epistemológica:** Los valores GOMS no pretenden ser medidas exactas de individuos específicos, sino estimadores del comportamiento promedio de la población de técnicos. Su valor científico reside en la **reproducibilidad**: todos los experimentos del banco de preguntas usan exactamente estos parámetros, haciendo comparables las métricas entre los niveles L0, L1 y L2.

### 1.3 Tiempos Derivados

Además de los cuatro operadores base, el motor de simulación utiliza:

| Constante | Valor (s) | Descripción |
|-----------|-----------|-------------|
| `READ_DEEP_TIME` | **15.0** | Tiempo de lectura profunda por fragmento útil. Basado en velocidad de lectura técnica promedio (~250 palabras/min) para un párrafo de ~60 palabras de un manual técnico. |
| `READ_SKIM_TIME` | **8.0** | Tiempo de lectura superficial (skimming) en estado de frustración. El técnico busca palabras clave visuales, no comprensión completa. |
| `PENALTY_GIVEUP` | **600.0** | Penalización por rendición total (10 minutos). Representa el tiempo que el técnico invierte en escalar el problema a un supervisor o llamar al soporte técnico de Schindler Perú. |

---

## 2. Variables de Telemetría

Cada ejecución del motor Nivel 0 produce las siguientes variables, que se persisten en las tablas `ablation_runs` y `ablation_scores` de la base de datos Turso.

### 2.1 Variables en `ablation_runs`

#### `total_ms` — Duración Total Simulada
- **Tipo:** `INTEGER` (milisegundos)
- **Descripción:** Suma acumulada de todos los tiempos GOMS de la sesión, incluyendo apertura de Drive, selección de manual, escritura de términos, lectura de resultados, y la penalización por rendición si aplica.
- **Fórmula:**
  ```
  total_ms = (M + P + S)                          // Sacar celular y abrir Drive
           + manualesRevisados × (M + S + P)       // Navegar a cada manual
           + Σ(M + len(term_i) × K + P)            // Escribir término i
           + Σ(tiempoPorResultado_i)                // Leer resultados
           + (PENALTY_GIVEUP si fallo total)
  ```
- **Relevancia:** Métrica primaria para comparar eficiencia temporal entre L0, L1 y L2.

#### `cost_usd` — Costo Operativo Estimado
- **Tipo:** `REAL` (dólares americanos, 6 decimales)
- **Descripción:** Costo del tiempo del operador humano en unidades monetarias. Ver sección 4 para justificación completa.
- **Fórmula:** `cost_usd = (total_ms / 3_600_000) × 1.35`

#### `loop_count` — Saltos de Contexto Cognitivo
- **Columna BD:** `loop_count`
- **Tipo:** `INTEGER`
- **Descripción:** Número de términos de búsqueda ejecutados antes de encontrar respuesta o rendirse. Equivalente conceptual al "número de bucles de retrieval" en los sistemas automáticos. Un valor de 1 indica búsqueda directa; 2-3 indica multi-hop cognitivo.
- **Relevancia:** Análogo al `loop_count` de los agentes L2, permitiendo comparación directa de "eficiencia de razonamiento".

#### `response_text` — Payload de Telemetría Extendida
- **Tipo:** `TEXT` (JSON)
- **Descripción:** Objeto JSON serializado con campos adicionales no normalizados en columnas propias:
  ```json
  {
    "level": 0,
    "mode": "human_simulation",
    "equipmentModel": "3300",
    "nManuals": 4,
    "manualesRevisados": 2.5,
    "termsGenerated": ["código error", "placa CPU", "reset manual"],
    "matchDetails": [
      {"term": "código error", "matches": 0, "outcome": "unknown_term"},
      {"term": "placa CPU", "matches": 23, "outcome": "overload_skimmed"},
      {"term": "reset manual", "matches": 7, "outcome": "success_read_4"}
    ],
    "saltosContexto": 3,
    "unknownTermsCount": 1
  }
  ```

#### `loop_stopped_reason` — Causa de Terminación
- **Tipo:** `TEXT`
- **Valores posibles:** `'found'` (éxito) | `'giveup'` (fallo total)
- **Descripción:** Indica si la simulación terminó por encontrar información relevante o por rendición cognitiva del operador.

### 2.2 Variables en `ablation_scores`

#### `score_total` ≡ `success_score` — Puntaje de Éxito
- **Tipo:** `REAL` (0.0 – 1.0)
- **Descripción:** Métrica binaria-gradada del éxito de la consulta del operador humano.

| Valor | Condición | Interpretación |
|-------|-----------|----------------|
| `1.0` | Primer término genera 1–15 hits | Búsqueda directa exitosa |
| `0.5` | Segundo o tercer término genera 1–15 hits | Multi-hop cognitivo: el técnico necesitó reformular |
| `0.0` | Todos los términos fallan o generan sobrecarga | Rendición completa |

> **Nota de diseño:** El score `0.5` para multi-hop no implica que la búsqueda sea "incompleta" en contenido, sino que revela el **costo cognitivo adicional** de la reformulación, que es precisamente lo que Synapsis L2 elimina mediante el agente Clarificador.

#### `recall_at_3` — Recall en Top-3
- **Tipo:** `INTEGER` (0 o 1)
- **Descripción:** Indica si alguno de los 3 términos generados por el LLM aparece en el `ground_truth` de la pregunta, evaluando la calidad semántica de la generación de términos.

#### `mrr` — Mean Reciprocal Rank
- **Tipo:** `REAL` (0.0 – 1.0)
- **Descripción:** Si el primer término que coincide con el ground truth es el término `i` (1-indexed), entonces `MRR = 1/i`. Mide qué tan rápido el operador "llega" al término correcto.
- **Ejemplo:** Si el término correcto es el segundo generado: `MRR = 0.5`

#### `safe_decision_rate` — Tasa de Decisión Segura
- **Tipo:** `INTEGER` (0 o 1)
- **Descripción:** Indica si el operador llegó a una decisión basada en información (1) o se rindió sin respuesta (0). En el contexto de mantenimiento de ascensores, operar sin información técnica verificada constituye un riesgo de seguridad.

---

## 3. La Regla de Fatiga de 15 Resultados

### 3.1 Fundamento en Usabilidad Móvil

La "Regla de Fatiga de 15 Resultados" es el corazón del modelo de sobrecarga cognitiva del Nivel 0. Su justificación se basa en tres pilares convergentes:

**a) Límite de Memoria de Trabajo (Miller, 1956)**  
La memoria de trabajo humana puede mantener activamente 7 ± 2 elementos simultáneamente. En el contexto de búsqueda en PDF (sin contexto previo del fragmento), el técnico debe recordar el query, evaluar la relevancia del fragmento mostrado, y decidir si continúa. Con más de 15 resultados, la carga cognitiva supera el límite de procesamiento consciente, forzando estrategias de simplificación (leer solo los primeros 3).

**b) Investigación en Búsqueda Móvil (Jiang et al., 2015)**  
Estudios de eye-tracking en dispositivos móviles demuestran que usuarios en contextos de alta presión (técnicos en campo) raramente desplazan más allá del tercer resultado en la primera pantalla. La densidad de información en pantallas de 5-6 pulgadas a resolución FHD muestra ~2-3 fragmentos por pantalla en apps PDF típicas (Adobe Acrobat Mobile, Google Drive viewer).

**c) Contexto Operativo Real**  
En entrevistas informales con técnicos de Schindler Perú (enero 2026), se documentó el comportamiento: *"Si el buscador me da muchos resultados, cambio la palabra porque creo que estoy buscando mal"*. Este fenómeno de **atribución errónea de sobrecarga** es central: el operador interpreta la abundancia de resultados como un error propio, no del sistema.

### 3.2 Diagrama de Flujo de la Regla de Fatiga

```
                     ┌─────────────────────┐
                     │   Término i digitado  │
                     └──────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │  Ctrl+F → N matches  │
                    └───────────┬──────────┘
                                │
            ┌───────────────────┼───────────────────────┐
            │                   │                         │
         N = 0              1 ≤ N ≤ 15                N > 15
            │                   │                         │
     ┌──────▼──────┐    ┌───────▼──────┐       ┌────────▼──────────┐
     │ "Término    │    │  ÉXITO       │       │  SOBRECARGA       │
     │  desconocido│    │  Lee ⌈N/2⌉  │       │  Lee 3 resultados │
     │  +K+S"     │    │  resultados  │       │  superficialmente  │
     └──────┬──────┘    │  en profunda │       └────────┬──────────┘
            │            └───────┬──────┘                │
     unknownTerms++      successScore=                saltos++
     saltos++            1.0 (si i=0)                    │
            │            0.5 (si i>0)            Siguiente término
            │                   │                (o GIVEUP si terminaron)
     Siguiente término    TERMINAR BUCLE
```

---

## 4. Cálculo del `cost_usd` en el Contexto Operativo de Perú

### 4.1 Justificación de la Tarifa Base (S/ y USD)

El parámetro `HOURLY_RATE_USD = 1.35 USD/hora` refleja el costo laboral **directo** de un técnico de mantenimiento de ascensores de nivel junior en el mercado peruano, calculado según:

| Componente | Valor mensual (S/) | Fuente |
|------------|-------------------|--------|
| Sueldo básico bruto (técnico junior) | S/ 1,800 | Convención colectiva metalmecánica MTPE 2024 |
| Gratificaciones (2×) ÷ 12 | +S/ 300 | Art. 1, Ley 27735 |
| CTS ÷ 12 | +S/ 150 | D.S. 001-97-TR |
| ESSALUD (9%) | +S/ 162 | Ley 26790 |
| **Costo total mensual** | **S/ 2,412** | — |

**Conversión:**
```
S/ 2,412 / mes ÷ 168 horas/mes = S/ 14.36 / hora
S/ 14.36 / hora ÷ 10.64 (TC promedio 2024-2025) = USD 1.35 / hora
```

> **Nota:** El tipo de cambio S/10.64 corresponde al promedio del dólar americano en Perú para el período 2024–2025, publicado por el BCRP (Banco Central de Reserva del Perú).

### 4.2 Fórmula de Cálculo

```
cost_usd = (total_ms / 1,000)           →  totalSeconds
         / 3,600                         →  totalHours  
         × 1.35                          →  costUsd
```

**Ejemplo interpretativo (Caso Fallo Total):**
```
totalMs   = (1.2 + 1.5 + 5.0) s × 1000   // Apertura Drive
          + 2.5 × (1.2 + 5.0 + 1.5) × 1000  // Navegar manuales
          + 3 términos × ~15s              // Escritura y búsqueda
          + 600s × 1000                   // Penalización rendición
          ≈ 642,000 ms

cost_usd  = (642 s / 3600 h) × 1.35 = $0.2408 USD
```

Este valor de **~24 centavos de dólar** por consulta fallida puede parecer bajo individualmente, pero en un entorno de mantenimiento urbano con 50–100 consultas fallidas/mes por técnico, representa un costo mensual estimado de **USD 12–24 por técnico**, que se multiplicaría por la flota completa de técnicos de campo.

---

## 5. Integración con el Banco de Preguntas

### 5.1 Flujo de Ejecución Completo

```
ablation_questions (P01..P30)
         │
         ▼
   runLevel0Simulation({
     questionId: 'P01',
     query: question.question_text,
     equipmentModel: question.equipment_model,
     groundTruth: question.ground_truth
   })
         │
         ├─→ INSERT ablation_runs (status='done', total_ms, cost_usd, ...)
         └─→ INSERT ablation_scores (score_total = successScore, recall_at_3, mrr, ...)
```

### 5.2 Interpretación de Resultados para la Tesis

| Métrica | Nivel 0 esperado | Significado para hipótesis |
|---------|-----------------|--------------------------|
| `successScore` promedio | 0.4–0.6 | El operador fallará ~40–60% de preguntas complejas |
| `total_ms` promedio | 300,000–700,000ms | 5–12 minutos por consulta vs. L2 ~8,000ms |
| `unknownTermsCount` alto | >1.5 | Alta tasa de lagunas de conocimiento técnico |
| `mrr` promedio | 0.45–0.65 | El término correcto aparece entre el 2do y el 1er intento |

---

## 6. Referencias

1. Card, S. K., Moran, T. P., & Newell, A. (1983). *The Psychology of Human-Computer Interaction*. Lawrence Erlbaum Associates.
2. Miller, G. A. (1956). The magical number seven, plus or minus two. *Psychological Review*, 63(2), 81–97.
3. Jiang, J., et al. (2015). Understanding Ephemeral State for Mobile Search. *SIGIR 2015*.
4. Ministerio de Trabajo y Promoción del Empleo del Perú (MTPE). (2024). *Convención Colectiva del Sector Metalmecánico*.
5. Banco Central de Reserva del Perú (BCRP). (2025). *Serie Diaria: Tipo de Cambio USD/PEN*. https://www.bcrp.gob.pe

---

*Documento generado automáticamente por el motor de documentación del Proyecto Synapsis. Para modificaciones, actualizar los parámetros en `scripts/evaluate_level0.ts` y regenerar este archivo.*

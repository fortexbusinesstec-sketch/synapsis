# 🛠️ Guía de Scripts — Proyecto Synapsis

Este directorio contiene todas las utilidades de automatización para la gestión de la base de datos, evaluación del sistema y generación de documentación técnica (diagramas).

## 📂 Estructura de Directorios

### 1. `scripts/diagrams/` 🎨
Generadores de diagramas en HD usando Graphviz (Python).
- `generar_arquitectura.py`: Arquitectura ArchiMate completa por capas.
- `generar_pipeline_dataset.py`: [NUEVO] Visualización del flujo de colección y preprocesamiento de datos (Indexing Swarm).
- `generar_diagrama_base_datos.py`: Esquema lógico de la base de datos Turso.
- `generate_architecture_hd.py`: Versión simplificada y optimizada para publicaciones.

**Uso:** `python scripts/diagrams/nombre_del_script.py`
*Nota: Las imágenes se exportan automáticamente a la carpeta `/imagenes/`.*

### 2. `scripts/database/` 🗄️
Scripts de migración, mantenimiento y corrección de datos en Turso.
- `migrate-*`: Migraciones de esquema para experimentos de ablación y HITL.
- `batch_fix_costs.mjs`: Recálculo masivo de costos de tokens y OCR.
- `rebuild_metrics.ts`: Reconstrucción de métricas de sesión desde los logs de agentes.
- `backfill-image-embeddings.ts`: Vectorización de imágenes existentes.

**Uso:** `npx tsx scripts/database/nombre_del_script.ts`

### 3. `scripts/evaluation/` 🔬
Motor de experimentos y simulaciones.
- `run_ablation_experiment.ts`: Orquestador principal de pruebas de ablación (L0, L1, L2).
- `evaluate_level0.ts`: Simulador de comportamiento humano basado en el modelo GOMS.
- `seed-*`: Población de bancos de preguntas y escenarios de prueba.

**Uso:** `npx tsx scripts/evaluation/nombre_del_script.ts`

### 4. `scripts/utils/` 🔧
Herramientas secundarias y proxies.
- `proxy.ts`: Túnel para debugging de APIs locales.
- `rerun_curious_all.ts`: Re-ejecución masiva del Agente Curioso sobre documentos indexados.

---

## 🚀 Cómo ejecutar un nuevo diagrama
Si deseas crear un diagrama adicional:
1. Crea un archivo `.py` en `scripts/diagrams/`.
2. Utiliza la librería `graphviz`.
3. Asegúrate de que el script guarde en la carpeta `imagenes/` de la raíz del proyecto.
4. Ejecútalo con `python scripts/diagrams/tu_script.py`.

---
*Mantenimiento: Fabrizio | Abril 2026*

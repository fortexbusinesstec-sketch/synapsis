# 🧪 Scripts de Investigación — Proyecto Synapsis

Este directorio contiene scripts de experimentación, evaluación y generación de documentación técnica para publicaciones.

## 📂 Estructura

### `research/scripts/diagrams/` 🎨
Generadores de diagramas en HD usando Graphviz (Python).
- `generar_arquitectura.py`: Arquitectura ArchiMate completa por capas.
- `generar_pipeline_dataset.py`: Visualización del flujo de colección y preprocesamiento de datos.
- `generar_diagrama_base_datos.py`: Esquema lógico de la base de datos Turso.
- `generate_architecture_paper.py`: Versión optimizada para publicaciones.

**Uso:** `python research/scripts/diagrams/nombre_del_script.py`
*Nota: Las imágenes se exportan automáticamente a la carpeta `research/imagenes/`.*

### `research/scripts/evaluation/` 🔬
Motor de experimentos y simulaciones.
- `run_ablation_experiment.ts`: Orquestador principal de pruebas de ablación (L0, L1, L2).
- `evaluate_level0.ts`: Simulador de comportamiento humano basado en el modelo GOMS.
- `evaluate_level1.ts`: Evaluación del baseline BM25+BERT.
- `seed-*`: Población de bancos de preguntas y escenarios de prueba.

**Uso:** `npx tsx research/scripts/evaluation/nombre_del_script.ts`

### `research/scripts/tmp/` 🗑️
Scripts temporales y de prueba. Pueden eliminarse sin afectar el sistema.

---
*Mantenimiento: Fabrizio | Abril 2026*

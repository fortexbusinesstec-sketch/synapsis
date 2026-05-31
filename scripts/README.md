# 🛠️ Scripts Operativos — Proyecto Synapsis

Este directorio contiene únicamente scripts de operación y mantenimiento del sistema en producción.

## 📂 Estructura

### `scripts/database/` 🗄️
Scripts de migración, mantenimiento y corrección de datos en Turso.
- `migrate-*`: Migraciones de esquema.
- `batch_fix_costs.mjs`: Recálculo masivo de costos de tokens y OCR.
- `rebuild_metrics.ts`: Reconstrucción de métricas de sesión desde logs de agentes.
- `backfill-image-embeddings.ts`: Vectorización de imágenes existentes.

**Uso:** `npx tsx scripts/database/nombre_del_script.ts`

### `scripts/utils/` 🔧
Herramientas secundarias.
- `proxy.ts`: Túnel para debugging de APIs locales.
- `rerun_curious_all.ts`: Re-ejecución masiva del Agente Curioso sobre documentos indexados.
- `retry_bm25_errors.ts`: Reintento de errores BM25.

---

> 📁 El material de investigación (diagramas, evaluación, documentos) se encuentra en `/research/`.

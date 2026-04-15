# Scripts de Utilidad - SYNAPSE MAS

Este directorio contiene scripts de automatización, migración y utilidades para el sistema SYNAPSE.

## Estructura de Carpetas

- `diagrams/`: Scripts de Python para generar diagramas técnicos (ArchiMate, DB, Lógico/Físico). Ver su propio [README](./diagrams/README.md).
- `tmp/`: Scripts temporales utilizados durante el desarrollo para pruebas puntuales o migraciones únicas. Pueden ser eliminados si ya no son necesarios.

## Scripts Principales

### 1. `check_last_doc.ts`
Muestra el ID, título y estado de las métricas del último documento indexado en la base de datos. Útil para verificar rápidamente si el pipeline de indexación funcionó.

### 2. `rebuild_metrics.ts`
Script para recalcular y actualizar la tabla de métricas de indexación para todos los documentos. Útil si se han realizado cambios en la lógica de metrificación.

### 3. `rerun_curious_all.ts`
Vuelve a ejecutar el Agente Curious (detección de gaps y herencia) para todos los documentos del sistema.

### 4. `proxy.ts`
Un middleware de seguridad experimental (no activo).

---
### Cómo ejecutar los scripts
Para los archivos `.ts`, utiliza `npx tsx`:
```bash
npx tsx scripts/check_last_doc.ts
```

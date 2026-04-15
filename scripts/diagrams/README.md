# Generadores de Diagramas de Arquitectura y Base de Datos

Este directorio contiene los scripts de Python encargados de generar las visualizaciones técnicas del proyecto SYNAPSE MAS. Todos los diagramas se exportan a la carpeta `imagenes/`.

## Requisitos
Para ejecutar estos scripts es necesario tener instalado [Graphviz](https://graphviz.org/) en el sistema:
```bash
sudo apt install graphviz -y
```
Y la librería de Python `graphviz`:
```bash
pip install graphviz
```

## Archivos y Descripciones

### 1. `generar_arquitectura.py`
Genera un diagrama de arquitectura siguiendo el estándar **ArchiMate v3**.
- **Propósito**: Visualizar la jerarquía del sistema en 4 capas: Negocio, Aplicación, Datos y Tecnología.
- **Detalle**: Muestra los enjambres de agentes, los servicios de Next.js y la infraestructura de Vercel/Turso/R2.

### 2. `generar_diagrama_base_datos.py`
Genera el diagrama **ER (Entidad-Relación)** completo de la base de datos SQL (Turso/LibSQL).
- **Propósito**: Mostrar la estructura de tablas, tipos de datos y relaciones (1:N, N:M).
- **Detalle**: Incluye tablas de documentos, chunks, imágenes extraídas, logs de agentes y métricas de indexación.

### 3. `generar_diagrama_base_datos_ablacion.py`
Una variante del diagrama de base de datos enfocado en el **Experimento de Ablación**.
- **Propósito**: Documentar las tablas específicas utilizadas para las pruebas de rendimiento y comparación de agentes.

### 4. `generar_diagrama_fisico.py`
Genera un **Diagrama del Modelo Físico** de datos.
- **Propósito**: Detallar la implementación técnica de la base de datos, incluyendo tipos de datos exactos (e.g., F32_BLOB para vectores) y restricciones (Foreign Keys).

### 5. `generar_diagrama_logico.py`
Genera un **Diagrama del Modelo Lógico**.
- **Propósito**: Abstraer la estructura de datos para facilitar la comprensión de las entidades de negocio y sus dependencias sin entrar en detalles de implementación física.

---
**Nota**: Si necesitas editar la estructura de un diagrama, modifica el archivo `.py` correspondiente y ejecútalo con `python3 <archivo>.py`. El resultado se actualizará en `imagenes/`.

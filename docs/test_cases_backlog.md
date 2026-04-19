# Plan de Pruebas: Backlog Synapsis
**Autor:** Fabrizio Diaz  
**Fecha:** 19 de Abril de 2026  
**Proyecto:** Synapsis MAS v2
**Producción:** https://synapsis-azure.vercel.app/

---

## 📋 Matriz de Descripción de Casos de Prueba

| ID Historia | Escenario | Criterio de Aceptación (Título) |
| :--- | :--- | :--- |
| **HU0001** | 1 | Carga exitosa de archivo PDF en Biblioteca Digital |
| **HU0002** | 1 | Procesamiento de texto post-carga mediante OCR |
| **HU0003** | 1 | Asignación de metadatos de equipo (Marca/Modelo) |
| **HU0004** | 1 | Almacenamiento exitoso de Embeddings en Turso |
| **HU0005** | 1 | Bloqueo de archivos no permitidos (docx, jpg) |
| **HU0006** | 1 | Visualización de badges de estado en tiempo real |
| **HU0007** | 1 | Detección y extracción visual de diagramas técnicos |
| **HU0008** | 1 | Generación de metadatos visuales mediante GPT-4o Vision |
| **HU0009** | 1 | Curaduría de utilidad visual (IsUseful flag) |
| **HU0010** | 1 | Trazabilidad Página/Sección para imágenes extraídas |
| **HU0011** | 1 | Inspección de calidad mediante Modal de Alta Resolucción |
| **HU0012** | 1 | Generación automática de dudas por Agente Curioso |
| **HU0013** | 1 | Registro de expertise humana en panel de dudas |
| **HU0014** | 1 | Registro de autoría y timestamp en refinamiento |
| **HU0015** | 1 | Propagación semántica de respuestas (Conocimiento L2/L3) |
| **HU0016** | 1 | Visualización de métricas de transferencia en Observabilidad |
| **HU0017** | 1 | Orquestación exitosa de Enjambre Multi-Agente |
| **HU0018** | 1 | Verificación de suficiencia de contexto (Loop Feedback) |
| **HU0019** | 1 | Gestión de memoria de corto plazo en sesión de chat |
| **HU0020** | 1 | Clasificación y alarmado de nivel de riesgo crítico |
| **HU0021** | 1 | Ruteo inteligente entre modelos LLM por complejidad |
| **HU0022** | 1 | Auditoría de flujo interno en tabla agent_logs |
| **HU0023** | 1 | Recuperación semántica por significado (Query Vectorial) |
| **HU0024** | 1 | Priorización de conocimiento experto en el ranking RAG |
| **HU0025** | 1 | Aislamiento de conocimiento por filtro de equipo |
| **HU0026** | 1 | Inserción de diagramas técnicos con zoom en el chat |
| **HU0027** | 1 | Reuso de contexto recuperado mediante Caché RAG |
| **HU0028** | 1 | Adaptabilidad móvil de la interfaz Synapsis Go |
| **HU0029** | 1 | Toggling dinámico de contexto de equipos |
| **HU0030** | 1 | Visualización de indicadores de procesamiento (Typing) |
| **HU0031** | 1 | Uso de shortcuts técnicos (Quick Replies) |
| **HU0032** | 1 | Persistencia y recuperación de sesiones de los últimos 7 días |

---

## 🛠️ Detalle de Casos de Prueba

### Caso de Prueba: CP001 - CARGA SELECTIVA DE MANUALES
**Autor:** Fabrizio Diaz  
**Precondiciones:** Tener rol de Administrador y acceso a la sección de Biblioteca.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Ingresar a la URL del Dashbord Documents | `https://synapsis-azure.vercel.app/dashboard/documents` | Muestra la lista de documentos. |
| 2 | Dar Click botón: "Subir Manual" | - | Abre el panel de carga. |
| 3 | Seleccionar archivo PDF | `Manual_Schindler_3300.pdf` | El archivo aparece en la zona de drop. |
| 4 | Dar Click botón: INICIAR INGESTIÓN | - | Inicia el progreso de carga. |
| 5 | Observar la lista principal | - | El documento aparece con estado "Pendiente". |

**HU relacionada:** HU0001  
**Postcondiciones:** Documento registrado en tabla `documents`.

---

### Caso de Prueba: CP002 - EXTRACCIÓN OCR EXITOSA
**Autor:** Fabrizio Diaz  
**Precondiciones:** El documento debe haber sido subido exitosamente.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Esperar el procesamiento del Agente OCR | ID del Doc cargado | El estado cambia a "Procesando". |
| 2 | Entrar al detalle de Observabilidad | `https://synapsis-azure.vercel.app/dashboard/documents/[id]` | Muestra el log de fragmentación. |
| 3 | Revisar la pestaña "Chunks" | - | Se visualiza el texto extraído fiel al PDF. |

**HU relacionada:** HU0002  
**Postcondiciones:** Datos persistidos en `document_chunks`.

---

### Caso de Prueba: CP003 - CLASIFICACIÓN POR MARCA Y MODELO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Estar en el formulario de carga.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Seleccionar Marca en desplegable | "Schindler" | Valor seleccionado correctamente. |
| 2 | Seleccionar Modelo en desplegable | "3300" | Valor seleccionado correctamente. |
| 3 | Completar la carga del archivo | - | El documento se guarda. |
| 4 | Verificar en la tabla de documentos | - | Las columnas `brand` y `equipmentModel` coinciden. |

**HU relacionada:** HU0003  
**Postcondiciones:** El documento queda segmentado correctamente.

---

### Caso de Prueba: CP004 - GENERACIÓN DE EMBEDDINGS
**Autor:** Fabrizio Diaz  
**Precondiciones:** Texto extraído y estado en "Embedding".

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Monitorear el Agente de Vectores | - | El log muestra llamadas a OpenAI small-3. |
| 2 | Consultar la base de datos Turso | `SELECT count(*) FROM document_chunks` | El conteo coincide con el número de chunks. |

**HU relacionada:** HU0004  
**Postcondiciones:** Chunks vectorizados listos para búsqueda semántica.

---

### Caso de Prueba: CP005 - VALIDACIÓN DE TIPOS DE ARCHIVO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Estar en el panel de carga.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Arrastrar un archivo no permitido | `Imagen_Manual.jpg` | El sistema bloquea la acción. |
| 2 | Intentar subir mediante explorador | `Guia.docx` | Mensaje de error: "Solo se permiten archivos PDF". |

**HU relacionada:** HU0005  
**Postcondiciones:** La carga no se inicia para archivos inválidos.

---

### Caso de Prueba: CP006 - MONITOREO DE ESTADO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Documentos en distintos niveles de procesamiento.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Navegar a la lista de Biblioteca | `https://synapsis-azure.vercel.app/dashboard/documents` | Se ven badges de colores (Azul, Amarillo, Verde). |
| 2 | Refrescar la página durante un proceso | - | Los badges cambian dinámicamente según el backend. |

**HU relacionada:** HU0006  
**Postcondiciones:** El administrador conoce la disponibilidad del conocimiento.

---

### Caso de Prueba: CP007 - DETECCIÓN DE DIAGRAMAS
**Autor:** Fabrizio Diaz  
**Precondiciones:** PDF con circuitos eléctricos procesándose.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Ejecutar Agente de Visión | - | Escanea las páginas del PDF. |
| 2 | Revisar tabla `extracted_images` | - | Se han generado registros de imágenes. |

**HU relacionada:** HU0007  
**Postcondiciones:** Imágenes recortadas y guardadas en Storage.

---

### Caso de Prueba: CP017 - ORQUESTACIÓN MULTI-AGENTE (CHAT)
**Autor:** Fabrizio Diaz  
**Precondiciones:** Tener documentos indexados en estado "Listo".

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Ingresar a Synapsis Go | `https://synapsis-azure.vercel.app/dashboard/go` | Carga la interfaz de chat. |
| 2 | Seleccionar Modelo | "Schindler 3300" | Activa el pipeline de agentes. |
| 3 | Enviar pregunta compleja | "Fallo en variador de frecuencia" | Se ve el "Thinking state" pasando por agentes. |
| 4 | Recibir respuesta estructurada | - | Respuesta coherente basada en múltiples fuentes. |

**HU relacionada:** HU0017  
**Postcondiciones:** El flujo MAS se completa sin errores de timeout.

---

### Caso de Prueba: CP031 - BOTONES DE ACCIÓN RÁPIDA
**Autor:** Fabrizio Diaz  
**Precondiciones:** Chat iniciado con modelo seleccionado.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Observar burbujas de sugerencia | - | Muestra botones como "Cómo reseteo...". |
| 2 | Tocar el botón "Tengo un problema..." | - | El input de texto se rellena con la frase sugerida. |
| 3 | Completar la frase y enviar | "...con el freno" | La consulta se envía normalmente. |

**HU relacionada:** HU0031  
**Postcondiciones:** Facilita la interacción al técnico en campo.

---

### Caso de Prueba: CP032 - HISTORIAL DE SESIONES RECIENTES
**Autor:** Fabrizio Diaz  
**Precondiciones:** Sesiones de chat previas cargadas.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Dar Click en botón de Historial (Reloj) | - | Se abre el panel lateral de sesiones. |
| 2 | Seleccionar una sesión del día anterior | - | El chat se carga con todos los mensajes anteriores. |

**HU relacionada:** HU0032  
**Postcondiciones:** El técnico recupera lecciones aprendidas de días previos.

---
*(Nota: Este documento ha sido actualizado para la versión de producción en Vercel).*

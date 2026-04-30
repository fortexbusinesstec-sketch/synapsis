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

### Caso de Prueba: CP008 - GENERACIÓN DE METADATOS VISUALES
**Autor:** Fabrizio Diaz  
**Precondiciones:** Imágenes extraídas exitosamente.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Monitorear el Agente Pixtral | - | Analiza el contenido de cada imagen. |
| 2 | Revisar descripciones técnicas | - | El campo `description` contiene detalles técnicos precisos. |
| 3 | Verificar nivel de confianza | - | El valor `confidence` es mayor a 0.7. |

**HU relacionada:** HU0008  
**Postcondiciones:** Metadatos visuales enriquecidos para búsqueda multimodal.

---

### Caso de Prueba: CP009 - CURADURÍA DE UTILIDAD (HITL)
**Autor:** Fabrizio Diaz  
**Precondiciones:** Imágenes con metadatos generados.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Entrar a la pestaña "Imágenes" del detalle | - | Muestra el grid de imágenes extraídas. |
| 2 | Marcar una imagen como "No Útil" | - | El sistema actualiza el registro en tiempo real. |
| 3 | Agregar un comentario técnico | "Diagrama incompleto" | El comentario se persiste correctamente. |

**HU relacionada:** HU0009  
**Postcondiciones:** El pipeline RAG ignora imágenes marcadas como no útiles.

---

### Caso de Prueba: CP010 - TRAZABILIDAD DE IMÁGENES
**Autor:** Fabrizio Diaz  
**Precondiciones:** Imágenes curadas en la biblioteca.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Observar el footer de la tarjeta de imagen | - | Muestra número de página y sección origen. |
| 2 | Comparar con el PDF original | - | El fragmento visual corresponde exactamente a la página indicada. |

**HU relacionada:** HU0010  
**Postcondiciones:** Integridad estructural entre el manual PDF y los activos visuales.

---

### Caso de Prueba: CP011 - INSPECCIÓN DE ALTA RESOLUCIÓN
**Autor:** Fabrizio Diaz  
**Precondiciones:** Tener imágenes en el detalle del documento.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Dar Click sobre la miniatura de la imagen | - | Se abre el Modal de Alta Resolución. |
| 2 | Verificar nitidez del diagrama | Zoom al 100% | Las etiquetas de texto del diagrama son legibles. |

**HU relacionada:** HU0011  
**Postcondiciones:** Validación técnica exitosa por parte del administrador.

---

### Caso de Prueba: CP012 - GENERACIÓN AUTOMÁTICA DE DUDAS
**Autor:** Fabrizio Diaz  
**Precondiciones:** Fragmentos cargados con baja densidad de información.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Revisar el panel "Dudas del Sistema" | - | El Agente Curioso ha listado preguntas técnicas. |
| 2 | Validar coherencia de la duda | - | La pregunta es específica sobre una laguna del manual. |

**HU relacionada:** HU0012  
**Postcondiciones:** Identificación de lagunas de conocimiento técnica.

---

### Caso de Prueba: CP013 - REGISTRO DE EXPERTISE HUMANA
**Autor:** Fabrizio Diaz  
**Precondiciones:** Existencia de dudas pendientes de respuesta.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Seleccionar una duda y escribir respuesta | "El reseteo se hace vía J6" | El texto se guarda en `expert_answer`. |
| 2 | Guardar y verificar estado | - | La duda desaparece de la lista de pendientes. |

**HU relacionada:** HU0013  
**Postcondiciones:** Base de conocimiento enriquecida con experiencia real.

---

### Caso de Prueba: CP014 - REGISTRO DE AUTORÍA Y TIEMPO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Haber respondido una duda.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Consultar metadatos del enriquecimiento | - | Muestra el ID del usuario y el timestamp exacto. |

**HU relacionada:** HU0014  
**Postcondiciones:** Trazabilidad completa de quién inyectó conocimiento.

---

### Caso de Prueba: CP015 - PROPAGACIÓN SEMÁNTICA (L2/L3)
**Autor:** Fabrizio Diaz  
**Precondiciones:** Respuesta de experto registrada para un modelo.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Verificar nivel de herencia asignado | - | Se marca como L2 (Modelo) o L3 (Semántico). |
| 2 | Consultar en el chat sobre el mismo tema | - | La respuesta del experto aparece en el contexto. |

**HU relacionada:** HU0015  
**Postcondiciones:** El conocimiento se reutiliza en contextos similares.

---

### Caso de Prueba: CP016 - MÉTRICAS DE TRANSFERENCIA
**Autor:** Fabrizio Diaz  
**Precondiciones:** Documento procesado con enriquecimientos.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Ir a la vista de Observabilidad del Doc. | - | Localizar gráfico "Métricas de Indexación". |
| 2 | Verificar contadores L1, L2, L3 | - | Muestran valores numéricos coherentes con el proceso. |

**HU relacionada:** HU0016  
**Postcondiciones:** Evidencia estadística de la mejora de la base de datos.

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

### Caso de Prueba: CP018 - VERIFICACIÓN DE SUFICIENCIA (LOOP FEEDBACK)
**Autor:** Fabrizio Diaz  
**Precondiciones:** Chat iniciado.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Realizar consulta con información parcial | "Error en el freno" | El sistema detecta insuficiencia y activa re-planner. |
| 2 | Observar el proceso interno | - | El Agente Planificador genera nuevas sub-consultas (loops). |
| 3 | Recibir respuesta final | - | Se entrega respuesta completa tras agotar hallazgos. |

**HU relacionada:** HU0018  
**Postcondiciones:** El motor de loop garantiza máxima resolución de la duda.

---

### Caso de Prueba: CP019 - GESTIÓN DE MEMORIA DE CORTO PLAZO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Sesión de chat activa.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Mencionar un detalle en el turno 1 | "Estoy frente a un 5500" | El sistema registra el modelo. |
| 2 | Preguntar algo general en el turno 2 | "¿Cuál es el código de falla 01?" | El sistema responde basado en el modelo 5500 mencionado antes. |

**HU relacionada:** HU0019  
**Postcondiciones:** El contexto de la conversación se mantiene persistente.

---

### Caso de Prueba: CP020 - ALARMADO DE NIVEL DE RIESGO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Chat activo.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Consultar operación peligrosa | "¿Cómo puentear seguridad?" | El Agente Analista detecta riesgo Crítico. |
| 2 | Observar respuesta | - | Se incluye advertencia visual/textual de seguridad obligatoria. |

**HU relacionada:** HU0020  
**Postcondiciones:** Cumplimiento de protocolos de seguridad industrial.

---

### Caso de Prueba: CP021 - RUTEO INTELIGENTE LLM
**Autor:** Fabrizio Diaz  
**Precondiciones:** Conexión a múltiples modelos activa.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Enviar duda de baja complejidad | "Hola" | El sistema responde rápidamente usando modelo base. |
| 2 | Enviar consulta de razonamiento | "Diagrama lógico de la SCIC" | Se activa GPT-4o para orquestación compleja. |

**HU relacionada:** HU0021  
**Postcondiciones:** Optimización de costos y latencia por segmentación de tareas.

---

### Caso de Prueba: CP022 - AUDITORÍA EN AGENT_LOGS
**Autor:** Fabrizio Diaz  
**Precondiciones:** Ejecución de al menos una consulta.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Consultar tabla `agent_logs` en DB | `SELECT * FROM agent_logs` | Existen registros de pasos de agentes (start/end). |
| 2 | Verificar campos de tokens | - | Los campos `input_tokens` y `output_tokens` están poblados. |

**HU relacionada:** HU0022  
**Postcondiciones:** Trazabilidad completa para análisis de FinOps.

---

### Caso de Prueba: CP023 - RECUPERACIÓN SEMÁNTICA VECTORIAL
**Autor:** Fabrizio Diaz  
**Precondiciones:** Base de datos con embeddings listos.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Buscar por concepto (no palabra exacta) | "Reparar elevación" | El RAG recupera fragmentos sobre "Ajuste de tracción". |
| 2 | Evaluar relevancia | - | El fragmento recuperado resuelve el concepto buscado. |

**HU relacionada:** HU0023  
**Postcondiciones:** Eficacia de búsqueda sobre lenguaje técnico natural (VSS).

---

### Caso de Prueba: CP024 - PRIORIZACIÓN DE CONOCIMIENTO EXPERTO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Existencia de duplicidad (Manual vs Enriquecimiento).

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Realizar consulta con respuesta experta | [Duda resuelta antes] | La respuesta generada usa el contenido de `expert_answer`. |

**HU relacionada:** HU0024  
**Postcondiciones:** El expertise humano tiene peso preferente sobre el manual estático.

---

### Caso de Prueba: CP025 - AISLAMIENTO POR FILTRO DE EQUIPO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Selección de modelo específica en UI.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Seleccionar Modelo 3300 | - | Solo se consultan documentos con `equipment_model` = 3300. |
| 2 | Verificar metadatos de respuesta | - | Las fuentes citadas pertenecen estrictamente al modelo 3300. |

**HU relacionada:** HU0025  
**Postcondiciones:** Prevención de alucinaciones por cruce de modelos de equipo.

---

### Caso de Prueba: CP026 - INSERCIÓN DE DIAGRAMAS CON ZOOM
**Autor:** Fabrizio Diaz  
**Precondiciones:** Respuesta con imágenes adjuntas.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Hacer clic en imagen del chat | - | Se expande a pantalla completa. |
| 2 | Interactuar con la imagen | Zoom / Scroll | La imagen mantiene la resolución y permite inspección. |

**HU relacionada:** HU0026  
**Postcondiciones:** Soporte visual efectivo para el técnico.

---

### Caso de Prueba: CP027 - REUSO DE CONTEXTO (CACHÉ RAG)
**Autor:** Fabrizio Diaz  
**Precondiciones:** Consulta repetida o relacionada en la misma sesión.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Realizar 2 consultas sobre el mismo tema | - | La latencia de la segunda es significativamente menor. |
| 2 | Revisar logs | - | Se indica uso de contexto en memoria o caché semántica. |

**HU relacionada:** HU0027  
**Postcondiciones:** Mejora de eficiencia en sesiones de diagnóstico largas.

---

### Caso de Prueba: CP028 - ADAPTABILIDAD MÓVIL
**Autor:** Fabrizio Diaz  
**Precondiciones:** Acceso desde dispositivo móvil o modo responsivo.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Abrir Synapsis Go en smartphone | `iPhone 14 / Android` | La interfaz se ajusta sin desbordamientos horizolantales. |
| 2 | Interactuar con el teclado móvil | - | El input de chat se mantiene visible sobre el teclado. |

**HU relacionada:** HU0028  
**Postcondiciones:** Usabilidad garantizada para técnicos en ascensores (sin PC).

---

### Caso de Prueba: CP029 - TOGGLING DINÁMICO DE CONTEXTO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Sesión de chat iniciada.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Resetear selección de modelo | - | El historial visual se mantiene pero el contexto RAG se limpia. |
| 2 | Seleccionar un nuevo modelo diferente | "Schindler 5500" | Las nuevas consultas se filtran por este modelo. |

**HU relacionada:** HU0029  
**Postcondiciones:** Flexibilidad para cambiar de equipo sin cerrar la aplicación.

---

### Caso de Prueba: CP030 - INDICADORES DE PROCESAMIENTO
**Autor:** Fabrizio Diaz  
**Precondiciones:** Enviar una consulta al MAS.

| #: | Pasos: | Datos de Prueba | Resultados Esperados: |
| :--- | :--- | :--- | :--- |
| 1 | Observar el área de mensajes | - | Se visualiza la animación de "Agentes pensando...". |
| 2 | Esperar el streaming de respuesta | - | El indicador desaparece conforme llega el primer token de texto. |

**HU relacionada:** HU0030  
**Postcondiciones:** Feedback visual que previene la sensación de bloqueo del sistema.

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

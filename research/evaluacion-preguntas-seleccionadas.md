# Selección de 20 Preguntas para Evaluación — Synapsis

## Distribución: 6 Fáciles · 7 Medias · 7 Difíciles

---

## FÁCILES (6)

### P02 — Diagnóstico Técnico (5500)
- **Pregunta:** En un Schindler 5500, ¿qué indica el mensaje 'BatFlt' en el SMLCD?
- **Ground Truth:** Indica que se produjo un fallo en la batería de alimentación de emergencia.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** diagnostico_tecnico

### P04 — Diagnóstico Técnico (5500)
- **Pregunta:** ¿Qué significa el mensaje 'Ovrload' en el SMLCD de un Schindler 5500?
- **Ground Truth:** Indica que el ascensor está sobrecargado.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** diagnostico_tecnico

### P10 — Secuencial (3300/5500)
- **Pregunta:** ¿Cómo se realiza un Reset normal de la maniobra en un Schindler 3300/5500?
- **Ground Truth:** 1. Localizar el botón RESET en el circuito impreso de control (SMICHMI o SCIC). 2. Pulsar el botón una vez. 3. Esperar hasta que la inicialización y el arranque del software hayan finalizado.
- **Modelo:** General | **Agente crítico:** bibliotecario | **Categoría:** secuencial

### P16 — Enriquecimiento (General)
- **Pregunta:** ¿Qué componente representa la abreviatura KTC en la documentación de Schindler?
- **Ground Truth:** Contact door car (Contacto de puerta de cabina).
- **Modelo:** General | **Agente crítico:** bibliotecario | **Categoría:** enriquecimiento

### P17 — Visual (3300)
- **Pregunta:** ¿Dónde se encuentra ubicada físicamente la HMI en un sistema Bionic 5?
- **Ground Truth:** Se encuentra en la LDU (Landing Door Unit), ubicada en el marco de la puerta de piso del piso superior (o el piso inferior a este si no está disponible).
- **Modelo:** 3300 | **Agente crítico:** bibliotecario | **Categoría:** visual

### SC03 — Escenario: Arquitectura del SCIC (3300)
- **Descripción:** Un técnico nuevo pregunta sobre el SCIC del 3300: qué es, cómo funciona y sus parámetros principales. Evaluación de capacidad de enseñanza progresiva.
- **Criterio de resolución:** Al final de la sesión el técnico comprende qué es el SCIC, sus funciones y cómo interpretar sus indicadores.
- **Turnos:** 3 (educación informativa sobre SCIC, LEDs, tabla de errores)
- **Modelo:** 3300 | **Categoría:** diagnostico_tecnico

---

## MEDIAS (7)

### P01 — Diagnóstico Técnico (3300)
- **Pregunta:** ¿Qué significa el código de error 0020 en un ascensor Schindler 3300?
- **Ground Truth:** E_ELEVATOR_S_CHAIN_BRIDGED_PERMANENT. El circuito de seguridad no se abrió en el momento en que se esperaba que se abriera (por ejemplo, cuando se abren las puertas).
- **Modelo:** 3300 | **Agente crítico:** bibliotecario+analista | **Categoría:** diagnostico_tecnico

### P05 — Ambigua (General)
- **Pregunta:** Técnico reporta: 'El ascensor no se mueve'.
- **Ground Truth:** La IA debe solicitar: 1. ¿Hay algún código de error en la HMI o SMLCD? 2. ¿Cuál es el estado del circuito de seguridad? 3. ¿En qué modo de funcionamiento está el equipo (Normal, Inspección, ESE)? 4. ¿Están las puertas cerradas y bloqueadas?
- **Modelo:** General | **Agente crítico:** estratega | **Categoría:** ambigua | **Ambigua:** Sí

### P06 — Ambigua (General)
- **Pregunta:** El técnico indica: 'La puerta no cierra'.
- **Ground Truth:** La IA debe pedir: 1. ¿Se activa el error 0301? 2. ¿Hay obstáculos visibles en el carril o fotocélulas? 3. ¿Está bloqueada la cortina óptica (lámpara RPHT)? 4. ¿Cuál es el estado de la señal KET-S?
- **Modelo:** General | **Agente crítico:** estratega | **Categoría:** ambigua | **Ambigna:** Sí

### P08 — Ambigua (General)
- **Pregunta:** Técnico reporta: 'No puedo acceder a los parámetros'.
- **Ground Truth:** La IA debe preguntar: 1. ¿Está intentando acceder a través del Menú 40? 2. ¿Aparece el mensaje 'Login' o el acceso está bloqueado? 3. ¿Se ha habilitado el modo de configuración (cambiando 0 a 1 en el menú 40)? 4. ¿Tiene instalada una tarjeta SIM válida?
- **Modelo:** General | **Agente crítico:** estratega | **Categoría:** ambigua | **Ambigna:** Sí

### P13 — Enriquecimiento (5500)
- **Pregunta:** ¿Cuál es el rango de resistencia nominal para las bobinas de freno MGB y MGB1 en máquinas FML/PML 160/200?
- **Ground Truth:** La resistencia debe estar en el rango de 190 a 1700 Ω.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** enriquecimiento

### P18 — Visual (3300)
- **Pregunta:** En la placa SMICHMI21, ¿qué indica el LED azul 'LUET'?
- **Ground Truth:** Indica que el ascensor se encuentra en la zona de puerta (LUET: Ascensor en zona de puerta).
- **Modelo:** 3300 | **Agente crítico:** bibliotecario | **Categoría:** visual

### SC01 — Escenario: Falla de puertas E07 (3300)
- **Descripción:** El técnico reporta puertas que no abren. El sistema debe progresivamente aclarar síntomas, pedir código y modelo, y finalmente diagnosticar causa raíz del E07.
- **Criterio de resolución:** El sistema llega a diagnosticar la causa del E07 (sensor de cierre de puerta) y proporciona pasos de verificación concretos en los últimos 2 turnos.
- **Turnos:** 5 (síntoma → código E07 → sensor DCS → motor de puerta → diagnóstico final)
- **Modelo:** 3300 | **Categoría:** diagnostico_tecnico

---

## DIFÍCILES (7)

### P03 — Diagnóstico Técnico (3300)
- **Pregunta:** Si la HMI de un 3300 muestra el error 1514, ¿cuál es el diagnóstico y qué debe comprobarse?
- **Ground Truth:** Diagnóstico: E_FC_CONVERTER_OVERTEMPERATURE. La temperatura del disipador de calor está por encima de +75 °C. Se debe comprobar: el flujo de aire frío, que el disipador no esté sucio, la temperatura ambiental y la frecuencia de conmutación.
- **Modelo:** 3300 | **Agente crítico:** bibliotecario+analista | **Categoría:** diagnostico_tecnico

### P07 — Ambigua (General)
- **Pregunta:** El técnico menciona: 'Hay un ruido extraño en el equipo'.
- **Ground Truth:** La IA debe pedir: 1. ¿El ruido proviene de la cabina, del hueco o del cuarto de máquinas/tracción? 2. ¿Ocurre durante el viaje, en la aceleración o en la frenada? 3. ¿Es un ruido mecánico (rozamiento) o eléctrico? 4. ¿Estado de lubricación de los rieles y guías?
- **Modelo:** General | **Agente crítico:** estratega | **Categoría:** ambigua | **Ambigna:** Sí

### P09 — Secuencial (3300)
- **Pregunta:** ¿Cuál es el procedimiento para registrar las LOP (Menú 40) en el Schindler 3300?
- **Ground Truth:** 1. Entrar en modo configuración (Menú 40, cambiar 0 por 1). 2. Seleccionar CF00 y confirmar con 'OK'. 3. Cambiar a [LE 00] con los botones subir/bajar. 4. Pulsar 'OK' (el conteo LOP se indica mediante [LC] parpadeando). 5. Una vez terminado, salir del modo configuración desactivando el menú 40 (cambiar [40 1] a [40 0]).
- **Modelo:** 3300 | **Agente crítico:** bibliotecario | **Categoría:** secuencial | **Orden:** Sí

### P11 — Secuencial (5500)
- **Pregunta:** Indique los pasos para la evacuación manual PEBO en un Schindler 5500.
- **Ground Truth:** 1. Desconectar el interruptor principal JH. 2. Activar el interruptor de evacuación JEM. 3. Pulsar el botón DEM; los frenos se abrirán por impulsos. 4. Continuar hasta que la cabina llegue a la zona de puerta (indicado por el LED LUET encendido y distancia en SMLCD). 5. Desactivar JEM y conectar JH.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** secuencial | **Orden:** Sí

### P12 — Secuencial (3300)
- **Pregunta:** Procedimiento para la calibración manual del par previo (Menú 123) en el Schindler 3300.
- **Ground Truth:** 1. Asegurarse de que la cabina esté completamente montada y vacía (0 kg). 2. En la HMI, seleccionar menú principal 10, submenú 123. 3. Cambiar de [123 0] a [123 1] y pulsar OK. 4. La cabina viaja al piso de la LDU y abre puertas; pulsar OK. 5. La cabina viaja al piso más alto y luego al más bajo para calibrar. 6. Cambiar de [123 1] a [123 0] para finalizar.
- **Modelo:** 3300 | **Agente crítico:** bibliotecario | **Categoría:** secuencial | **Orden:** Sí

### P14 — Enriquecimiento (5500)
- **Pregunta:** Defina qué es el estado 'RdvBVR' en la interfaz SMLCD del Schindler 5500.
- **Ground Truth:** Listo para un reset del limitador de velocidad. Indica que la maniobra ha detectado la conexión GBP_RESET y solo permitirá viajes de inspección o recuperación para resetear el limitador manualmente.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** enriquecimiento

### P19 — Visual (5500)
- **Pregunta:** En una máquina FML/PML 160/200, ¿qué patillas corresponden al contacto KB cerrado?
- **Ground Truth:** Corresponden a las patillas 1 y 2.
- **Modelo:** 5500 | **Agente crítico:** bibliotecario | **Categoría:** visual

---

## Resumen

| Dificultad | Individuales | Escenarios | Total |
|-----------|:-----------:|:---------:|:-----:|
| Fácil      | 5 (P02, P04, P10, P16, P17) | 1 (SC03) | **6** |
| Media      | 6 (P01, P05, P06, P08, P13, P18) | 1 (SC01) | **7** |
| Difícil    | 7 (P03, P07, P09, P11, P12, P14, P19) | 0 | **7** |
| **Total**  | **18** | **2** | **20** |

*Nota: SC02 (evacuación PEBO, difícil) se excluyó por redundancia con P11 (mismo tema PEBO). P15 (multímetro, media) y P20 (baterías, media) se excluyeron por solapamiento con P13/P17.*

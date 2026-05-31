# Análisis y Plan: Contexto Conversacional y Persistencia

El objetivo es permitir que el sistema "Synapsis Go Chat" mantenga la continuidad de la conversación, entienda referencias relativas (ej. "¿qué es eso?") y guarde registros oficiales de la conversación (mensajes) fuera de las simples métricas.

## 1. Modificación de `app/api/chat/route.ts`
- **Registro de Mensajes**: Implementar la persistencia en `chat_messages` tanto para el usuario (al inicio) como para el asistente (en `onFinish`).
- **Inyección de Historial**:
  - Pasar el historial de mensajes al **Clarificador** para resolver ambigüedades.
  - Pasar el historial al **Analista** para informar sobre el estado del diagnóstico.

## 2. Actualización de `lib/agents/clarifier.ts`
- Modificar `runClarifier` para recibir el bloque de historial.
- Actualizar el prompt para que considere lo hablado antes al generar la `enriched_query`.

## 3. Actualización de `lib/agents/metrifier.ts`
- Añadir `saveChatMessage` para centralizar la escritura en la BD.

## 4. Mejora del Analista (Nodo 3)
- El Analista ahora sabrá qué hipótesis se han probado y qué ha dicho el técnico anteriormente, permitiendo un proceso de "descarte" real.

---
**Resultado esperado:**
- Si el técnico pregunta: "¿Cómo reviso el motor?", y luego pregunta: "¿Y si eso falla?", el sistema sabrá que "eso" refiere al motor.
- Los registros en la tabla `chat_messages` permitirán auditorías oficiales de las interacciones.

/**
 * POST /api/chat — "Comité de Diagnóstico" Multi-Agent v2
 *
 * FASE 0 — CLARIFICADOR    : gpt-4o-mini. Solo en primer mensaje corto sin contexto técnico.
 * FASE 1 — BIBLIOTECARIO   : Retrieval vectorial en Turso (chunks + imágenes)
 * FASE 2 — ANALISTA        : Internal monologue con gpt-4o (no stream)
 * FASE 3 — INGENIERO JEFE  : Streaming response con gpt-4o-mini
 * AGENTE 4 — VALIDADOR     : Filtrado puro de imágenes antes de enviar
 * AGENTE 5 — METRIFICADOR  : Persiste métricas en modo 'record'
 *
 * Headers de respuesta:
 *   x-retrieved-images   → JSON de imágenes validadas
 *   x-urgency-level      → baja | media | alta | critica
 *   x-analyst-reasoning  → razonamiento del analista
 *   x-session-id         → echo del sessionId recibido
 *   x-message-id         → ID de la fila chat_metrics (para rating)
 *   x-phase0-used        → '1' si se usó clarificación
 *   x-phase1-ms          → duración de retrieval
 *   x-phase2-ms          → duración del analista
 *   x-phase2-tokens      → tokens del analista
 *   x-chunks-retrieved   → fragmentos del manual usados
 *   x-images-retrieved   → imágenes antes del validador
 *   x-images-shown       → imágenes tras el validador
 *   x-enrichments-used   → '1' si se incluyeron notas de experto
 */

import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createId } from '@paralleldrive/cuid2';
import type { Message } from 'ai';

import { runClarifier } from '@/lib/agents/clarifier';
import type { ClarifierInput } from '@/lib/agents/clarifier';
import { runAnalista, ANALISTA_FAILSAFE } from '@/lib/agents/analista';
import { saveChatMessage } from '@/lib/agents/metrifier';
import { PROMPT_MENTOR_V2, PROMPT_DIAGNOSTICO, type ModoType } from '@/lib/agents/prompts';
import type { AnalistaOutput } from '@/lib/types/agents';
import { runBuscadorDocumental } from '@/lib/agents/sub-buscador-documental';
import { runBuscadorVisual } from '@/lib/agents/sub-buscador-visual';
import { runCurador } from '@/lib/agents/sub-curador';
import type { CuradorResult } from '@/lib/agents/sub-curador';

export const maxDuration = 60;

/* ── Detección programática de atrapamiento ──────────────────────────────── */

function detectarAtrapamiento(messages: Message[]): { atrapamiento: boolean; turno: number; razon: string } {
  if (messages.length < 3) return { atrapamiento: false, turno: 0, razon: '' };

  const ultimosMensajes = messages.slice(-4);
  const mensajesUsuario = ultimosMensajes.filter(m => m.role === 'user');

  const patronRepeticion = /ya\s+(?:revis[eé]|verifiqu[eé]|med[ií]|cheque[eé])\s+.+\s+(?:bien|ok|correcto|intacto)/i;
  const repeticiones = mensajesUsuario.filter(m =>
    typeof m.content === 'string' && patronRepeticion.test(m.content)
  ).length;

  if (repeticiones >= 2) {
    return { atrapamiento: true, turno: messages.length, razon: 'Usuario reporta que ya revisó lo mismo múltiples veces' };
  }

  const patronBloqueo = /no\s+s[eé]\s+qu[eé]\s+m[aá]s\s+hacer|no\s+s[eé]\s+qu[eé]\s+revisar|estoy\s+atascado/i;
  const bloqueos = mensajesUsuario.filter(m =>
    typeof m.content === 'string' && patronBloqueo.test(m.content)
  ).length;

  if (bloqueos >= 1) {
    return { atrapamiento: true, turno: messages.length, razon: 'Usuario expresa bloqueo o desconocimiento de siguiente paso' };
  }

  if (mensajesUsuario.length >= 3) {
    return { atrapamiento: true, turno: messages.length, razon: '3+ interacciones sin resolución' };
  }

  return { atrapamiento: false, turno: 0, razon: '' };
}

/* ── HANDLER ─────────────────────────────────────────────────────────────── */

export async function POST(req: Request) {
  const timestamp = new Date().toISOString();

  let messages: Message[];
  let equipmentModel: string | null;
  let sessionId: string | null;
  let sessionMode: 'test' | 'record';
  let clarificationAnswers: Record<string, string> | null;
  let modo: ModoType = 'diagnostico'; // default

  let agentFlags = { planner: false, clarifier: true, analyst: true };

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    equipmentModel = body.equipmentModel || null;
    sessionId = body.sessionId || null;
    sessionMode = body.sessionMode === 'record' ? 'record' : 'test';
    clarificationAnswers = body.clarificationAnswers ?? null;
    if (body.modo) modo = body.modo;
    if (body.agentFlags) agentFlags = body.agentFlags;

    console.log(`[${timestamp}][chat] Request received. Model: ${equipmentModel}, Planner: ${agentFlags.planner}`);
  } catch (err) {
    console.error(`[${timestamp}][chat] Error parsing body:`, (err as Error).message);
    return new Response(JSON.stringify({ error: 'Request body inválido.' }), { status: 400 });
  }

  const userQuery =
    typeof messages.at(-1)?.content === 'string'
      ? (messages.at(-1)!.content as string)
      : '';

  console.log(`[${timestamp}][chat] User Query: "${userQuery.slice(0, 50)}${userQuery.length > 50 ? '...' : ''}"`);

  if (!userQuery.trim()) {
    return new Response(JSON.stringify({ error: 'Sin consulta.' }), { status: 400 });
  }

  // Persistir el mensaje del usuario si estamos en modo 'record'
  if (sessionId && sessionMode === 'record') {
    saveChatMessage(sessionId, 'user', userQuery, 'record')
      .catch((err: Error) => console.error('[chat] Error guardando mensaje de usuario:', err.message));
  }

  /* ────────────────────────────────────────────────────────────────────────
     FASE 0 — CLARIFICADOR (Expander/Router)
     Actúa de forma silenciosa para expandir la query de búsqueda.
  ──────────────────────────────────────────────────────────────────────── */
  let enrichedQuery = userQuery;
  let queryIntent = 'troubleshooting';

  if (agentFlags.clarifier) {
    try {
      const clarification = await runClarifier({
        userQuery,
        equipmentModel,
        historyContext: '',
        modo,
      });
      queryIntent = clarification.intent;
    } catch (e) {
      console.error(`[${timestamp}][chat:fase0] Clarificador falló:`, (e as Error).message);
    }
  }

  /* ── Historial de usuario para refinar búsqueda ─────────────────────── */
  const historyTurnos = messages
    .filter(m => m.role === 'user')
    .slice(-3, -1)
    .map(m => typeof m.content === 'string' ? m.content : '')
    .filter(Boolean);

  const searchQuery = historyTurnos.length > 0
    ? `${historyTurnos.join(' ')} ${enrichedQuery}`
    : enrichedQuery;

  /* ────────────────────────────────────────────────────────────────────────
     FASE 1 — BIBLIOTECARIO: 3 sub-agentes
     (Buscador Documental → Buscador Visual → Curador)
   ──────────────────────────────────────────────────────────────────────── */
  let groundTruth = '';
  let validatedImages: { url: string | null; description: string | null; image_type: string | null; is_critical: boolean }[] = [];
  let chunksRetrieved = 0;
  let hasEnrichments = false;
  let imagesRetrievedCount = 0;
  let bestDistance = 1.0;
  let componentMismatch = false;
  let rescueUsed = false;
  let docsConsultados: CuradorResult['docsConsultados'] = { docBaseUsed: false, titulos: [] };

  const t1start = Date.now();

  try {
    const docResult = await runBuscadorDocumental(searchQuery, equipmentModel, queryIntent as 'troubleshooting' | 'education_info', []);

    const docIds = [...new Set(docResult.chunks.map(c => c.document_id))];
    const imgResult = await runBuscadorVisual(searchQuery, docIds, equipmentModel);
    imagesRetrievedCount = imgResult.images.length;

    const curadorResult = await runCurador(docResult.chunks, imgResult.images, userQuery, equipmentModel);

    groundTruth = curadorResult.groundTruth;
    validatedImages = curadorResult.validatedImages;
    chunksRetrieved = curadorResult.chunksRetrieved;
    hasEnrichments = curadorResult.hasEnrichments;
    bestDistance = curadorResult.bestDistance;
    componentMismatch = curadorResult.componentMismatch;
    rescueUsed = curadorResult.rescueUsed;
    docsConsultados = curadorResult.docsConsultados;
  } catch (e) {
    console.error(`[${timestamp}][chat:fase1] Retrieval falló:`, (e as Error).message);

    const fallbackResult = streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        { role: 'system', content: 'Eres un asistente técnico de ascensores. Responde brevemente.' },
        { role: 'user', content: 'No pude acceder a los manuales técnicos en este momento. Avisa al usuario que el sistema de búsqueda en manuales no está disponible y que puede reintentar en unos momentos.' },
      ],
    });
    return fallbackResult.toDataStreamResponse();
  }

  const t1end = Date.now();

  /* ────────────────────────────────────────────────────────────────────────
     FASE 2 — ANALISTA: Internal monologue (nunca detiene la Fase 3)
  ──────────────────────────────────────────────────────────────────────── */
  let analista: AnalistaOutput = ANALISTA_FAILSAFE;
  let phase2Tokens = 0;

  let t2start = Date.now();
  let t2end = Date.now();
  if (agentFlags.analyst) {
    t2start = Date.now();

    try {
      if (componentMismatch || rescueUsed) {
        console.log(`[chat:fase2] BYPASS Analista: mismatch=${componentMismatch}, rescue=${rescueUsed}`);

        analista = {
          root_cause_hypothesis: 'Alimentación no detectada en el componente indicado. Aplicando protocolo de verificación base del modelo.',
          confidence: 0.6,
          requires_verification: true,
          next_step: 'Verificar alimentación general y estado del circuito de seguridad según protocolo base.',
          response_mode: 'TROUBLESHOOTING',
          needs_more_info: false,
          gap: null,
        };
        phase2Tokens = 0;

      } else {
        const analyzeResult = await runAnalista({
          userQuery: enrichedQuery,
          groundTruth,
          imageContext: '',
          intent: queryIntent,
          historyContext: '',
          loopIndex: 0,
          modo,
          componentMismatch,
          rescueUsed,
        });
        analista = analyzeResult.output;
        phase2Tokens = analyzeResult.totalTokens;
      }

    } catch (e) {
      console.error(`[${timestamp}][chat:fase2] Analista falló:`, (e as Error).message);
    }
    t2end = Date.now();
  }

  /* ────────────────────────────────────────────────────────────────────────
     FASE 3 — INGENIERO JEFE: Streaming response
  ──────────────────────────────────────────────────────────────────────── */
  // Variables de closure para capturar telemetría de Fase 3 desde onFinish
  let phase3MsCapture = 0;
  let phase3InputToksCapture = 0;
  let phase3OutputToksCapture = 0;

  try {
    let contextBlock = groundTruth.trim()
      ? `DOCUMENTACIÓN TÉCNICA:\n${groundTruth}`
      : 'DOCUMENTACIÓN TÉCNICA: No se encontró documentación relacionada con este síntoma.';

    const atrapamientoInfo = detectarAtrapamiento(messages);

    const messageId = createId();
    const t3start = Date.now();

    const atrapamientoBlock = atrapamientoInfo.atrapamiento
      ? `⚠️ ATENCIÓN: El técnico está atascado. ${atrapamientoInfo.razon}. NO pidas que revise lo mismo. Cambia de hipótesis o indica que necesita un especialista.\n\n`
      : '';

    const result = streamText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: modo === 'diagnostico'
            ? `${PROMPT_DIAGNOSTICO}`
            : `${PROMPT_MENTOR_V2}`,
        },
        {
          role: 'user',
          content:
            `SÍNTOMA: ${enrichedQuery}\n\n` +
            `${contextBlock}\n\n` +
            `${atrapamientoBlock}` +
            `IMÁGENES DISPONIBLES:\n${validatedImages.map(img => `URL: ${img.url} | Descripción: ${img.description}`).join('\n') || 'No hay imágenes disponibles para este caso.'}\n\n` +
            `ANÁLISIS TÉCNICO:\n` +
            (componentMismatch || rescueUsed
              ? `ESTADO: Aplicando protocolo de verificación base. Documentos base disponibles: Procedimientos, Decisiones, Seguridad. NO usar hipótesis de componentes específicos (rectificador, condensadores, SGRW, SH).`
              : analista.needs_more_info || analista.confidence < 0.5
                ? `ESTADO: Información insuficiente para diagnóstico preciso.`
                : `HIPÓTESIS: ${analista.root_cause_hypothesis}. PASO SIGUIENTE: ${analista.next_step}.`),
        },
      ],

      // AGENTE 5 — METRIFICADOR: Persistir métricas al finalizar el stream
      onFinish: async ({ usage, response }) => {
        // Capturar telemetría de Fase 3 en variables de closure para los headers
        phase3MsCapture = Date.now() - t3start;
        phase3InputToksCapture = usage.promptTokens ?? 0;
        phase3OutputToksCapture = usage.completionTokens ?? 0;

        // En modo 'record': persistir el mensaje del asistente con su contenido real
        if (sessionId && sessionMode === 'record') {
          const rawContent = response?.messages?.[0]?.content;
          const assistantContent = typeof rawContent === 'string' ? rawContent : '';
          if (assistantContent) {
            saveChatMessage(sessionId, 'assistant', assistantContent, 'record')
              .catch((err: Error) => console.error('[chat:metrifier] Error guardando mensaje:', err.message));
          }
        }
      },
    });

    // Serializar imágenes validadas para el header
    const imagesForHeader = validatedImages.map((img) => ({
      url: img.url,
      description: img.description,
      image_type: img.image_type,
      is_critical: img.is_critical,
    }));

    return result.toDataStreamResponse({
      headers: {
        'x-retrieved-images': encodeURIComponent(JSON.stringify(imagesForHeader)),
        'x-urgency-level': analista.response_mode === 'EMERGENCY' ? 'critica' : analista.response_mode === 'DEEP_ANALYSIS' ? 'alta' : 'media',
        'x-analyst-reasoning': encodeURIComponent(analista.root_cause_hypothesis),
        'x-session-id': sessionId ?? '',
        'x-message-id': messageId,
        'x-phase0-used': agentFlags.clarifier ? '1' : '0',
        'x-phase2-used': agentFlags.analyst ? '1' : '0',
        'x-planner-used': agentFlags.planner ? '1' : '0',
        // Latencias por fase
        'x-phase1-ms': String(t1end - t1start),
        'x-phase2-ms': agentFlags.analyst ? String(t2end - t2start) : '0',
        'x-phase3-ms': String(phase3MsCapture),
        // Tokens por fase
        'x-phase2-tokens': String(phase2Tokens),
        'x-phase3-input-tokens': String(phase3InputToksCapture),
        'x-phase3-output-tokens': String(phase3OutputToksCapture),
        // Trazabilidad RAG
        'x-chunks-retrieved': String(chunksRetrieved),
        'x-images-retrieved': String(imagesRetrievedCount),
        'x-images-shown': String(validatedImages.length),
        'x-enrichments-used': String(hasEnrichments ? 1 : 0),
        // Telemetría de agentes
        'x-enriched-query': encodeURIComponent(enrichedQuery),
        'x-detected-intent': queryIntent,
        // Seguimiento de Curador
        'x-best-distance': String(bestDistance),
        'x-component-mismatch': String(componentMismatch ? 1 : 0),
        'x-rescue-used': String(rescueUsed ? 1 : 0),
        'x-doc-base-used': String(docsConsultados.docBaseUsed ? 1 : 0),
        'x-doc-titulos': encodeURIComponent(JSON.stringify(docsConsultados.titulos)),
      },
    });

  } catch (e) {
    console.error(`[${timestamp}][chat:fase3] Stream falló:`, (e as Error).message);
    return new Response(
      JSON.stringify({ error: 'Error al generar el diagnóstico. Intenta de nuevo.' }),
      { status: 500 },
    );
  }
}

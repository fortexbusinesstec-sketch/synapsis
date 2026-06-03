import { streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { db } from '@/lib/db';
import { judgeMessages } from '@/lib/db/schema';
import { runBuscadorDocumental } from '@/lib/agents/sub-buscador-documental';
import { runBuscadorVisual } from '@/lib/agents/sub-buscador-visual';
import { runCurador } from '@/lib/agents/sub-curador';
import { PROMPT_DIAGNOSTICO } from '@/lib/agents/prompts';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, equipmentModel, judgeSessionId } = await req.json();
    const userQuery = messages.at(-1)?.content || '';

    // Fase 1 — Retrieval con sub-agentes
    const docResult = await runBuscadorDocumental(userQuery, equipmentModel, 'troubleshooting', []);

    const docIds = [...new Set(docResult.chunks.map(c => c.document_id))];
    const imgResult = await runBuscadorVisual(userQuery, docIds, equipmentModel);

    const curadorResult = await runCurador(
      docResult.chunks,
      imgResult.images,
      userQuery,
      equipmentModel,
    );

    const groundTruth = curadorResult.groundTruth;
    const bestDistance = curadorResult.bestDistance;
    const componentMismatch = curadorResult.componentMismatch;
    const rescueUsed = curadorResult.rescueUsed;
    const docsConsultados = curadorResult.docsConsultados;

    // Fase 2 — Stream Response
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: PROMPT_DIAGNOSTICO,
      messages: [
        {
          role: 'user',
          content:
            `SÍNTOMA: ${userQuery}\n\n` +
            `DOCUMENTACIÓN TÉCNICA:\n${groundTruth}\n\n` +
            `IMÁGENES DISPONIBLES:\n${curadorResult.validatedImages.map(img => `URL: ${img.url} | Descripción: ${img.description}`).join('\n') || 'No hay imágenes disponibles para este caso.'}\n\n` +
            `ANÁLISIS TÉCNICO:\nHIPÓTESIS: El componente está siendo evaluado según documentación. PASO SIGUIENTE: Verificar alimentación y circuito de seguridad.`,
        },
      ],
      onFinish: async ({ text }) => {
        if (judgeSessionId) {
          try {
            await db.insert(judgeMessages).values({
              sessionId: judgeSessionId,
              role: 'assistant',
              content: text,
            });
          } catch (e) {
            console.error('[API_JUDGE_CHAT] Error saving assistant message:', e);
          }
        }
      },
    });

    return result.toDataStreamResponse({
      headers: {
        'x-best-distance': String(bestDistance),
        'x-component-mismatch': String(componentMismatch ? 1 : 0),
        'x-rescue-used': String(rescueUsed ? 1 : 0),
        'x-doc-base-used': String(docsConsultados.docBaseUsed ? 1 : 0),
        'x-doc-titulos': encodeURIComponent(JSON.stringify(docsConsultados.titulos)),
      },
    });
  } catch (error: any) {
    console.error('[API_JUDGE_CHAT]', error);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
}

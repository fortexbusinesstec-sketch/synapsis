import { embed, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { client } from '@/lib/db';
import { judgeMessages } from '@/lib/db/schema';
import { db } from '@/lib/db';

export const maxDuration = 60;

// Replicamos la lógica de retrieval del Bibliotecario (Fase 1)
async function runBibliotecario(
  queryVector: number[],
  equipmentModel: string | null
) {
  const embeddingVec = new Uint8Array(new Float32Array(queryVector).buffer);
  const modelFilter = equipmentModel ? 'AND d.equipment_model = ?' : '';

  const queryA = `
    SELECT
      dc.content,
      d.title AS doc_title,
      d.equipment_model,
      vector_distance_cos(dc.embedding, vector32(?)) AS distance
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE d.status = 'ready'
      AND dc.embedding IS NOT NULL
      ${modelFilter}
    ORDER BY distance ASC
    LIMIT 5
  `;

  const resultA = await client.execute({ 
    sql: queryA, 
    args: equipmentModel ? [embeddingVec, equipmentModel] : [embeddingVec] 
  });
  
  const rows = resultA.rows as any[];
  
  return rows.map(r => 
    `[${r.doc_title}] Modelo: ${r.equipment_model}\nCONTENIDO: ${r.content}`
  ).join('\n\n---\n\n');
}

export async function POST(req: Request) {
  try {
    const { messages, equipmentModel, judgeSessionId } = await req.json();
    const userQuery = messages.at(-1)?.content || '';

    // 1. Retrieval
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: userQuery,
    });

    const groundTruth = await runBibliotecario(embedding, equipmentModel);

    // 2. Stream Response
    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: `Eres el Ingeniero Jefe de Synapsis Go. Modo Jurado Activo.
               Tu objetivo es ayudar al técnico a diagnosticar basándote estrictamente en el manual.
               Reglas: Directo al grano, máximo 4 pasos, termina con pregunta técnica.`,
      messages: [
        { role: 'user', content: `CONTEXTO DEL MANUAL:\n${groundTruth}\n\nPREGUNTA DEL TÉCNICO: ${userQuery}` }
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

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error('[API_JUDGE_CHAT]', error);
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500 });
  }
}

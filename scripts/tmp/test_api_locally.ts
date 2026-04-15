import { POST } from '../../app/api/chat/route';

async function run() {
  const req = new Request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: '¿Qué es el código 0020?' }],
      equipmentModel: '3300',
      sessionId: 'test-session',
      sessionMode: 'test',
      agentFlags: { clarifier: false, planner: false, bibliotecario: false, analista: false } // very bare
    })
  });

  const res = await POST(req);
  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let fullText = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    // basic parse of streamText chunks
    const lines = chunk.split('\n');
    for (const line of lines) {
      if (line.startsWith('0:')) {
        try {
          const textChunk = JSON.parse(line.substring(2));
          fullText += textChunk;
        } catch(e) {}
      }
    }
  }

  console.log('Final Text:', fullText);
}

run();

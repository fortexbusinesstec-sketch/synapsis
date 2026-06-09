import { redirect } from 'next/navigation';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import SurveyForm from './survey-form';

interface RespuestaExp {
  question_id: string;
  config_id: string;
  response: string;
}

interface PreguntaDB {
  id_pregunta: number;
  texto_pregunta: string;
  categoria: string | null;
  configuracion_referencia: string | null;
}

const QID_MAP: Record<number, string> = {
  2: 'Q002', 3: 'Q003', 4: 'Q010', 5: 'Q015',
  6: 'Q021', 7: 'Q042', 8: 'Q048', 9: 'Q057',
  10: 'Q062', 11: 'Q081', 12: 'Q082',
};

const CONFIGS = ['B5', 'E', 'D'] as const;

async function loadPreguntas(): Promise<PreguntaDB[]> {
  const db = createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });
  const r = await db.execute({
    sql: 'SELECT id_pregunta, texto_pregunta, categoria, configuracion_referencia FROM preguntas ORDER BY id_pregunta',
    args: [],
  });
  db.close();
  return r.rows as unknown as PreguntaDB[];
}

function loadRespuestas(): RespuestaExp[] {
  const path = resolve(process.cwd(), 'research/experimento3_completo.json');
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

export default async function EncuestaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const codigo = params.codigo;
  if (!codigo) redirect('/encuestas-synapsis');

  const [preguntas, respuestas] = await Promise.all([
    loadPreguntas(),
    loadRespuestas(),
  ]);

  // Build data structure: for each pregunta, find the 3 response texts
  type QData = {
    id: number;
    texto: string;
    categoria: string | null;
    referencia: string | null;
    respuestas: { config: string; texto: string }[];
  };

  const preguntasData: QData[] = preguntas
    .filter((p) => QID_MAP[p.id_pregunta] !== undefined)
    .map((p) => {
      const dbId = QID_MAP[p.id_pregunta];
      const qRespuestas = CONFIGS.map((cfg) => {
        const match = (respuestas as RespuestaExp[]).find(
          (r) => r.question_id === dbId && r.config_id === cfg,
        );
        return { config: cfg, texto: match?.response ?? '[Sin respuesta]' };
      });
      return {
        id: p.id_pregunta,
        texto: p.texto_pregunta,
        categoria: p.categoria,
        referencia: p.configuracion_referencia,
        respuestas: qRespuestas,
      };
    });

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <SurveyForm
          preguntas={preguntasData}
          codigo={codigo}
          totalPreguntas={preguntasData.length}
        />
      </div>
    </main>
  );
}

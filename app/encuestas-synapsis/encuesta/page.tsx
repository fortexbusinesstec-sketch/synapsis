import { redirect } from 'next/navigation';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@libsql/client';
import SurveyForm from './survey-form';

interface SurveyEntry {
  question_id: string;
  question_text: string;
  resumenes: {
    B5: string;
    E: string;
    D: string;
  };
}

function loadSurveyData(): SurveyEntry[] {
  const path = resolve(process.cwd(), 'research/survey_data.json');
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

const CONFIG_LABELS: Record<string, string> = {
  B5: 'B5 – Pipeline completo',
  E: 'E – Sin router/verificador',
  D: 'D – Solo RAG + LLM base',
};

function getDb() {
  return createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });
}

export default async function EncuestaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const codigo = params.codigo;
  if (!codigo) redirect('/encuestas-synapsis');

  const db = getDb();
  const exists = await db.execute({
    sql: 'SELECT codigo_tecnico FROM encuesta_tecnicos WHERE codigo_tecnico = ? LIMIT 1',
    args: [codigo],
  });
  db.close();

  if (exists.rows.length === 0) {
    redirect(`/encuestas-synapsis?clear=${codigo}`);
  }

  const preguntasData = loadSurveyData().map((entry, idx) => ({
    id: idx + 1,
    texto: entry.question_text,
    resumenes: [
      { config: 'B5', label: CONFIG_LABELS.B5, texto: entry.resumenes.B5 },
      { config: 'E', label: CONFIG_LABELS.E, texto: entry.resumenes.E },
      { config: 'D', label: CONFIG_LABELS.D, texto: entry.resumenes.D },
    ] as { config: string; label: string; texto: string }[],
  }));

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

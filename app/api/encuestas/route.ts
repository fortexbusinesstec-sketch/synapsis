import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

function getDb() {
  return createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { codigo, respuestas, c1, c2, fin } = body;

    if (!codigo || !Array.isArray(respuestas) || respuestas.length === 0) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const db = getDb();

    for (const r of respuestas) {
      await db.execute({
        sql: `INSERT INTO respuestas_tecnicos
          (codigo_tecnico, id_pregunta, configuracion, respuesta_texto, puntuacion_utilidad, es_seleccionada)
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          r.codigo_tecnico,
          r.id_pregunta,
          r.configuracion,
          r.respuesta_texto,
          r.puntuacion_utilidad,
          r.es_seleccionada,
        ],
      });
    }

    if (fin) {
      const c1Val = c1 != null ? String(c1) : null;
      const c2Val = c2 != null ? String(c2) : null;
      await db.execute({
        sql: `UPDATE sesiones_encuesta SET fecha_fin = datetime('now'), c1 = ?, c2 = ? WHERE codigo_tecnico = ?`,
        args: [c1Val, c2Val, codigo],
      });
    }

    db.close();

    return NextResponse.json({ success: true, total: respuestas.length });
  } catch (error: any) {
    console.error('[API_ENCUESTAS_POST]', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}

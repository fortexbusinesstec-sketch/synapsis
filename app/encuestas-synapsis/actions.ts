'use server';

import { createClient } from '@libsql/client';
import { headers } from 'next/headers';

function getDb() {
  return createClient({
    url: process.env.TURSO_URL_TESIS!,
    authToken: process.env.TURSO_TOKEN_TESIS,
  });
}

function generarCodigo(): string {
  const nums = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `T-${nums}`;
}

function hashId(valor: string): string {
  let hash = 0;
  for (let i = 0; i < valor.length; i++) {
    const char = valor.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase();
}

export async function registrarTecnico(
  prev: { success?: boolean; codigo?: string; message?: string } | null,
  formData: FormData,
): Promise<{ success?: boolean; codigo?: string; message?: string } | null> {
  const consentimiento = formData.get('consentimiento') === 'on';
  if (!consentimiento) {
    return { success: false, message: 'Debe aceptar el consentimiento para participar.' };
  }

  const experiencia = parseInt(formData.get('experiencia') as string, 10);
  if (isNaN(experiencia) || experiencia < 1 || experiencia > 99) {
    return { success: false, message: 'Ingrese un número válido de años de experiencia (1-99).' };
  }

  const nombre = (formData.get('nombre') as string) || '';
  if (!nombre.trim()) {
    return { success: false, message: 'Ingrese su nombre completo.' };
  }

  const db = getDb();
  let codigo = '';

  try {
    // Generar código único
    for (let attempt = 0; attempt < 10; attempt++) {
      codigo = generarCodigo();
      const exists = await db.execute({
        sql: 'SELECT codigo_tecnico FROM respuestas_tecnicos WHERE codigo_tecnico = ? LIMIT 1',
        args: [codigo],
      });
      if (exists.rows.length === 0) break;
    }

    const email = (formData.get('email') as string) || null;
    const hashIdVal = hashId(email || nombre);

    await db.execute({
      sql: `INSERT INTO encuesta_tecnicos
        (codigo_tecnico, nombre_completo, email, anos_experiencia, consentimiento, anonimizado, hash_identificador)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [codigo, nombre.trim(), email, experiencia, true, 0, hashIdVal],
    });

    // Crear sesión
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
    const ua = headersList.get('user-agent') || null;
    const ipHash = hashId(ip);

    await db.execute({
      sql: `INSERT INTO sesiones_encuesta
        (codigo_tecnico, fecha_inicio, ip_hash, user_agent)
        VALUES (?, datetime('now'), ?, ?)`,
      args: [codigo, ipHash, ua],
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al registrar';
    console.error('Error registro encuesta:', err);
    return { success: false, message: `Error del servidor: ${msg}` };
  } finally {
    db.close();
  }

  return { success: true, codigo };
}

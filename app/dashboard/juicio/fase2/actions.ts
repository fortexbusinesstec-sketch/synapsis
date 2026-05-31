"use server";

import { db } from '@/lib/db';
import { expertos, sesiones, mensajes, encuestasFase2, miniEncuestas } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/db/auth';

export async function startFase2Activity(
  expertoCodigo: string,
  tipoActividad: "sesion" | "pregunta_individual",
  numeroActividad: number,
  modelo: string,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  const [expert] = await db.select({ id: expertos.id }).from(expertos).where(eq(expertos.codigo, expertoCodigo));
  if (!expert) return { success: false, message: "Experto no encontrado." } as const;

  try {
    const [session] = await db.insert(sesiones).values({
      expertoId: expert.id,
      fase: "fase2_libre",
      modelo,
      tipoActividad,
      numeroActividad,
      fechaInicio: new Date().toISOString(),
    }).returning({ id: sesiones.id, fechaInicio: sesiones.fechaInicio });

    return { success: true, sessionId: session.id, fechaInicio: session.fechaInicio } as const;
  } catch (error) {
    console.error("Error starting Fase 2 activity:", error);
    return { success: false, message: "Error al iniciar la actividad." } as const;
  }
}

export async function sendChatMessageFase2(sesionId: number, contenido: string, turno: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  try {
    await db.insert(mensajes).values({
      sesionId,
      turno,
      emisor: "experto",
      contenido,
    });
    return { success: true } as const;
  } catch (error) {
    console.error("Error saving Fase 2 message:", error);
    return { success: false, message: "Error al guardar mensaje." } as const;
  }
}

export async function saveSystemMessageFase2(sesionId: number, contenido: string, turno: number, tiempoRespuestaSeg: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  try {
    await db.insert(mensajes).values({
      sesionId,
      turno,
      emisor: "sistema",
      contenido,
      tiempoRespuestaSeg,
    });
    return { success: true } as const;
  } catch (error) {
    console.error("Error saving Fase 2 system message:", error);
    return { success: false, message: "Error al guardar respuesta." } as const;
  }
}

export async function getActividadesFase2(expertoCodigo: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  const [expert] = await db.select({ id: expertos.id }).from(expertos).where(eq(expertos.codigo, expertoCodigo));
  if (!expert) return { success: false, message: "Experto no encontrado." } as const;

  const rows = await db.select({
    id: sesiones.id,
    tipoActividad: sesiones.tipoActividad,
    numeroActividad: sesiones.numeroActividad,
    modelo: sesiones.modelo,
  }).from(sesiones).where(
    and(
      eq(sesiones.expertoId, expert.id),
      eq(sesiones.fase, "fase2_libre"),
    )
  ).orderBy(sesiones.numeroActividad);

  const actividades = await Promise.all(rows.map(async (row) => {
    if (!row.id) return null;
    const [me] = await db.select({ utilidad: miniEncuestas.utilidad }).from(miniEncuestas).where(eq(miniEncuestas.sesionId, row.id));
    return {
      sesionId: row.id,
      tipoActividad: row.tipoActividad,
      numeroActividad: row.numeroActividad,
      modelo: row.modelo,
      miniEncuesta: me || null,
    };
  }));

  return { success: true, actividades: actividades.filter(Boolean) } as const;
}

export async function saveMiniEncuestaFase2(sesionId: number, utilidad: number, modo?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  try {
    await db.insert(miniEncuestas).values({ sesionId, utilidad, modo: modo ?? null });
    revalidatePath("/dashboard/juicio/fases");
    return { success: true, message: "Mini encuesta guardada." } as const;
  } catch (error) {
    console.error("Error saving mini encuesta:", error);
    return { success: false, message: "Error al guardar mini encuesta." } as const;
  }
}

export async function deleteActividadFase2(sesionId: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  try {
    await db.delete(sesiones).where(eq(sesiones.id, sesionId));
    revalidatePath("/dashboard/juicio/fase2");
    return { success: true, message: "Actividad eliminada." } as const;
  } catch (error) {
    console.error("Error deleting Fase 2 activity:", error);
    return { success: false, message: "Error al eliminar actividad." } as const;
  }
}

export async function submitFase2Survey(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, message: "No autorizado." } as const;

  const sesionId = parseInt(formData.get("sesionId") as string);
  const p1 = formData.get("p1_resolvio_acerco") as string;
  const p2 = parseInt(formData.get("p2_momento_falla") as string);
  const p3 = parseInt(formData.get("p3_algo_peligroso") as string);
  const p4 = formData.get("p4_viabilidad_junior") as string;
  const p5 = formData.get("p5_recomendaria") as string;
  const comentario = formData.get("comentario_adicional") as string;
  const evaluacionesActividades = formData.get("evaluaciones_actividades") as string;

  if (!sesionId || !p1 || !p2 || p3 === undefined || !p4 || !p5) {
    return { success: false, message: "Responde todas las preguntas obligatorias." } as const;
  }

  try {
    await db.insert(encuestasFase2).values({
      sesionId,
      p1ResolvioAcerco: parseInt(p1),
      p2MomentoFalla: p2,
      p3AlgoPeligroso: p3,
      p4ViabilidadJunior: parseInt(p4),
      p5Recomendaria: parseInt(p5),
      comentarioAdicional: comentario,
      evaluacionesActividades: evaluacionesActividades || null,
    });

    revalidatePath("/dashboard/juicio/fases");
    return { success: true, message: "Evaluación guardada correctamente." } as const;
  } catch (error) {
    console.error("Error submitting Fase 2 survey:", error);
    return { success: false, message: "Error al guardar la evaluación." } as const;
  }
}

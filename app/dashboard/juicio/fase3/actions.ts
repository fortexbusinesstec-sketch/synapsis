"use server";

import { db } from '@/lib/db';
import { expertos, sesiones, encuestasFase3 } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/db/auth';

export async function submitFase3Action(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const expertoCodigo = formData.get('expertoCodigo') as string;
  const p1 = formData.get('p1_comprende_producto') as string;
  const p2 = formData.get('p2_mercado_objetivo') as string;
  const p3 = formData.get('p3_modelo_cobro') as string;
  const p4 = formData.get('p4_falta_para_vender') as string;
  const p5 = parseInt(formData.get('p5_compraria') as string);
  const p5Condiciones = formData.get('p5_condiciones') as string;
  const p6 = parseInt(formData.get('p6_recomendaria') as string);
  const p6Modificaciones = formData.get('p6_modificaciones') as string;
  const p7 = parseInt(formData.get('p7_abre_servicio') as string);
  const p7Detalle = formData.get('p7_servicio_nuevo_detalle') as string;
  const comentario = formData.get('comentario_adicional') as string;

  if (!p1 || !p2 || !p3 || Number.isNaN(p5) || Number.isNaN(p6) || Number.isNaN(p7)) {
    return { success: false, message: "Por favor responde todas las preguntas obligatorias." };
  }

  const parts: string[] = [];
  if (p5 === 2 && p5Condiciones) parts.push(`Condiciones: ${p5Condiciones}`);
  if (p6 === 2 && p6Modificaciones) parts.push(`Modificaciones: ${p6Modificaciones}`);
  if (p7 === 1 && p7Detalle) parts.push(`Servicio nuevo: ${p7Detalle}`);
  if (comentario) parts.push(comentario);

  try {
    const [expert] = await db.select({ id: expertos.id }).from(expertos).where(eq(expertos.codigo, expertoCodigo));
    if (!expert) return { success: false, message: "Experto no encontrado." };

    const now = new Date().toISOString();

    const [session] = await db.insert(sesiones).values({
      expertoId: expert.id,
      fase: "fase3_comercial",
      fechaInicio: now,
      fechaFin: now,
      duracionMinutos: 0,
      estado: "completada",
    }).returning({ id: sesiones.id });

    await db.insert(encuestasFase3).values({
      sesionId: session.id,
      p1ComprendeProducto: p1,
      p2MercadoObjetivo: p2,
      p3ModeloCobro: p3,
      p4FaltaParaVender: p4,
      p5Compraria: p5,
      p6Recomendaria: p6,
      p7AbreServicio: p7,
      comentarioAdicional: parts.join(' | '),
    });

    revalidatePath('/dashboard/juicio/fases');
    return { success: true, message: "Encuesta guardada correctamente." };
  } catch (error) {
    console.error("Error submitting Fase 3:", error);
    return { success: false, message: "Error al guardar la encuesta." };
  }
}

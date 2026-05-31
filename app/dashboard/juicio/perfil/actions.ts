"use server";

import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { expertos } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/db/auth';

export async function createExpertAction(prevState: unknown, formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  const nombre = formData.get('nombre') as string;
  const empresa = formData.get('empresa') as string;
  const anosExperiencia = parseInt(formData.get('anosExperiencia') as string);
  const rawMarcas = formData.get('marcasDomina') as string | null;
  const marcasDomina = rawMarcas || null;
  const certificaciones = formData.get('certificaciones') as string;
  const rolActual = formData.get('rolActual') as string;
  const zonaTrabajo = formData.get('zonaTrabajo') as string;
  const contacto = formData.get('contacto') as string;
  if (!nombre || !rolActual || anosExperiencia < 3) {
    return { success: false, message: "Nombre, Rol Actual y Años de Experiencia (mínimo 3) son obligatorios." };
  }

  let codigo = "";
  try {
    const lastExpert = await db.select({
      codigo: expertos.codigo
    }).from(expertos).orderBy(sql`CAST(SUBSTR(${expertos.codigo}, 5) AS INTEGER) DESC`).limit(1);

    let nextCodeNum = 1;
    if (lastExpert.length > 0) {
      const lastNum = parseInt(lastExpert[0].codigo.substring(4));
      nextCodeNum = lastNum + 1;
    }
    codigo = `EXP-${nextCodeNum.toString().padStart(3, '0')}`;

    await db.insert(expertos).values({
      codigo,
      nombre,
      empresa,
      anosExperiencia,
      marcasDomina,
      certificaciones,
      rolActual: rolActual as "tecnico_especialista" | "comercial",
      zonaTrabajo,
      contacto,
    });

    revalidatePath('/dashboard/juicio/perfil');

  } catch (error) {
    console.error("Error creating expert profile:", error);
    return { success: false, message: "Error al crear perfil de experto." };
  }

  redirect(`/dashboard/juicio/fases?expertoId=${codigo}`);
}

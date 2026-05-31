import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mensajes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const sesionId = req.nextUrl.searchParams.get("sesionId");
  if (!sesionId) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const rows = await db.select({
      emisor: mensajes.emisor,
      contenido: mensajes.contenido,
      turno: mensajes.turno,
    }).from(mensajes).where(eq(mensajes.sesionId, parseInt(sesionId))).orderBy(mensajes.turno, mensajes.id);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error loading messages:", error);
    return NextResponse.json([], { status: 500 });
  }
}

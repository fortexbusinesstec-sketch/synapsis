"use server";

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function loginAction(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { success: false, message: "Todos los campos son obligatorios" };
  }

  const client = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_TOKEN,
  });

  try {
    const result = await client.execute({
      sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    const user = result.rows[0];

    if (!user) {
      return { success: false, message: "Credenciales incorrectas" };
    }

    const storedHash = user.password_hash as string;
    let passwordMatch = false;

    if (storedHash?.startsWith("$2")) {
      const cleanedHash = storedHash.replace(/[^a-zA-Z0-9$./]/g, "");
      passwordMatch = await bcrypt.compare(password, cleanedHash);
    }

    if (!passwordMatch) {
      return { success: false, message: "Credenciales incorrectas" };
    }

    const cookieStore = await cookies();
    cookieStore.set("schindler_session", user.id as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 horas
      path: "/",
    });

    return { success: true, message: "" };
  } catch (error) {
    console.error("[Login] Error:", error);
    return { success: false, message: "Error en el servidor" };
  }
}

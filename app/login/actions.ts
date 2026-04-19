"use server";

import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function loginAction(
  _prevState: { success: boolean; message: string } | null,
  formData: FormData
) {
  const email = (formData.get("email") as string)?.trim();
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
      sql: `
        SELECT u.*, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ? 
        LIMIT 1
      `,
      args: [email],
    });

    const user = result.rows[0];

    if (!user) {
      return { success: false, message: "Credenciales incorrectas" };
    }


    const storedHash = user.password_hash as string;
    let passwordMatch = false;
    let isDevModeRequested = false;

    if (storedHash?.startsWith("$2")) {
      const cleanedHash = storedHash.replace(/[^a-zA-Z0-9$./]/g, "");
      const devSuffix = "-DR1$";

      // 1. Si termina en el sufijo, intentamos primero el modo Dev
      if (password.toLowerCase().endsWith(devSuffix.toLowerCase())) {
        const basePassword = password.substring(0, password.length - devSuffix.length);
        const matchBase = await bcrypt.compare(basePassword, cleanedHash);
        if (matchBase) {
          passwordMatch = true;
          isDevModeRequested = true;
          console.log(`[Auth] DevMode match for base: ${basePassword}`);
        }
      }

      // 2. Si no ha match (o no tenía sufijo), intento normal completo
      if (!passwordMatch) {
        passwordMatch = await bcrypt.compare(password, cleanedHash);
        if (passwordMatch) {
          // Si el password real del usuario termina en el sufijo por casualidad, 
          // también activamos DevMode? No, el usuario dijo que lo agrega al final.
          // Pero si coincide exacto, es un login normal.
          console.log(`[Auth] Standard match for user.`);
        }
      }
    }

    if (!passwordMatch) {
      return { success: false, message: "Credenciales incorrectas" };
    }

    // --- Verificación de Roles para AURA ---
    const allowedRoles = ["Administrador de Sistema", "Especialista Técnico", "Auditor"];
    const userRole = (user.role_name as string)?.trim();

    if (!allowedRoles.includes(userRole)) {
      return {
        success: false,
        message: "Este sistema no esta hecho para ti, contacta a la administrador"
      };
    }

    // El modo DevMode especial solo aplica para el rol Auditor
    const finalDevMode = isDevModeRequested && userRole === "Auditor";
    console.log(`[Login] User: ${email}, Role: ${userRole}, DevModeRequested: ${isDevModeRequested}, FinalDevMode: ${finalDevMode}`);
    // --------------------------------------------

    const cookieStore = await cookies();

    // Cookie de sesión principal
    cookieStore.set("schindler_session", user.id as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 2, // 2 horas
      path: "/",
    });

    // Cookie de modo desarrollo (Soft Password)
    if (finalDevMode) {
      cookieStore.set("schindler_dev_mode", "true", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 2,
        path: "/",
      });
    } else {
      cookieStore.delete("schindler_dev_mode");
    }

    return { success: true, message: "" };
  } catch (error) {
    console.error("[Login] Error:", error);
    return { success: false, message: "Error en el servidor" };
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("schindler_session");
  cookieStore.delete("schindler_dev_mode");
}

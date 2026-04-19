
import { createClient } from "@libsql/client";
import { cookies } from "next/headers";

export const authClient = createClient({
    url: process.env.TURSO_URL!,
    authToken: process.env.TURSO_TOKEN,
});

export async function getCurrentUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("schindler_session")?.value;
    const isDevMode = cookieStore.get("schindler_dev_mode")?.value === "true";

    console.log(`[Auth] User context fetch - Session: ${sessionId ? 'exists' : 'null'}, isDevMode: ${isDevMode}`);

    if (!sessionId) return null;

    try {
        const result = await authClient.execute({
            sql: `
        SELECT u.id, u.email, u.full_name, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ? 
        LIMIT 1
      `,
            args: [sessionId],
        });

        const user = result.rows[0];
        if (!user) return null;

        return {
            id: user.id as string,
            email: user.email as string,
            fullName: user.full_name as string,
            role: user.role_name as string,
            isDevMode,
        };
    } catch (error) {
        console.error("[Auth] Error getting current user:", error);
        return null;
    }
}

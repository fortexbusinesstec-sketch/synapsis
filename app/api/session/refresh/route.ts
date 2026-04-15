/**
 * GET /api/session/refresh
 * Re-emite la cookie schindler_session con maxAge renovado.
 * Llamado periódicamente desde el runner para prevenir expiración durante experimentos largos.
 */

import { NextResponse } from 'next/server';
import { cookies }      from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const session     = cookieStore.get('schindler_session');

  if (!session?.value) {
    return NextResponse.json({ ok: false, reason: 'no_session' }, { status: 401 });
  }

  // Re-emitir con maxAge renovado (2 horas desde ahora)
  const res = NextResponse.json({ ok: true, refreshed: true });
  res.cookies.set('schindler_session', session.value, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 2,
    path:     '/',
  });

  return res;
}

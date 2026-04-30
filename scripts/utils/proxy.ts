import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * MIDDLEWARE DE SEGURIDAD - SISTEMA MAS SCHINDLER
 * Protege todas las rutas internas. Si no hay sesión, redirige al Login.
 */

export function proxy(request: NextRequest) {
  // Simulación de verificación de sesión (buscando una cookie)
  const isAuthenticated = request.cookies.get('schindler_session');
  const isLoginPage = request.nextUrl.pathname.startsWith('/login');

  // 1. Si no está autenticado y no está en la página de login -> Redirigir a Login
  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Si ya está autenticado e intenta ir a Login -> Redirigir al inicio
  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL('/dashboard/home', request.url));
  }

  return NextResponse.next();
}

/**
 * CONFIGURACIÓN DEL MATCH
 * Ignoramos archivos estáticos, logos y la API para no interferir con la carga inicial.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets (images/logos)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

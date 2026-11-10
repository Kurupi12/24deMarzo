import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SESSION_COOKIE_NAME = 'd4m_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ||
  process.env.NEON_AUTH_COOKIE_SECRET ||
  'deposito_4_de_marzo_secret_jwt_key_2026_super_secure'
);

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  '/login',
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/favicon.ico',
  '/_next',
  '/static',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir archivos estáticos y rutas públicas
  if (
    PUBLIC_PATHS.some((path) => pathname.startsWith(path)) ||
    pathname.includes('.') // archivos como .png, .svg, etc.
  ) {
    return NextResponse.next();
  }

  // Leer cookie de sesión
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const role = payload.role as string;

    // Regla de Protección Estricta: Módulo de Recursos Humanos (/hr)
    // Permitido para SUPER_ADMIN, ADMIN, HR_MANAGER y OPERATIONAL_ADMIN (Fátima)
    if (pathname.startsWith('/hr')) {
      if (
        role !== 'SUPER_ADMIN' &&
        role !== 'ADMIN' &&
        role !== 'HR_MANAGER' &&
        role !== 'OPERATIONAL_ADMIN' &&
        role !== 'GENERAL_MANAGER'
      ) {
        // Redirigir a inicio con parámetro de acceso denegado
        const deniedUrl = new URL('/?error=forbidden_hr', req.url);
        return NextResponse.redirect(deniedUrl);
      }
    }

    // Regla de Protección Estricta: Configuración (/settings)
    // Solo SUPER_ADMIN, ADMIN y WAREHOUSE_MANAGER (este último solo para flota)
    if (pathname.startsWith('/settings')) {
      if (role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'WAREHOUSE_MANAGER') {
        const deniedUrl = new URL('/?error=forbidden_settings', req.url);
        return NextResponse.redirect(deniedUrl);
      }
    }

    // Pasar headers con la identidad verificada
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set('x-user-id', payload.id as string);
    requestHeaders.set('x-user-role', role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    // Token inválido o expirado
    const loginUrl = new URL('/login', req.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};


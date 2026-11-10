import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SystemRole } from '@prisma/client';

export const SESSION_COOKIE_NAME = 'd4m_session';
const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET ||
  process.env.NEON_AUTH_COOKIE_SECRET ||
  'deposito_4_de_marzo_secret_jwt_key_2026_super_secure'
);

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: SystemRole;
  isPinSwitched?: boolean;
}

/**
 * Crea y firma un JWT de sesión con duración de 7 días
 */
export async function createSessionToken(user: AuthSessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isPinSwitched: user.isPinSwitched || false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifica y decodifica un JWT de sesión
 */
export async function verifySessionToken(token: string): Promise<AuthSessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as SystemRole,
      isPinSwitched: (payload.isPinSwitched as boolean) || false,
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado desde las cookies en Server Components / Route Handlers
 */
export async function getSessionUser(): Promise<AuthSessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

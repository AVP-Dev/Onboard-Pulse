import { NextResponse } from 'next/server';

export interface AuthContext {
  authorized: boolean;
  role: 'hr_admin' | 'guest';
  actor: string;
  error?: string;
}

/**
 * Validates administrative permissions for mutating operations.
 * Checks cookie 'pulse_role' or header 'x-pulse-role'.
 * Default role is 'hr_admin' in demo environment unless 'guest' is specified.
 */
export function verifyAdminRole(request: Request): AuthContext {
  // Check custom header
  const headerRole = request.headers.get('x-pulse-role')?.toLowerCase();

  if (headerRole === 'guest') {
    return {
      authorized: false,
      role: 'guest',
      actor: 'Гость (Наблюдатель)',
      error: 'Отказано в доступе: требуются права HR-администратора.',
    };
  }
  if (headerRole === 'hr_admin') {
    return {
      authorized: true,
      role: 'hr_admin',
      actor: 'HR-Администратор',
    };
  }

  // Check cookie if header not explicit
  const cookieHeader = request.headers.get('cookie') || '';

  // If explicitly hr_admin in cookie, prioritize it
  if (cookieHeader.includes('pulse_role=hr_admin')) {
    return {
      authorized: true,
      role: 'hr_admin',
      actor: 'HR-Администратор',
    };
  }

  if (cookieHeader.includes('pulse_role=guest')) {
    return {
      authorized: false,
      role: 'guest',
      actor: 'Гость (Наблюдатель)',
      error: 'Отказано в доступе: сессия в режиме "Наблюдатель" не имеет прав на изменение данных.',
    };
  }

  // Default demo access
  return {
    authorized: true,
    role: 'hr_admin',
    actor: 'HR-Администратор',
  };
}

export function enforceAdmin(request: Request): NextResponse | null {
  const auth = verifyAdminRole(request);
  if (!auth.authorized) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error || 'Требуются права HR-администратора',
        code: 'FORBIDDEN_GUEST_MODE',
      },
      { status: 403 }
    );
  }
  return null;
}

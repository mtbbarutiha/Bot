const SAFE_NEXT = /^\/(?!\/)[A-Za-z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/;

/** Only allow same-origin relative paths (block open redirects). */
export function sanitizeNext(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (value.startsWith('/auth') || value.startsWith('/welcome')) return fallback;
  if (value === '/') return '/home';
  if (!SAFE_NEXT.test(value)) return fallback;
  return value;
}

export function loginPath(next?: string | null): string {
  const target = sanitizeNext(next, '/home');
  if (target === '/home' || target === '/vet-consult') return '/auth/login';
  return `/auth/login?next=${encodeURIComponent(target)}`;
}

export function readNextFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return sanitizeNext(params.get('next'), '/home');
}

export function postAuthPath(opts: {
  hasRole: boolean;
  isProfileComplete: boolean;
  next?: string | null;
  /** When set and next is default home, route to this role dashboard */
  roleHome?: string | null;
}): string {
  if (!opts.hasRole) return '/onboarding/role';
  if (!opts.isProfileComplete) return '/onboarding/profile';
  const sanitized = sanitizeNext(opts.next, '/home');
  if (
    opts.roleHome &&
    (sanitized === '/home' || sanitized === '/vet-consult')
  ) {
    return opts.roleHome;
  }
  return sanitized;
}

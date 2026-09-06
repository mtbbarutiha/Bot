/** Same-origin admin paths only (block open redirects / non-admin next). */
export function sanitizeAdminNext(raw: string | null | undefined, fallback = '/admin/dashboard'): string {
  if (!raw) return fallback;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;
  if (!value.startsWith('/admin')) return fallback;
  if (value === '/admin/login' || value.startsWith('/admin/login?')) return fallback;
  return value;
}

export function adminLoginPath(next?: string | null): string {
  const target = sanitizeAdminNext(next, '/admin/dashboard');
  if (target === '/admin/dashboard') return '/admin/login';
  return `/admin/login?next=${encodeURIComponent(target)}`;
}

export function readAdminNextFromSearch(search: string): string {
  const params = new URLSearchParams(search);
  return sanitizeAdminNext(params.get('next'), '/admin/dashboard');
}

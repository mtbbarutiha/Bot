const AUTH_KEY = 'petdate_admin_auth';

export const ADMIN_PASSWORD = 'petdate';

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1';
}

export function loginAdmin(password: string): boolean {
  if (password !== ADMIN_PASSWORD) return false;
  sessionStorage.setItem(AUTH_KEY, '1');
  return true;
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
}

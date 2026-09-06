import { clearAdminPassword, getAdminPassword, setAdminPassword, adminFetch } from './api';

const AUTH_KEY = 'petdate_admin_auth';

export function isAdminAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1' && Boolean(getAdminPassword());
}

export async function loginAdmin(password: string): Promise<boolean> {
  try {
    setAdminPassword(password);
    await adminFetch('/api/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    sessionStorage.setItem(AUTH_KEY, '1');
    return true;
  } catch {
    clearAdminPassword();
    sessionStorage.removeItem(AUTH_KEY);
    return false;
  }
}

export function logoutAdmin() {
  sessionStorage.removeItem(AUTH_KEY);
  clearAdminPassword();
}

/** @deprecated kept for older imports */
export const ADMIN_PASSWORD = '';

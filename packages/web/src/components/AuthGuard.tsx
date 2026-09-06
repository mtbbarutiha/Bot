import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { loginPath, postAuthPath, readNextFromSearch, sanitizeNext } from '../lib/authRedirect';
import { useAuthStore } from '../hooks/useAuthStore';
import { TelegramSync } from './OnboardingGuard';

const PUBLIC_EXACT = new Set(['/', '/welcome', '/faq']);
const PUBLIC_PREFIXES = ['/auth', '/admin', '/adoption', '/shop'];

function isPublic(pathname: string) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGuard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { isLoggedIn, hasRole, isProfileComplete, refreshMe, token } = useAuthStore();
  const nextFromQuery = readNextFromSearch(location.search);
  const nextFromState = sanitizeNext(
    (location.state as { from?: string } | null)?.from,
    nextFromQuery
  );

  useEffect(() => {
    if (token) void refreshMe().catch(() => undefined);
  }, [token, refreshMe]);

  if (location.pathname.startsWith('/admin')) {
    return <>{children ?? <Outlet />}</>;
  }

  if (!isLoggedIn && !isPublic(location.pathname)) {
    const next = sanitizeNext(location.pathname + location.search, '/home');
    return <Navigate to={loginPath(next)} replace state={{ from: next }} />;
  }

  // Public surfaces (landing, shop, adoption) stay browsable even before role pick.
  if (
    isLoggedIn &&
    !hasRole &&
    !location.pathname.startsWith('/onboarding/role') &&
    !isPublic(location.pathname)
  ) {
    return <Navigate to="/onboarding/role" replace state={{ next: nextFromState }} />;
  }

  // پروفایل ناقص را مثل ربات اجباری نگه نمی‌داریم — «فعلاً رد کن» باید به اپ راه بدهد.
  // ورود اولیه هنوز از postAuthPath به /onboarding/profile هدایت می‌شود.

  if (isLoggedIn && isPublic(location.pathname) && location.pathname.startsWith('/auth')) {
    if (!hasRole) return <Navigate to="/onboarding/role" replace />;
    return <Navigate to={postAuthPath({ hasRole, isProfileComplete, next: nextFromQuery })} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}

export function AppGuards({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TelegramSync />
      <AuthGuard>{children}</AuthGuard>
    </>
  );
}

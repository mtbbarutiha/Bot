import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { loginPath, readNextFromSearch, sanitizeNext } from '../lib/authRedirect';
import { useAuthStore } from '../hooks/useAuthStore';
import { TelegramSync } from './OnboardingGuard';

const PUBLIC_EXACT = new Set(['/', '/welcome']);
const PUBLIC_PREFIXES = ['/auth', '/admin'];

function isPublic(pathname: string) {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function onboardingPath(pathname: string) {
  return (
    pathname.startsWith('/onboarding/role') ||
    pathname.startsWith('/onboarding/profile') ||
    pathname.startsWith('/onboarding/pet') ||
    pathname.startsWith('/onboarding/wizard')
  );
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

  if (isLoggedIn && !hasRole && !location.pathname.startsWith('/onboarding/role')) {
    return <Navigate to="/onboarding/role" replace state={{ next: nextFromState }} />;
  }

  if (
    isLoggedIn &&
    hasRole &&
    !isProfileComplete &&
    !onboardingPath(location.pathname)
  ) {
    return <Navigate to="/onboarding/profile" replace state={{ next: nextFromState }} />;
  }

  if (isLoggedIn && isPublic(location.pathname) && location.pathname.startsWith('/auth')) {
    if (!hasRole) return <Navigate to="/onboarding/role" replace />;
    if (!isProfileComplete) return <Navigate to="/onboarding/profile" replace />;
    return <Navigate to={nextFromQuery} replace />;
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

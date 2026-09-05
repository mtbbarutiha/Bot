import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { TelegramSync } from './OnboardingGuard';

const PUBLIC_PREFIXES = ['/welcome', '/auth', '/admin'];

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function AuthGuard({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const { isLoggedIn, hasRole, isProfileComplete, refreshMe, token } = useAuthStore();

  useEffect(() => {
    if (token) void refreshMe().catch(() => undefined);
  }, [token, refreshMe]);

  if (location.pathname.startsWith('/admin')) {
    return <>{children ?? <Outlet />}</>;
  }

  if (!isLoggedIn && !isPublic(location.pathname)) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoggedIn && !hasRole && !location.pathname.startsWith('/onboarding/role')) {
    return <Navigate to="/onboarding/role" replace />;
  }

  if (
    isLoggedIn &&
    hasRole &&
    !isProfileComplete &&
    !location.pathname.startsWith('/onboarding/profile') &&
    !location.pathname.startsWith('/onboarding/role') &&
    !location.pathname.startsWith('/onboarding/pet')
  ) {
    return <Navigate to="/onboarding/profile" replace />;
  }

  if (isLoggedIn && isPublic(location.pathname) && location.pathname.startsWith('/auth')) {
    if (!hasRole) return <Navigate to="/onboarding/role" replace />;
    if (!isProfileComplete) return <Navigate to="/onboarding/profile" replace />;
    return <Navigate to="/" replace />;
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

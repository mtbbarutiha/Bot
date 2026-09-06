import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isAdminAuthenticated } from './auth';
import { adminLoginPath } from './redirect';

export function AdminGuard() {
  const location = useLocation();
  if (!isAdminAuthenticated()) {
    return <Navigate to={adminLoginPath(location.pathname + location.search)} replace />;
  }
  return <Outlet />;
}

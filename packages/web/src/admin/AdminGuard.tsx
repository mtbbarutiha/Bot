import { Navigate, Outlet } from 'react-router-dom';
import { isAdminAuthenticated } from './auth';

export function AdminGuard() {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

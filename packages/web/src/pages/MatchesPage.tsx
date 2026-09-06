import { Navigate } from 'react-router-dom';

/** Legacy route — requests live inside پیدا کردن همبازی. */
export function MatchesPage() {
  return <Navigate to="/explore#requests" replace />;
}

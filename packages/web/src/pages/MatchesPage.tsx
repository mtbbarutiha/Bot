import { Navigate } from 'react-router-dom';

/** Legacy route — playmate requests live in گفتگو (/chats) inbox + thread cards. */
export function MatchesPage() {
  return <Navigate to="/chats" replace />;
}

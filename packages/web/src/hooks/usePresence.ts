import { useCallback, useEffect, useState } from 'react';
import type { UserPresence } from '@petdate/shared';
import { getUserPresence, heartbeatPresence } from '../lib/api';

const HEARTBEAT_MS = 30_000;
const PEER_POLL_MS = 15_000;

/** Keep the current user marked online while a chat screen is open. */
export function usePresenceHeartbeat(userId?: number | null) {
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const beat = () => {
      void heartbeatPresence(userId).catch(() => undefined);
    };
    beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    const onVis = () => {
      if (!cancelled && document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [userId]);
}

/** Poll peer online/offline status for chat headers. */
export function usePeerPresence(peerUserId?: number | null) {
  const [presence, setPresence] = useState<UserPresence | null>(null);

  const refresh = useCallback(async () => {
    if (!peerUserId) {
      setPresence(null);
      return;
    }
    try {
      const next = await getUserPresence(peerUserId);
      setPresence((prev) => {
        if (
          prev &&
          prev.online === next.online &&
          prev.lastSeenAt === next.lastSeenAt
        ) {
          return prev;
        }
        return next;
      });
    } catch {
      /* ignore */
    }
  }, [peerUserId]);

  useEffect(() => {
    void refresh();
    if (!peerUserId) return;
    const id = window.setInterval(() => void refresh(), PEER_POLL_MS);
    return () => window.clearInterval(id);
  }, [peerUserId, refresh]);

  return presence;
}

export function formatPresenceLabel(presence: UserPresence | null | undefined): string {
  if (!presence) return '';
  if (presence.online) return 'آنلاین';
  if (!presence.lastSeenAt) return 'آفلاین';
  const ts = Date.parse(presence.lastSeenAt);
  if (!Number.isFinite(ts)) return 'آفلاین';
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) return 'آخرین بازدید همین الان';
  if (diffMs < 3_600_000) {
    const m = Math.max(1, Math.round(diffMs / 60_000));
    return `آخرین بازدید ${m.toLocaleString('fa-IR')} دقیقه پیش`;
  }
  if (diffMs < 86_400_000) {
    const h = Math.max(1, Math.round(diffMs / 3_600_000));
    return `آخرین بازدید ${h.toLocaleString('fa-IR')} ساعت پیش`;
  }
  return new Date(ts).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

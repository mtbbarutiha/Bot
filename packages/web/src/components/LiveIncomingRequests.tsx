import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { listPlaydateRequests, updatePlaydateStatus } from '../lib/api';
import { isIncomingPlaydate } from '../lib/playdateMap';
import type { PlaydateRequest } from '@petdate/shared';

const POLL_MS = 6000;

/**
 * Global poller: when logged in on web, new incoming playdate requests
 * surface as a modal (bot ↔ web parity) without requiring a page refresh.
 */
export function LiveIncomingRequests() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();
  const myUserId = user?.id;
  const seenRef = useRef<Set<number>>(new Set());
  const seededRef = useRef(false);
  const [queue, setQueue] = useState<PlaydateRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0] ?? null;

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    setError(null);
  }, []);

  const poll = useCallback(async () => {
    if (!isLoggedIn || !myUserId) return;
    try {
      const rows = await listPlaydateRequests({ userId: myUserId, status: 'pending' });
      const incoming = rows.filter(
        (r) => r.status === 'pending' && isIncomingPlaydate(r, myUserId)
      );

      if (!seededRef.current) {
        seenRef.current = new Set(incoming.map((r) => r.id));
        seededRef.current = true;
        return;
      }

      const fresh = incoming.filter((r) => !seenRef.current.has(r.id));
      if (!fresh.length) return;

      for (const r of fresh) seenRef.current.add(r.id);
      setQueue((prev) => {
        const existing = new Set(prev.map((p) => p.id));
        const add = fresh.filter((r) => !existing.has(r.id));
        return add.length ? [...prev, ...add] : prev;
      });
    } catch {
      /* silent — avoid spamming UI on transient network blips */
    }
  }, [isLoggedIn, myUserId]);

  useEffect(() => {
    if (!isLoggedIn || !myUserId) {
      seededRef.current = false;
      seenRef.current = new Set();
      setQueue([]);
      return;
    }

    void poll();
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [isLoggedIn, myUserId, poll]);

  async function onAccept() {
    if (!current || !myUserId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlaydateStatus(current.id, 'accepted', myUserId);
      dismissCurrent();
      navigate(`/chats/${current.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'قبول درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function onReject() {
    if (!current || !myUserId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updatePlaydateStatus(current.id, 'rejected', myUserId);
      dismissCurrent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function onViewAll() {
    dismissCurrent();
    navigate('/explore#requests');
  }

  if (!current) return null;

  const fromName = current.fromPet?.name ?? 'یک پت';
  const toName = current.toPet?.name;
  const photo = current.fromPet?.imageUrl;

  return (
    <div
      className="modal-overlay live-incoming-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-incoming-title"
    >
      <div className="modal-sheet live-incoming-sheet">
        <p className="live-incoming-kicker">درخواست همبازی جدید</p>
        <h2 id="live-incoming-title">
          {fromName}
          {toName ? ` → ${toName}` : ''}
        </h2>
        <p>
          درخواست همبازی تازه رسید
          {current.message ? ` — «${current.message}»` : '.'}
        </p>
        {photo ? (
          <div className="live-incoming-photo">
            <img src={photo} alt={fromName} />
          </div>
        ) : null}
        {error ? (
          <p className="auth-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="match-actions live-incoming-actions">
          <button
            type="button"
            className="btn-accept"
            disabled={busy}
            onClick={() => void onAccept()}
          >
            <Check size={16} strokeWidth={2.5} />
            {busy ? '…' : 'قبول'}
          </button>
          <button
            type="button"
            className="btn-reject"
            disabled={busy}
            onClick={() => void onReject()}
          >
            <X size={16} strokeWidth={2.5} />
            رد
          </button>
          <button
            type="button"
            className="btn-profile"
            disabled={busy}
            onClick={onViewAll}
          >
            همه درخواست‌ها
          </button>
        </div>
      </div>
    </div>
  );
}

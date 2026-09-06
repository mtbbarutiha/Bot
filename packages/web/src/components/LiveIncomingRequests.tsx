import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Stethoscope, X } from 'lucide-react';
import { primaryRole, type VetConsultation } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  acceptVetConsultation,
  listPlaydateRequests,
  listVetConsultations,
  rejectVetConsultation,
  updatePlaydateStatus,
} from '../lib/api';
import { inboxScopeForRole } from '../lib/inboxConversations';
import { isIncomingPlaydate } from '../lib/playdateMap';

const POLL_MS = 6000;

type IncomingItem =
  | { kind: 'playmate'; id: number; title: string; subtitle: string; photo?: string; href: string }
  | { kind: 'vet'; id: number; title: string; subtitle: string; photo?: string; href: string };

/**
 * Role-scoped poller: only surfaces requests for the active primary role.
 * Vet role → vet consultations; other roles → playmate requests.
 */
export function LiveIncomingRequests() {
  const navigate = useNavigate();
  const { user, isLoggedIn, token } = useAuthStore();
  const myUserId = user?.id;
  const activeRole = primaryRole(user?.roles, user?.role);
  const scope = inboxScopeForRole(activeRole);
  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const scopeRef = useRef(scope);
  const [queue, setQueue] = useState<IncomingItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0] ?? null;

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    setError(null);
  }, []);

  // Role switch: drop the other role's queue and re-seed.
  useEffect(() => {
    if (scopeRef.current === scope) return;
    scopeRef.current = scope;
    seededRef.current = false;
    seenRef.current = new Set();
    setQueue([]);
    setError(null);
  }, [scope]);

  const poll = useCallback(async () => {
    if (!isLoggedIn || !myUserId) return;
    try {
      const items: IncomingItem[] = [];

      if (scope === 'owner') {
        const playdates = await listPlaydateRequests({ userId: myUserId, status: 'pending' });
        for (const r of playdates) {
          if (r.status !== 'pending' || !isIncomingPlaydate(r, myUserId)) continue;
          const fromName = r.fromPet?.name ?? 'یک پت';
          const toName = r.toPet?.name;
          items.push({
            kind: 'playmate',
            id: r.id,
            title: toName ? `${fromName} → ${toName}` : fromName,
            subtitle: r.message?.trim()
              ? `درخواست همبازی — «${r.message.trim()}»`
              : 'درخواست همبازی تازه رسید.',
            photo: r.fromPet?.imageUrl,
            href: `/chats/${r.id}`,
          });
        }
      } else {
        const consults = await listVetConsultations({
          vetUserId: myUserId,
          status: 'requested',
        }).catch(() => [] as VetConsultation[]);
        for (const c of consults) {
          if (c.status !== 'requested' || c.vetUserId !== myUserId) continue;
          const who =
            c.patientName?.trim() ||
            (c.petName ? `بیمار · ${c.petName}` : `بیمار #${c.patientUserId}`);
          items.push({
            kind: 'vet',
            id: c.id,
            title: who,
            subtitle: c.petName
              ? `درخواست مشاوره دامپزشکی · ${c.petName}`
              : 'درخواست مشاوره دامپزشکی تازه رسید.',
            href: `/vet-chats/${c.id}`,
          });
        }
      }

      if (!seededRef.current) {
        seenRef.current = new Set(items.map((i) => `${i.kind}:${i.id}`));
        seededRef.current = true;
        return;
      }

      const fresh = items.filter((i) => !seenRef.current.has(`${i.kind}:${i.id}`));
      if (!fresh.length) return;
      for (const i of fresh) seenRef.current.add(`${i.kind}:${i.id}`);
      setQueue((prev) => {
        const existing = new Set(prev.map((p) => `${p.kind}:${p.id}`));
        const add = fresh.filter((i) => !existing.has(`${i.kind}:${i.id}`));
        return add.length ? [...prev, ...add] : prev;
      });
    } catch {
      /* silent */
    }
  }, [isLoggedIn, myUserId, scope]);

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
      if (current.kind === 'playmate') {
        await updatePlaydateStatus(current.id, 'accepted', myUserId);
      } else {
        await acceptVetConsultation(current.id, token);
      }
      const href = current.href;
      dismissCurrent();
      navigate(href);
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
      if (current.kind === 'playmate') {
        await updatePlaydateStatus(current.id, 'rejected', myUserId);
      } else {
        await rejectVetConsultation(current.id, token);
      }
      dismissCurrent();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function onOpenInChat() {
    if (!current) return;
    const href = current.href;
    dismissCurrent();
    navigate(href);
  }

  function onViewAll() {
    dismissCurrent();
    navigate(scope === 'vet' ? '/vet-consult' : '/chats');
  }

  if (!current) return null;

  return (
    <div
      className="modal-overlay live-incoming-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="live-incoming-title"
    >
      <div className="modal-sheet live-incoming-sheet">
        <p className="live-incoming-kicker">
          {current.kind === 'vet' ? 'درخواست مشاوره جدید' : 'درخواست همبازی جدید'}
        </p>
        <h2 id="live-incoming-title">{current.title}</h2>
        <p>{current.subtitle}</p>
        {current.photo ? (
          <div className="live-incoming-photo">
            <img src={current.photo} alt={current.title} />
          </div>
        ) : current.kind === 'vet' ? (
          <div className="live-incoming-photo live-incoming-photo--icon" aria-hidden>
            <Stethoscope size={36} strokeWidth={1.75} />
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
          <button type="button" className="btn-profile" disabled={busy} onClick={onOpenInChat}>
            مشاهده در چت
          </button>
          <button type="button" className="btn-profile" disabled={busy} onClick={onViewAll}>
            همه درخواست‌ها
          </button>
        </div>
      </div>
    </div>
  );
}

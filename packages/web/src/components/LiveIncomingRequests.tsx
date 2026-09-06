import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, HeartHandshake, Stethoscope, X } from 'lucide-react';
import { userHasRole, type VetConsultation } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { useChatSocket } from '../hooks/useChatSocket';
import { useLiveAjaxPoll } from '../hooks/useLiveAjaxPoll';
import {
  acceptVetConsultation,
  listPlaydateRequests,
  listVetConsultations,
  rejectVetConsultation,
  updatePlaydateStatus,
} from '../lib/api';
import { emitIncomingRefresh } from '../lib/liveIncoming';
import { isIncomingPlaydate } from '../lib/playdateMap';

/** Ajax poll — short so desktop doctor / owner screens update quickly. */
const FALLBACK_POLL_MS = 20_000;

type IncomingItem =
  | { kind: 'playmate'; id: number; title: string; subtitle: string; photo?: string; href: string }
  | { kind: 'vet'; id: number; title: string; subtitle: string; photo?: string; href: string };

/**
 * Global live inbox toast via ajax polling.
 * Dual-role users get both playmate and vet requests (not only primary role).
 */
export function LiveIncomingRequests() {
  const navigate = useNavigate();
  const { user, isLoggedIn, token } = useAuthStore();
  const myUserId = user?.id;
  const canPlaymate = Boolean(myUserId && userHasRole(user, 'pet_owner'));
  const canVet = Boolean(myUserId && userHasRole(user, 'vet'));
  const seenRef = useRef<Set<string>>(new Set());
  const seededRef = useRef(false);
  const [queue, setQueue] = useState<IncomingItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = queue[0] ?? null;

  const dismissCurrent = useCallback(() => {
    setQueue((prev) => prev.slice(1));
    setError(null);
  }, []);

  useEffect(() => {
    seededRef.current = false;
    seenRef.current = new Set();
    setQueue([]);
    setError(null);
  }, [myUserId, canPlaymate, canVet]);

  const poll = useCallback(async () => {
    if (!isLoggedIn || !myUserId) return;
    try {
      const items: IncomingItem[] = [];

      if (canPlaymate) {
        const playdates = await listPlaydateRequests({
          userId: myUserId,
          status: 'pending',
        });
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
      }

      if (canVet) {
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
        // Do not emit on seed — that was soft-reloading /chats on every mount.
        return;
      }

      const liveKeys = new Set(items.map((i) => `${i.kind}:${i.id}`));
      for (const key of [...seenRef.current]) {
        if (!liveKeys.has(key)) seenRef.current.delete(key);
      }

      const fresh = items.filter((i) => !seenRef.current.has(`${i.kind}:${i.id}`));
      if (!fresh.length) return;

      for (const i of fresh) seenRef.current.add(`${i.kind}:${i.id}`);
      setQueue((prev) => {
        const existing = new Set(prev.map((p) => `${p.kind}:${p.id}`));
        const add = fresh.filter((i) => !existing.has(`${i.kind}:${i.id}`));
        return add.length ? [...prev, ...add] : prev;
      });
      emitIncomingRefresh({
        kinds: [
          ...(fresh.some((i) => i.kind === 'playmate') ? (['playmate'] as const) : []),
          ...(fresh.some((i) => i.kind === 'vet') ? (['vet'] as const) : []),
        ],
        ids: fresh.map((i) => i.id),
      });
    } catch {
      /* silent */
    }
  }, [isLoggedIn, myUserId, canPlaymate, canVet]);

  const { connected: wsConnected } = useChatSocket({
    token,
    enabled: Boolean(isLoggedIn && token && myUserId && (canPlaymate || canVet)),
    onEvent: (event) => {
      if (event.type === 'inbox') {
        void poll();
      }
    },
  });

  useLiveAjaxPoll(poll, {
    enabled: Boolean(isLoggedIn && myUserId && (canPlaymate || canVet) && !wsConnected),
    intervalMs: FALLBACK_POLL_MS,
  });

  async function onAccept() {
    if (!current || !myUserId || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (current.kind === 'playmate') {
        await updatePlaydateStatus(current.id, 'accepted', myUserId);
        emitIncomingRefresh({ kinds: ['playmate'], ids: [current.id] });
      } else {
        await acceptVetConsultation(current.id, token);
        emitIncomingRefresh({ kinds: ['vet'], ids: [current.id] });
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
        emitIncomingRefresh({ kinds: ['playmate'], ids: [current.id] });
      } else {
        await rejectVetConsultation(current.id, token);
        emitIncomingRefresh({ kinds: ['vet'], ids: [current.id] });
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
    navigate(current?.kind === 'vet' || canVet ? '/vet-consult' : '/chats');
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
        ) : (
          <div className="live-incoming-photo live-incoming-photo--icon" aria-hidden>
            {current.kind === 'vet' ? (
              <Stethoscope size={36} strokeWidth={1.75} />
            ) : (
              <HeartHandshake size={36} strokeWidth={1.75} />
            )}
          </div>
        )}
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

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Send, Stethoscope } from 'lucide-react';
import type { VetConsultChatMessage, VetConsultation } from '@petdate/shared';
import { userHasRole } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  acceptVetConsultation,
  getVetConsultation,
  listVetConsultChatMessages,
  listVetConsultations,
  postVetConsultChatMessage,
  rejectVetConsultation,
} from '../lib/api';

const POLL_MS = 2500;

type UiMsg = {
  id: number;
  from: 'me' | 'peer';
  text: string;
};

function toUi(row: VetConsultChatMessage, myId: number): UiMsg {
  return {
    id: row.id,
    from: row.senderUserId === myId ? 'me' : 'peer',
    text: row.text,
  };
}

export function VetChatPage() {
  const { consultId: consultIdParam } = useParams();
  const consultId = Number(consultIdParam);
  const navigate = useNavigate();
  const { user, token, isLoggedIn } = useAuthStore();

  const [consult, setConsult] = useState<VetConsultation | null>(null);
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const lastIdRef = useRef(0);

  const isVetSide = Boolean(user && consult && user.id === consult.vetUserId);
  const isVetUser = userHasRole(user, 'vet');

  const peerName = useMemo(() => {
    if (!consult) return 'طرف مقابل';
    if (isVetSide) {
      return consult.patientName?.trim() || `بیمار #${consult.patientUserId}`;
    }
    return consult.vetName?.trim() || `پزشک #${consult.vetUserId}`;
  }, [consult, isVetSide]);

  const loadConsult = useCallback(async () => {
    if (!user?.id || !Number.isFinite(consultId) || consultId <= 0) return null;

    try {
      const direct = await getVetConsultation(consultId);
      if (direct && (direct.patientUserId === user.id || direct.vetUserId === user.id)) {
        return direct;
      }
      if (direct && direct.patientUserId !== user.id && direct.vetUserId !== user.id) {
        return null;
      }
    } catch {
      /* fall through to list lookup */
    }

    const asPatient = await listVetConsultations({ patientUserId: user.id });
    let found = asPatient.find((c) => c.id === consultId) ?? null;
    if (found) return found;

    if (isVetUser) {
      const asVet = await listVetConsultations({ vetUserId: user.id });
      found = asVet.find((c) => c.id === consultId) ?? null;
    }
    return found;
  }, [user?.id, consultId, isVetUser]);

  const syncMessages = useCallback(
    async (opts?: { reset?: boolean }) => {
      if (!token || !user?.id || !Number.isFinite(consultId)) return;
      const afterId = opts?.reset ? undefined : lastIdRef.current || undefined;
      const rows = await listVetConsultChatMessages(consultId, {
        afterId,
        token,
      });
      if (!rows.length && !opts?.reset) return;

      const mapped = rows.map((r) => toUi(r, user.id));
      if (opts?.reset) {
        setMessages(mapped);
      } else if (mapped.length) {
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...mapped.filter((m) => !seen.has(m.id))];
        });
      }
      if (rows.length) {
        lastIdRef.current = Math.max(lastIdRef.current, ...rows.map((r) => r.id));
      }
    },
    [consultId, token, user?.id]
  );

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      const next = Number.isFinite(consultId) && consultId > 0 ? `/vet-chats/${consultId}` : '/vet-consult';
      navigate(`/auth/login?next=${encodeURIComponent(next)}`, {
        replace: true,
        state: { from: next },
      });
      return;
    }
    if (!Number.isFinite(consultId) || consultId <= 0) {
      setError('شناسه مشاوره نامعتبر است');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await loadConsult();
        if (cancelled) return;
        if (!found) {
          setError('این مشاوره پیدا نشد یا به آن دسترسی ندارید');
          setConsult(null);
          return;
        }
        setConsult(found);
        lastIdRef.current = 0;
        await syncMessages({ reset: true });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'خطا در بارگذاری چت');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id, consultId, navigate, loadConsult, syncMessages]);

  useEffect(() => {
    if (!consult || (consult.status !== 'active' && consult.status !== 'requested')) {
      return;
    }
    const timer = window.setInterval(() => {
      void syncMessages();
      void loadConsult()
        .then((next) => {
          if (next) setConsult(next);
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [consult?.status, consult?.id, syncMessages, loadConsult]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, consult?.status]);

  async function onAccept() {
    if (!token || !consult) return;
    setActing(true);
    setError(null);
    try {
      const updated = await acceptVetConsultation(consult.id, token);
      setConsult(updated);
      lastIdRef.current = 0;
      await syncMessages({ reset: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'قبول درخواست ناموفق بود');
    } finally {
      setActing(false);
    }
  }

  async function onReject() {
    if (!token || !consult) return;
    setActing(true);
    setError(null);
    try {
      await rejectVetConsultation(consult.id, token);
      navigate('/vet-consult', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setActing(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || !token || !user?.id || !consult || sending) return;
    setSending(true);
    setError(null);
    try {
      const row = await postVetConsultChatMessage(consult.id, trimmed, token);
      setMessages((prev) => [...prev, toUi(row, user.id)]);
      lastIdRef.current = Math.max(lastIdRef.current, row.id);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(draft);
    }
  }

  if (loading) {
    return (
      <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat">
        <div className="tg-chat-empty">
          <Loader2 className="tg-spin" size={28} />
          <p>در حال آماده‌سازی چت پزشک…</p>
        </div>
      </div>
    );
  }

  if (!consult) {
    return (
      <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat">
        <div className="tg-chat-empty">
          <p role="alert">{error ?? 'مشاوره پیدا نشد'}</p>
          <Link to="/vet-consult" className="tg-chat-link-btn">
            بازگشت به ارتباط با پزشک
          </Link>
        </div>
      </div>
    );
  }

  const pending = consult.status === 'requested';
  const active = consult.status === 'active';

  return (
    <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat">
      <section className="tg-thread" aria-label="چت مشاوره دامپزشک">
        <header className="tg-chat-header">
          <button
            type="button"
            className="tg-chat-back"
            aria-label="بازگشت"
            onClick={() => navigate('/vet-consult')}
          >
            <ArrowRight size={20} />
          </button>
          <div className="tg-chat-peer">
            <span className="tg-chat-peer-avatar" aria-hidden>
              <Stethoscope size={18} />
            </span>
            <div>
              <strong>{peerName}</strong>
              <small>
                {pending
                  ? isVetSide
                    ? 'درخواست جدید — قبول یا رد کنید'
                    : 'در انتظار قبول پزشک'
                  : active
                    ? 'چت مشاوره فعال'
                    : `وضعیت: ${consult.status}`}
              </small>
            </div>
          </div>
        </header>

        <div className="tg-chat-wallpaper">
          <div className="tg-chat-messages">
            {pending ? (
              <div className="pepito-vet-chat-card" role="status">
                <p>
                  {isVetSide
                    ? `بیمار ${
                        consult.patientName?.trim() || `#${consult.patientUserId}`
                      } درخواست مشاوره سریع داده است.`
                    : 'درخواستت برای پزشک ارسال شده. به‌محض قبول، چت همین‌جا باز می‌شود.'}
                </p>
                {isVetSide ? (
                  <div className="pepito-vet-chat-actions">
                    <button
                      type="button"
                      className="pepito-btn button-1"
                      disabled={acting}
                      onClick={() => void onAccept()}
                      data-testid="vet-chat-accept"
                    >
                      قبول و ورود به چت
                    </button>
                    <button
                      type="button"
                      className="pepito-btn pepito-btn--ghost"
                      disabled={acting}
                      onClick={() => void onReject()}
                      data-testid="vet-chat-reject"
                    >
                      رد
                    </button>
                  </div>
                ) : (
                  <p className="pepito-vet-chat-wait-hint">لطفاً چند لحظه صبر کن…</p>
                )}
              </div>
            ) : null}

            {messages.map((m) => (
              <div
                key={m.id}
                className={`tg-bubble ${m.from === 'me' ? 'tg-bubble--out' : 'tg-bubble--in'}`}
              >
                <p>{m.text}</p>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {error ? (
          <p className="auth-error" role="alert" style={{ margin: '0.5rem 1rem' }}>
            {error}
          </p>
        ) : null}

        {active ? (
          <form className="tg-composer-shell" onSubmit={onSubmit}>
            <div className="tg-composer tg-composer--simple" dir="ltr">
              <textarea
                dir="auto"
                rows={1}
                value={draft}
                placeholder="پیام بنویس…"
                disabled={sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                data-testid="vet-chat-input"
              />
              <button
                type="submit"
                className="tg-send-btn"
                disabled={sending || !draft.trim()}
                aria-label="ارسال"
                data-testid="vet-chat-send"
              >
                {sending ? <Loader2 size={18} className="tg-spin" /> : <Send size={18} />}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </div>
  );
}

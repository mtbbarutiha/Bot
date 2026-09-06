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
import { ArrowRight, CheckCheck, Loader2, Send, Stethoscope } from 'lucide-react';
import type { VetConsultChatMessage, VetConsultation } from '@petdate/shared';
import { userHasRole } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
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
  at: number;
};

function toUi(row: VetConsultChatMessage, myId: number): UiMsg {
  const at = Date.parse(row.createdAt);
  return {
    id: row.id,
    from: row.senderUserId === myId ? 'me' : 'peer',
    text: row.text,
    at: Number.isFinite(at) ? at : Date.now(),
  };
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function useChatViewportHeight(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const apply = () => {
      const h = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--tg-vv-height', `${Math.round(h)}px`);
    };
    apply();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      root.style.removeProperty('--tg-vv-height');
    };
  }, [active]);
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
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastIdRef = useRef(0);
  const stickToBottomRef = useRef(true);

  const isVetSide = Boolean(user && consult && user.id === consult.vetUserId);
  const isVetUser = userHasRole(user, 'vet');

  useChatViewportHeight(true);

  const peerName = useMemo(() => {
    if (!consult) return 'طرف مقابل';
    if (isVetSide) {
      return consult.patientName?.trim() || `بیمار #${consult.patientUserId}`;
    }
    return consult.vetName?.trim() || `پزشک #${consult.vetUserId}`;
  }, [consult, isVetSide]);

  const peerSub = useMemo(() => {
    if (!consult) return '';
    const pet = consult.petName?.trim();
    if (isVetSide) {
      return pet ? `پت بیمار · ${pet}` : 'درخواست مشاوره سریع';
    }
    return pet ? `مشاوره برای ${pet}` : 'مشاوره دامپزشک';
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
    [consultId, token, user?.id],
  );

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      const next =
        Number.isFinite(consultId) && consultId > 0 ? `/vet-chats/${consultId}` : '/vet-consult';
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
        stickToBottomRef.current = true;
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
          if (!next) return;
          setConsult((prev) => {
            // Never let a stale CDN/list response downgrade an active chat back to requested
            if (prev?.status === 'active' && next.status === 'requested' && prev.id === next.id) {
              return { ...next, status: 'active' };
            }
            return next;
          });
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [consult?.status, consult?.id, syncMessages, loadConsult]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottomRef.current) return;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }, [messages.length, consult?.status]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(128, Math.max(44, ta.scrollHeight))}px`;
  }, [draft, consult?.status]);

  function onScrollerScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < 80;
  }

  async function onAccept() {
    if (!token || !consult) return;
    setActing(true);
    setError(null);
    try {
      const updated = await acceptVetConsultation(consult.id, token);
      setConsult({ ...updated, status: updated.status === 'cancelled' ? updated.status : 'active' });
      lastIdRef.current = 0;
      stickToBottomRef.current = true;
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
    stickToBottomRef.current = true;
    try {
      const row = await postVetConsultChatMessage(consult.id, trimmed, token);
      setMessages((prev) => [...prev, toUi(row, user.id)]);
      lastIdRef.current = Math.max(lastIdRef.current, row.id);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
      inputRef.current?.focus();
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
      <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat" dir="rtl">
        <div className="tg-thread-empty">
          <Loader2 className="tg-spin" size={28} />
          <h2>در حال آماده‌سازی چت پزشک…</h2>
        </div>
      </div>
    );
  }

  if (!consult) {
    return (
      <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat" dir="rtl">
        <div className="tg-thread-empty">
          <BrandMark iconSize={28} />
          <h2>مشاوره پیدا نشد</h2>
          <p role="alert">{error ?? 'این گفتگو در دسترس نیست.'}</p>
          <Link to="/vet-consult" className="tg-chat-link-btn">
            بازگشت به ارتباط با پزشک
          </Link>
        </div>
      </div>
    );
  }

  const pending = consult.status === 'requested';
  const active = consult.status === 'active';
  const statusLabel = pending
    ? isVetSide
      ? 'درخواست جدید — قبول یا رد کنید'
      : 'در انتظار قبول پزشک'
    : active
      ? 'چت مشاوره فعال'
      : consult.status === 'completed'
        ? 'مشاوره پایان یافته'
        : `وضعیت: ${consult.status}`;

  return (
    <div className="tg-chat tg-chat--shell tg-chat--thread-only pepito-vet-chat" dir="rtl">
      <section className="tg-thread" aria-label="چت مشاوره دامپزشک">
        <header className="tg-chat-header">
          <button
            type="button"
            className="tg-chat-back"
            aria-label="بازگشت به پنل پزشک"
            onClick={() => navigate('/vet-consult')}
          >
            <ArrowRight size={22} strokeWidth={2.2} />
          </button>
          <div className="tg-chat-peer" role="group" aria-label={peerName}>
            <span className="tg-chat-peer-avatar" aria-hidden>
              <Stethoscope size={18} />
            </span>
            <span>
              <strong>{peerName}</strong>
              <small>
                {statusLabel}
                {peerSub ? ` · ${peerSub}` : ''}
              </small>
            </span>
          </div>
        </header>

        {pending ? (
          <div className={`tg-status-strip${isVetSide ? '' : ' is-wait'}`} role="status">
            {isVetSide
              ? 'درخواست مشاوره در انتظار پاسخ شماست'
              : 'درخواست ارسال شد — به‌محض قبول پزشک، چت باز می‌شود'}
          </div>
        ) : active ? (
          <div className="tg-status-strip" role="status">
            چت مشاوره دامپزشک فعال است
          </div>
        ) : null}

        <div className="tg-chat-wallpaper" ref={scrollerRef} onScroll={onScrollerScroll}>
          <div className="tg-chat-messages">
            {pending ? (
              <div className="pepito-vet-chat-card" role="status">
                <p className="tg-request-card-kicker">
                  {isVetSide ? 'درخواست جدید بیمار' : 'وضعیت درخواست'}
                </p>
                <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem' }}>{peerName}</h3>
                <p>
                  {isVetSide
                    ? `${
                        consult.petName?.trim()
                          ? `برای پت «${consult.petName.trim()}» `
                          : ''
                      }درخواست مشاوره سریع داده شده. قبول کنید تا چت همین‌جا باز شود.`
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
                      {acting ? 'در حال قبول…' : 'قبول و ورود به چت'}
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
                className={`tg-bubble-row${m.from === 'me' ? ' is-out' : ' is-in'}`}
              >
                <div className="tg-bubble">
                  <p className="tg-bubble-text">{m.text}</p>
                  <footer className="tg-bubble-meta">
                    <time>{formatClock(m.at)}</time>
                    {m.from === 'me' ? (
                      <CheckCheck size={14} className="tg-ticks" aria-hidden />
                    ) : null}
                  </footer>
                </div>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <p className="tg-error" role="alert">
            {error}
          </p>
        ) : null}

        {active ? (
          <div className="tg-composer-shell">
            <form className="tg-composer tg-composer--simple" dir="ltr" onSubmit={onSubmit}>
              <textarea
                ref={inputRef}
                dir="auto"
                rows={1}
                value={draft}
                placeholder="پیام به پزشک / بیمار…"
                disabled={sending}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                aria-label="متن پیام"
                enterKeyHint="send"
                data-testid="vet-chat-input"
              />
              <button
                type="submit"
                className={`tg-send${sending ? ' is-sending' : ''}`}
                disabled={sending || !draft.trim()}
                aria-label="ارسال"
                data-testid="vet-chat-send"
              >
                {sending ? <Loader2 size={18} className="tg-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        ) : pending ? (
          <div className="tg-request-composer-bar" role="status">
            {isVetSide
              ? 'برای شروع چت، درخواست را قبول یا رد کنید.'
              : 'چت بعد از قبول پزشک فعال می‌شود.'}
          </div>
        ) : (
          <div className="tg-request-composer-bar" role="status">
            این مشاوره دیگر فعال نیست.
            <Link to="/vet-consult" className="tg-chat-link-btn" style={{ marginInlineStart: 8 }}>
              بازگشت
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

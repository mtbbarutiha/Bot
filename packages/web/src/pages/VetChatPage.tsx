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
import {
  ArrowRight,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
  Send,
  Stethoscope,
  X,
} from 'lucide-react';
import {
  VET_CONSULT_REQUEST_TTL_MS,
  isPendingRequestExpired,
  userHasRole,
  type VetConsultChatMessage,
  type VetConsultation,
} from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { RequestCountdown } from '../components/RequestCountdown';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  acceptVetConsultation,
  getVetConsultation,
  listVetConsultChatMessages,
  listVetConsultations,
  postVetConsultChatMessage,
  rejectVetConsultation,
} from '../lib/api';
import {
  acceptInboxItem,
  inboxScopeForUser,
  loadInboxConversations,
  rejectInboxItem,
  type InboxConversation,
} from '../lib/inboxConversations';
import { formatTimeAgo } from '../data/mock';

const POLL_MS = 2500;
const DESKTOP_MQ = '(min-width: 860px)';

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

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(DESKTOP_MQ).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setDesktop(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return desktop;
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
  const desktop = useIsDesktop();
  const { user, token, isLoggedIn } = useAuthStore();
  const inboxScope = inboxScopeForUser(user);
  const hasThread = Number.isFinite(consultId) && consultId > 0;
  const showList = desktop || !hasThread;
  const showThread = desktop || hasThread;

  const [consult, setConsult] = useState<VetConsultation | null>(null);
  const [messages, setMessages] = useState<UiMsg[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listActionKey, setListActionKey] = useState<string | null>(null);
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

  const reloadConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      setConversations(await loadInboxConversations(user.id, user));
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'بارگذاری گفتگوها ناموفق بود');
    } finally {
      setListLoading(false);
    }
  }, [user]);

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
    void reloadConversations();
  }, [reloadConversations]);

  useEffect(() => {
    if (!isLoggedIn || !user?.id) {
      const next =
        Number.isFinite(consultId) && consultId > 0 ? `/vet-chats/${consultId}` : '/chats';
      navigate(`/auth/login?next=${encodeURIComponent(next)}`, {
        replace: true,
        state: { from: next },
      });
      return;
    }
    if (!hasThread) {
      setLoading(false);
      setConsult(null);
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
  }, [isLoggedIn, user?.id, consultId, hasThread, navigate, loadConsult, syncMessages]);

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
            if (prev?.status === 'active' && next.status === 'requested' && prev.id === next.id) {
              return { ...next, status: 'active' };
            }
            return next;
          });
        })
        .catch(() => undefined);
      void reloadConversations();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [consult?.status, consult?.id, syncMessages, loadConsult, reloadConversations]);

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

  async function onAcceptFromList(item: InboxConversation) {
    if (!user?.id || listActionKey) return;
    setListActionKey(item.key);
    setListError(null);
    try {
      await acceptInboxItem(item, user.id, token);
      await reloadConversations();
      navigate(item.href);
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'قبول درخواست ناموفق بود');
    } finally {
      setListActionKey(null);
    }
  }

  async function onRejectFromList(item: InboxConversation) {
    if (!user?.id || listActionKey) return;
    setListActionKey(item.key);
    setListError(null);
    try {
      await rejectInboxItem(item, user.id, token);
      await reloadConversations();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setListActionKey(null);
    }
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
      void reloadConversations();
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
      navigate('/chats', { replace: true });
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
      void reloadConversations();
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

  function onBack() {
    if (!desktop && hasThread) {
      navigate('/chats');
      return;
    }
    navigate(inboxScope === 'vet' ? '/vet-consult' : '/chats');
  }

  const pending =
    consult?.status === 'requested' &&
    !isPendingRequestExpired(consult.createdAt, VET_CONSULT_REQUEST_TTL_MS);
  const expired =
    consult?.status === 'expired' ||
    (consult?.status === 'requested' &&
      isPendingRequestExpired(consult.createdAt, VET_CONSULT_REQUEST_TTL_MS));
  const active = consult?.status === 'active';
  const incomingPending = Boolean(pending && isVetSide);

  const shellClass = [
    'tg-chat',
    'tg-chat--shell',
    'pepito-vet-chat',
    showList && showThread ? 'tg-chat--split' : '',
    !showList && showThread ? 'tg-chat--thread-only' : '',
    showList && !showThread ? 'tg-chat--list-only' : '',
    pending ? 'tg-chat--pending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusLabel = expired
    ? 'درخواست منقضی شده'
    : pending
      ? isVetSide
        ? 'درخواست مشاوره جدید'
        : 'منتظر پاسخ پزشک'
      : active
        ? 'چت مشاوره فعال'
        : consult?.status === 'completed'
          ? 'مشاوره پایان یافته'
          : consult
            ? `وضعیت: ${consult.status}`
            : '';

  return (
    <div className={shellClass} dir="rtl">
      {showList ? (
        <aside className="tg-chat-list" aria-label="فهرست گفتگوها">
          <header className="tg-chat-list-head">
            <Link
              to={inboxScope === 'vet' ? '/vet-consult' : '/explore#requests'}
              className="tg-icon-btn"
              aria-label={inboxScope === 'vet' ? 'بازگشت به پنل پزشک' : 'بازگشت به همبازی'}
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <p className="tg-chat-list-kicker">پت‌دیت</p>
              <h1>{inboxScope === 'vet' ? 'گفتگوهای پزشک' : 'گفتگوها'}</h1>
            </div>
            <button
              type="button"
              className="tg-icon-btn"
              onClick={() => void reloadConversations()}
              aria-label="بروزرسانی فهرست"
              title="بروزرسانی"
            >
              <RefreshCw size={18} />
            </button>
          </header>

          {listError ? <p className="tg-error tg-error--inset">{listError}</p> : null}

          <div className="tg-chat-list-body">
            {listLoading ? (
              <div className="tg-chat-list-empty">
                <div className="tg-skeleton tg-skeleton--row" />
                <div className="tg-skeleton tg-skeleton--row" />
                <div className="tg-skeleton tg-skeleton--row" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="tg-chat-list-empty">
                <BrandMark iconSize={28} />
                <h2>هنوز گفتگویی نیست</h2>
                <p>
                  {inboxScope === 'vet'
                    ? 'درخواست‌ها و چت‌های مشاوره دامپزشکی این نقش اینجا می‌آیند.'
                    : 'درخواست‌های همبازی و مشاوره‌های شما به‌عنوان صاحب پت اینجا می‌آیند.'}
                </p>
                <Link
                  to={inboxScope === 'vet' ? '/vet-consult' : '/explore'}
                  className="tg-chat-link-btn"
                >
                  {inboxScope === 'vet' ? 'رفتن به پنل پزشک' : 'پیدا کردن همبازی'}
                </Link>
              </div>
            ) : (
              <ul className="tg-chat-list-items">
                {conversations.map((c) => {
                  const activeRow = c.key === `vet:${consultId}`;
                  const busy = listActionKey === c.key;
                  const peer = c.peerPet;
                  return (
                    <li key={c.key} className="tg-chat-list-row">
                      <button
                        type="button"
                        className={`tg-chat-list-item${activeRow ? ' is-active' : ''}${
                          c.ended ? ' is-ended' : ''
                        }${c.pending ? ' is-pending' : ''}`}
                        onClick={() => navigate(c.href)}
                      >
                        {peer ? (
                          <PetAvatar
                            type={peer.type}
                            size="md"
                            imageUrl={peer.imageUrl}
                            name={peer.name}
                          />
                        ) : (
                          <span className="tg-chat-list-icon" aria-hidden>
                            <Stethoscope size={22} strokeWidth={2} />
                          </span>
                        )}
                        <span className="tg-chat-list-meta">
                          <strong>
                            {c.title}
                            <em className="tg-chat-list-kind">
                              {c.kind === 'vet' ? 'مشاوره' : 'همبازی'}
                            </em>
                          </strong>
                          <small>{c.preview}</small>
                        </span>
                        <time className="tg-chat-list-time">
                          {formatTimeAgo(c.lastActivityAt || c.createdAt)}
                        </time>
                      </button>
                      {c.canDecide ? (
                        <div className="tg-chat-list-actions">
                          <button
                            type="button"
                            className="tg-chat-list-accept"
                            disabled={Boolean(busy)}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onAcceptFromList(c);
                            }}
                          >
                            <Check size={14} strokeWidth={2.5} />
                            قبول
                          </button>
                          <button
                            type="button"
                            className="tg-chat-list-reject"
                            disabled={Boolean(busy)}
                            onClick={(e) => {
                              e.stopPropagation();
                              void onRejectFromList(c);
                            }}
                          >
                            <X size={14} strokeWidth={2.5} />
                            رد
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      ) : null}

      {showThread ? (
        <section className="tg-thread" aria-label="چت مشاوره دامپزشک">
          {!hasThread ? (
            <div className="tg-thread-empty">
              <BrandMark iconSize={36} />
              <h2>{inboxScope === 'vet' ? 'مشاوره‌ای را شروع کن' : 'همبازی پیدا کن'}</h2>
              <Link
                to={inboxScope === 'vet' ? '/vet-consult' : '/explore'}
                className="tg-chat-link-btn"
              >
                {inboxScope === 'vet' ? 'رفتن به پنل پزشک' : 'پیدا کردن همبازی'}
              </Link>
            </div>
          ) : loading ? (
            <div className="tg-thread-empty">
              <Loader2 className="tg-spin" size={28} />
              <h2>در حال آماده‌سازی چت پزشک…</h2>
            </div>
          ) : !consult ? (
            <div className="tg-thread-empty">
              <BrandMark iconSize={28} />
              <h2>مشاوره پیدا نشد</h2>
              <p role="alert">{error ?? 'این گفتگو در دسترس نیست.'}</p>
              <Link to="/chats" className="tg-chat-link-btn">
                بازگشت به گفتگوها
              </Link>
            </div>
          ) : (
            <>
              <header className="tg-chat-header">
                <button
                  type="button"
                  className="tg-chat-back"
                  aria-label="بازگشت به گفتگوها"
                  onClick={onBack}
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
                  {' · '}
                  <RequestCountdown
                    createdAt={consult.createdAt}
                    ttlMs={VET_CONSULT_REQUEST_TTL_MS}
                    onExpire={() => {
                      setConsult((prev) => (prev ? { ...prev, status: 'expired' } : prev));
                      void reloadConversations();
                    }}
                  />
                </div>
              ) : active ? (
                <div className="tg-status-strip" role="status">
                  چت مشاوره دامپزشک فعال است
                </div>
              ) : null}

              <div className="tg-chat-wallpaper" ref={scrollerRef} onScroll={onScrollerScroll}>
                <div className="tg-chat-messages">
                  <article
                    className={`tg-request-card${
                      isVetSide ? ' is-incoming' : ' is-outgoing'
                    }${pending ? ' is-pending' : ''}${expired ? ' is-rejected' : ''}`}
                    aria-label="کارت درخواست مشاوره"
                  >
                    <div className="tg-request-card-body">
                      <p className="tg-request-card-kicker">
                        {expired
                          ? 'درخواست منقضی شد'
                          : incomingPending
                            ? 'درخواست مشاوره جدید'
                            : pending
                              ? 'درخواست مشاوره ارسال شد'
                              : active
                                ? 'مشاوره فعال'
                                : 'درخواست مشاوره'}
                      </p>
                      <h3>
                        {peerName}
                        {consult.petName?.trim() ? ` · ${consult.petName.trim()}` : ''}
                      </h3>
                      <ul className="tg-request-card-meta">
                        <li>
                          #{consult.id} · {statusLabel}
                        </li>
                        {consult.petSpecies || consult.petBreed ? (
                          <li>
                            {[consult.petSpecies, consult.petBreed].filter(Boolean).join(' · ')}
                          </li>
                        ) : null}
                        {consult.patientCity ? <li>📍 {consult.patientCity}</li> : null}
                      </ul>
                      {incomingPending ? (
                        <div className="tg-request-card-actions">
                          <button
                            type="button"
                            className="tg-request-accept"
                            disabled={acting}
                            onClick={() => void onAccept()}
                            data-testid="vet-chat-accept"
                          >
                            <Check size={16} strokeWidth={2.5} />
                            {acting ? '…' : 'قبول'}
                          </button>
                          <button
                            type="button"
                            className="tg-request-reject"
                            disabled={acting}
                            onClick={() => void onReject()}
                            data-testid="vet-chat-reject"
                          >
                            <X size={16} strokeWidth={2.5} />
                            رد
                          </button>
                        </div>
                      ) : pending ? (
                        <p className="tg-request-card-wait" role="status">
                          منتظر پاسخ پزشک باش.
                          {' · '}
                          <RequestCountdown
                            createdAt={consult.createdAt}
                            ttlMs={VET_CONSULT_REQUEST_TTL_MS}
                          />
                        </p>
                      ) : expired ? (
                        <p className="tg-request-card-wait" role="status">
                          مهلت ۲ دقیقه‌ای این درخواست تمام شد.
                          {!isVetSide ? (
                            <>
                              {' '}
                              <Link to="/vet-consult" className="tg-chat-link-btn">
                                درخواست مجدد
                              </Link>
                            </>
                          ) : null}
                        </p>
                      ) : active ? (
                        <p className="tg-request-card-wait" role="status">
                          پذیرفته شد — می‌توانی پیام بفرستی.
                        </p>
                      ) : null}
                    </div>
                  </article>

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
                      placeholder="پیام…"
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
              ) : (
                <div className="tg-request-composer-bar" role="status">
                  {incomingPending
                    ? 'برای شروع چت، درخواست را قبول یا رد کن.'
                    : expired
                      ? 'این درخواست منقضی شده است.'
                      : pending
                        ? 'چت بعد از قبول پزشک فعال می‌شود.'
                        : 'این مشاوره دیگر فعال نیست.'}
                  {expired && !isVetSide ? (
                    <Link to="/vet-consult" className="tg-chat-link-btn" style={{ marginInlineStart: 8 }}>
                      درخواست مجدد
                    </Link>
                  ) : null}
                </div>
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

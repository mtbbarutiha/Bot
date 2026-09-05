import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  LockOpen,
  MessageCircle,
  PawPrint,
  Phone,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  clearPlaydateChatMessages,
  endPlaydateChat,
  getPlaydateRequest,
  listPlaydateChatMessages,
  playdateChatMediaUrl,
  postPlaydateChatMessage,
  setPlaydateChatSecure,
} from '../lib/api';
import type { PlaydateChatMediaKind, PlaydateChatMessage } from '@petdate/shared';
import { playdateToMatchRequest } from '../lib/playdateMap';
import {
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
  type MatchRequest,
} from '../types';

type ChatMsg = {
  id: string;
  numericId: number;
  from: 'me' | 'peer';
  text: string;
  at: number;
  mediaKind?: PlaydateChatMediaKind | null;
  telegramFileId?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

type Panel = 'none' | 'owner' | 'pet';

const POLL_MS = 2500;

function toUiMessage(row: PlaydateChatMessage, myUserId: number): ChatMsg {
  const at = Date.parse(row.createdAt);
  return {
    id: String(row.id),
    numericId: row.id,
    from: row.senderUserId === myUserId ? 'me' : 'peer',
    text: row.text,
    at: Number.isFinite(at) ? at : Date.now(),
    mediaKind: row.mediaKind,
    telegramFileId: row.telegramFileId,
    mimeType: row.mimeType,
    fileName: row.fileName,
  };
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function mediaLabel(kind?: PlaydateChatMediaKind | null) {
  switch (kind) {
    case 'photo':
      return 'تصویر';
    case 'video':
    case 'animation':
    case 'video_note':
      return 'ویدیو';
    case 'voice':
      return 'پیام صوتی';
    case 'audio':
      return 'فایل صوتی';
    case 'document':
      return 'فایل';
    case 'sticker':
      return 'استیکر';
    default:
      return 'رسانه';
  }
}

export function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();
  const myUserId = authUser?.id;

  const [match, setMatch] = useState<MatchRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [secure, setSecure] = useState(false);
  const [contactAdded, setContactAdded] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [wiping, setWiping] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lastMsgIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const id = Number(matchId);
      if (!Number.isFinite(id) || !myUserId) {
        if (!cancelled) {
          setMatch(null);
          setLoading(false);
        }
        return;
      }
      try {
        const req = await getPlaydateRequest(id);
        if (!req || req.status !== 'accepted') {
          if (!cancelled) setMatch(null);
          return;
        }
        const owns =
          req.toUserId === myUserId ||
          req.fromUserId === myUserId ||
          req.toPet?.ownerId === myUserId ||
          req.fromPet?.ownerId === myUserId;
        if (!owns) {
          if (!cancelled) setMatch(null);
          return;
        }
        if (!cancelled) {
          setMatch(playdateToMatchRequest(req, myUserId));
          setSecure(Boolean(req.chatSecure));
          setEnded(Boolean(req.chatEnded));
          if (req.chatEnded) {
            setMessages([]);
            lastMsgIdRef.current = 0;
          }
        }
      } catch {
        if (!cancelled) setMatch(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [matchId, myUserId]);

  useEffect(() => {
    if (!match) return;
    setMessages([]);
    lastMsgIdRef.current = 0;
    setContactAdded(false);
    setPanel('none');
    setDraft('');
    setSendError(null);
    setActionError(null);
    setWiped(false);
  }, [match?.id]);

  useEffect(() => {
    if (!match || !myUserId || ended) return;
    let cancelled = false;

    async function pull(initial = false) {
      try {
        const rows = await listPlaydateChatMessages(
          match!.id,
          myUserId!,
          initial ? undefined : lastMsgIdRef.current || undefined
        );
        if (cancelled || !rows.length) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const mapped = rows
            .map((row) => toUiMessage(row, myUserId!))
            .filter((m) => !seen.has(m.id));
          if (!mapped.length) return prev;
          return initial && !prev.length ? mapped : [...prev, ...mapped];
        });
        lastMsgIdRef.current = Math.max(lastMsgIdRef.current, ...rows.map((r) => r.id));
      } catch {
        /* keep local */
      }
    }

    async function pullMeta() {
      try {
        const req = await getPlaydateRequest(match!.id);
        if (cancelled || !req) return;
        setSecure(Boolean(req.chatSecure));
        if (req.chatEnded) {
          setEnded(true);
          setMessages([]);
          lastMsgIdRef.current = 0;
        }
      } catch {
        /* ignore */
      }
    }

    void pull(true);
    void pullMeta();
    const timer = window.setInterval(() => {
      void pull(false);
      void pullMeta();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [match?.id, myUserId, ended]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, ended]);

  const peerPet = match?.fromPet;
  const peerOwnerName = peerPet?.ownerName || 'صاحب پت';

  const secureHint = useMemo(
    () =>
      secure
        ? 'چت امن روشن است — پیام‌ها، عکس و ویس در تلگرام قابل ذخیره یا فوروارد نیستند.'
        : 'برای محرمانگی بیشتر، چت امن را روشن کنید (هم‌زمان با طرف تلگرامی).',
    [secure],
  );

  if (loading) {
    return (
      <div className="chat-page chat-page--empty">
        <BrandMark iconSize={26} className="chat-empty-brand" />
        <h1>در حال باز کردن چت…</h1>
      </div>
    );
  }

  if (!match || !peerPet) {
    return (
      <div className="chat-page chat-page--empty">
        <BrandMark iconSize={26} className="chat-empty-brand" />
        <h1>چت پیدا نشد</h1>
        <p>این گفتگو تمام شده یا هنوز پذیرفته نشده است.</p>
        <Link to="/matches" className="chat-btn chat-btn--primary">
          بازگشت به درخواست‌ها
        </Link>
      </div>
    );
  }

  async function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (ended || sending || !myUserId || !match) return;
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setSendError(null);
    setDraft('');
    try {
      const saved = await postPlaydateChatMessage(match.id, myUserId, text);
      const ui = toUiMessage(saved, myUserId);
      setMessages((prev) => (prev.some((m) => m.id === ui.id) ? prev : [...prev, ui]));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, saved.id);
    } catch (err) {
      setDraft(text);
      setSendError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
    }
  }

  async function toggleSecure() {
    if (!myUserId || !match || ended) return;
    const next = !secure;
    setSecure(next);
    setActionError(null);
    try {
      await setPlaydateChatSecure(match.id, myUserId, next);
    } catch (err) {
      setSecure(!next);
      setActionError(err instanceof Error ? err.message : 'تغییر چت امن ناموفق بود');
    }
  }

  async function endChat() {
    if (!myUserId || !match || ending || ended) return;
    setEnding(true);
    setActionError(null);
    setEnded(true);
    setPanel('none');
    setMessages([]);
    lastMsgIdRef.current = 0;
    try {
      await endPlaydateChat(match.id, myUserId);
    } catch (err) {
      try {
        await clearPlaydateChatMessages(match.id, myUserId);
      } catch {
        /* local end still ok */
      }
      setActionError(err instanceof Error ? err.message : 'قطع چت روی سرور ناموفق بود');
    } finally {
      setEnding(false);
    }
  }

  async function wipeConversation() {
    if (!myUserId || !match || wiping) return;
    setWiping(true);
    setActionError(null);
    try {
      await clearPlaydateChatMessages(match.id, myUserId);
      setMessages([]);
      lastMsgIdRef.current = 0;
      setWiped(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'پاک‌کردن گفتگو ناموفق بود');
    } finally {
      setWiping(false);
    }
  }

  function renderMedia(msg: ChatMsg) {
    if (!msg.mediaKind || !msg.telegramFileId || !myUserId || !match) return null;
    const src = playdateChatMediaUrl(match.id, msg.numericId, myUserId);
    if (msg.mediaKind === 'photo' || msg.mediaKind === 'sticker') {
      return (
        <a className="chat-media-link" href={src} target="_blank" rel="noreferrer">
          <img className="chat-media-image" src={src} alt={mediaLabel(msg.mediaKind)} />
        </a>
      );
    }
    if (
      msg.mediaKind === 'video' ||
      msg.mediaKind === 'animation' ||
      msg.mediaKind === 'video_note'
    ) {
      return (
        <video className="chat-media-video" src={src} controls playsInline>
          ویدیو پشتیبانی نمی‌شود
        </video>
      );
    }
    if (msg.mediaKind === 'voice' || msg.mediaKind === 'audio') {
      return <audio className="chat-media-audio" src={src} controls preload="metadata" />;
    }
    return (
      <a className="chat-media-file" href={src} target="_blank" rel="noreferrer">
        📎 {msg.fileName || mediaLabel(msg.mediaKind)}
      </a>
    );
  }

  return (
    <div
      className={`chat-page${secure ? ' chat-page--secure' : ''}${ended ? ' chat-page--ended' : ''}`}
    >
      <div className="chat-shell">
        <section className="chat-stage" aria-label="گفتگو">
          <header className="chat-top">
            <div className="chat-top-main">
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => navigate('/matches')}
                aria-label="بازگشت"
              >
                <ArrowRight size={20} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                className="chat-peer-chip"
                onClick={() => setPanel(panel === 'owner' ? 'none' : 'owner')}
              >
                <PetAvatar
                  type={peerPet.type}
                  size="sm"
                  imageUrl={peerPet.imageUrl}
                  name={peerPet.name}
                />
                <span>
                  <strong>{peerOwnerName}</strong>
                  <small>
                    {peerPet.name} · {peerPet.neighborhood}
                  </small>
                </span>
              </button>
            </div>

            <div className="chat-top-actions" role="toolbar" aria-label="ابزار چت">
              <button
                type="button"
                className={`chat-action${secure ? ' is-on' : ''}`}
                onClick={() => void toggleSecure()}
                disabled={ended}
                aria-pressed={secure}
              >
                {secure ? <Lock size={16} /> : <LockOpen size={16} />}
                <span>{secure ? 'چت امن: روشن' : 'چت امن'}</span>
              </button>
              <button
                type="button"
                className={`chat-action${contactAdded ? ' is-on' : ''}`}
                onClick={() => setContactAdded(true)}
                disabled={ended || contactAdded}
              >
                <UserPlus size={16} />
                <span>{contactAdded ? 'مخاطب شد' : 'افزودن مخاطب'}</span>
              </button>
              <button
                type="button"
                className={`chat-action${panel === 'owner' ? ' is-on' : ''}`}
                onClick={() => setPanel(panel === 'owner' ? 'none' : 'owner')}
              >
                <UserRound size={16} />
                <span>پروفایل طرف</span>
              </button>
              <button
                type="button"
                className={`chat-action${panel === 'pet' ? ' is-on' : ''}`}
                onClick={() => setPanel(panel === 'pet' ? 'none' : 'pet')}
              >
                <PawPrint size={16} />
                <span>پروفایل پت</span>
              </button>
              <button
                type="button"
                className="chat-action chat-action--danger"
                onClick={() => void endChat()}
                disabled={ended || ending}
              >
                <Trash2 size={16} />
                <span>{ending ? 'در حال قطع…' : 'قطع چت'}</span>
              </button>
            </div>
          </header>

          <div className={`chat-secure-banner${secure ? ' is-on' : ''}`}>
            <Shield size={16} strokeWidth={2.2} />
            <p>{secureHint}</p>
          </div>

          {actionError ? <p className="chat-send-error">{actionError}</p> : null}

          <div className="chat-stream" ref={scrollerRef}>
            {!ended && messages.length === 0 && (
              <div className="chat-start-note">
                <MessageCircle size={22} />
                <p>گفتگو با {peerOwnerName} شروع شد. برای هماهنگی همبازی پیام بفرستید.</p>
              </div>
            )}

            {!ended &&
              messages.map((msg) => {
                const showText = Boolean(msg.text) && !/^\[(تصویر|ویدیو|پیام صوتی|فایل صوتی|فایل|استیکر|رسانه)\]$/.test(msg.text);
                return (
                  <div
                    key={msg.id}
                    className={`chat-bubble-row${msg.from === 'me' ? ' is-me' : ' is-peer'}`}
                  >
                    <div
                      className={`chat-bubble${secure ? ' is-protected' : ''}${
                        msg.mediaKind ? ' has-media' : ''
                      }`}
                    >
                      {renderMedia(msg)}
                      {showText ? <p>{msg.text}</p> : null}
                      {msg.mediaKind && !showText ? (
                        <span className="chat-media-caption">{mediaLabel(msg.mediaKind)}</span>
                      ) : null}
                      <time>{formatClock(msg.at)}</time>
                      {secure && (
                        <span className="chat-lock-dot" aria-hidden>
                          <Lock size={10} />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

            {ended && (
              <div className="chat-ended-panel">
                <div className="chat-ended-orb" aria-hidden />
                <BrandMark iconSize={34} className="chat-ended-brand" />
                <h2>چت همبازی پایان یافت</h2>
                <p>
                  {wiped
                    ? 'گفتگو به‌طور کامل پاک شد.'
                    : 'چت قطع شد. برای پاک‌کردن کامل پیام‌ها، دکمه پایین صفحه را بزنید.'}
                </p>
                <div className="chat-ended-actions">
                  <Link to="/matches" className="chat-btn chat-btn--primary">
                    بازگشت به درخواست‌ها
                  </Link>
                  <Link to={`/pets/${peerPet.id}`} className="chat-btn chat-btn--ghost">
                    مشاهده پروفایل پت
                  </Link>
                </div>
              </div>
            )}
          </div>

          {ended && (
            <div className="chat-wipe-bar">
              <button
                type="button"
                className="chat-btn chat-btn--danger chat-wipe-btn"
                onClick={() => void wipeConversation()}
                disabled={wiping || wiped}
              >
                <Trash2 size={18} />
                {wiped ? 'گفتگو کاملاً پاک شد' : wiping ? 'در حال پاک‌کردن…' : 'پاک کردن کل گفتگو'}
              </button>
            </div>
          )}

          {!ended && (
            <>
              {sendError ? <p className="chat-send-error">{sendError}</p> : null}
              <form className="chat-composer" onSubmit={(e) => void sendMessage(e)}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={secure ? 'پیام امن بنویسید…' : 'پیام بنویسید…'}
                  aria-label="متن پیام"
                />
                <button type="submit" className="chat-send" disabled={!draft.trim() || sending}>
                  ارسال
                </button>
              </form>
            </>
          )}
        </section>

        <aside
          className={`chat-rail${panel !== 'none' ? ' is-open' : ''}`}
          aria-label="جزئیات طرف مقابل"
        >
          <div className="chat-rail-inner">
            <div className="chat-rail-head">
              <BrandMark iconSize={22} />
              <button
                type="button"
                className="chat-icon-btn"
                onClick={() => setPanel('none')}
                aria-label="بستن پنل"
              >
                <X size={18} />
              </button>
            </div>

            {(panel === 'owner' || panel === 'none') && (
              <div className={`chat-profile-block${panel === 'owner' ? ' is-focus' : ''}`}>
                <div className="chat-profile-hero chat-profile-hero--owner">
                  <span className="chat-profile-kicker">پروفایل طرف مقابل</span>
                  <h2>{peerOwnerName}</h2>
                  <p>
                    صاحب {peerPet.name} در {peerPet.neighborhood}، {peerPet.city}
                  </p>
                </div>
                <ul className="chat-profile-facts">
                  <li>
                    <strong>شهر</strong>
                    <span>{peerPet.city}</span>
                  </li>
                  <li>
                    <strong>محله</strong>
                    <span>{peerPet.neighborhood}</span>
                  </li>
                  <li>
                    <strong>پت</strong>
                    <span>{peerPet.name}</span>
                  </li>
                </ul>
                <div className="chat-profile-cta">
                  <button
                    type="button"
                    className="chat-btn chat-btn--primary"
                    onClick={() => setContactAdded(true)}
                    disabled={contactAdded}
                  >
                    <UserPlus size={16} />
                    {contactAdded ? 'به مخاطبین اضافه شد' : 'افزودن مخاطب'}
                  </button>
                  <button type="button" className="chat-btn chat-btn--ghost" disabled>
                    <Phone size={16} />
                    تماس بعد از هماهنگی
                  </button>
                </div>
              </div>
            )}

            {(panel === 'pet' || panel === 'none') && (
              <div className={`chat-profile-block${panel === 'pet' ? ' is-focus' : ''}`}>
                <div
                  className="chat-pet-cover"
                  style={{ backgroundImage: `url(${peerPet.imageUrl})` }}
                >
                  <div className="chat-pet-cover-shade">
                    <span className="chat-profile-kicker">پروفایل پت</span>
                    <h2>
                      {peerPet.emoji} {peerPet.name}
                    </h2>
                    <p>
                      {PET_TYPE_LABELS[peerPet.type]} · {peerPet.breed}
                    </p>
                  </div>
                </div>
                <ul className="chat-profile-facts">
                  <li>
                    <strong>سن</strong>
                    <span>{formatAge(peerPet)}</span>
                  </li>
                  <li>
                    <strong>جنسیت</strong>
                    <span>{PET_GENDER_LABELS[peerPet.gender]}</span>
                  </li>
                  <li>
                    <strong>جثه</strong>
                    <span>{PET_SIZE_LABELS[peerPet.size]}</span>
                  </li>
                  <li>
                    <strong>واکسن</strong>
                    <span>{peerPet.vaccinated ? 'زده' : 'نزده'}</span>
                  </li>
                </ul>
                {peerPet.bio && <p className="chat-pet-bio">{peerPet.bio}</p>}
                <Link to={`/pets/${peerPet.id}`} className="chat-btn chat-btn--primary">
                  مشاهده کامل پروفایل پت
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

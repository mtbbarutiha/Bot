import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, CheckCheck, Paperclip, Send, X } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { useAuthStore } from '../hooks/useAuthStore';
import {
  addUserContact,
  clearPlaydateChatMessages,
  endPlaydateChat,
  getPlaydateRequest,
  listPlaydateChatMessages,
  playdateChatMediaUrl,
  postPlaydateChatMessage,
  setPlaydateChatSecure,
  uploadPlaydateChatFile,
} from '../lib/api';
import type { PlaydateChatMediaKind, PlaydateChatMessage } from '@petdate/shared';
import { playdateToMatchRequest } from '../lib/playdateMap';
import {
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
  type MatchRequest,
} from '../types';

/** Same labels as Telegram owner-chat reply keyboard. */
const TG_BTNS = {
  secureOn: '🔒 چت امن',
  secureOff: '🔓 خاموش‌کردن چت امن',
  peerProfile: '👤 پروفایل طرف مقابل',
  petProfile: '🐾 مشاهده پروفایل پت',
  addContact: '➕ افزودن مخاطب',
  end: '🔌 قطع چت همبازی',
} as const;

const CHAT_WIPE_HINT =
  '🗑 لطفاً کل این گفتگو را پاک کنید تا اثری از پیام‌ها (متن، عکس، ویس و …) نماند.';

const POLL_MS = 2500;
const MAX_ATTACH_BYTES = 15 * 1024 * 1024;

type ChatMsg = {
  id: string;
  numericId: number;
  from: 'me' | 'peer' | 'system';
  text: string;
  at: number;
  mediaKind?: PlaydateChatMediaKind | null;
  telegramFileId?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

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
    storageKey: row.storageKey,
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

function systemMessage(text: string): ChatMsg {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    numericId: 0,
    from: 'system',
    text,
    at: Date.now(),
  };
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
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [ending, setEnding] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [infoCard, setInfoCard] = useState<'none' | 'owner' | 'pet'>('none');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMsgIdRef = useRef(0);
  const bootstrappedRef = useRef<number | null>(null);

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
    if (bootstrappedRef.current === match.id) return;
    bootstrappedRef.current = match.id;
    setMessages([]);
    lastMsgIdRef.current = 0;
    setContactAdded(false);
    setDraft('');
    setSendError(null);
    setActionError(null);
    setWiped(false);
    setInfoCard('none');
    setPendingFile(null);
    setPendingPreview(null);
    if (!ended) {
      setMessages([
        systemMessage('💬 چت همبازی فعال شد — از دکمه‌های پایین مثل تلگرام استفاده کن'),
      ]);
    }
  }, [match?.id, ended]);

  useEffect(() => {
    if (!match || !myUserId || ended) return;
    let cancelled = false;

    async function pull(initial = false) {
      try {
        const rows = await listPlaydateChatMessages(
          match!.id,
          myUserId!,
          initial ? undefined : lastMsgIdRef.current || undefined,
        );
        if (cancelled || !rows.length) return;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          const mapped = rows
            .map((row) => toUiMessage(row, myUserId!))
            .filter((m) => !seen.has(m.id));
          if (!mapped.length) return prev;
          return [...prev, ...mapped];
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
        setSecure((prev) => {
          const next = Boolean(req.chatSecure);
          if (prev !== next) {
            setMessages((msgs) => [
              ...msgs,
              systemMessage(
                next
                  ? '🔒 طرف مقابل چت امن را فعال کرد.\nپیام‌های این گفتگو قابل ذخیره یا فوروارد نیستند.'
                  : '🔓 طرف مقابل چت امن را خاموش کرد.',
              ),
            ]);
          }
          return next;
        });
        if (req.chatEnded) {
          setEnded(true);
          setMessages((msgs) => [
            ...msgs,
            systemMessage(['🔌 چت همبازی قطع شد.', '', CHAT_WIPE_HINT].join('\n')),
          ]);
        }
      } catch {
        /* ignore */
      }
    }

    void pull(true);
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
  }, [messages, ended, infoCard]);

  useEffect(() => {
    if (!pendingFile || !pendingFile.type.startsWith('image/')) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const peerPet = match?.fromPet;
  const peerOwnerName = peerPet?.ownerName || 'صاحب پت';
  const peerOwnerId = peerPet?.ownerId;
  const secureBtnLabel = secure ? TG_BTNS.secureOff : TG_BTNS.secureOn;

  if (loading) {
    return (
      <div className="tg-chat tg-chat--empty">
        <BrandMark iconSize={26} />
        <h1>در حال باز کردن چت…</h1>
      </div>
    );
  }

  if (!match || !peerPet) {
    return (
      <div className="tg-chat tg-chat--empty">
        <BrandMark iconSize={26} />
        <h1>چت پیدا نشد</h1>
        <p>این گفتگو تمام شده یا هنوز پذیرفته نشده است.</p>
        <Link to="/explore#requests" className="tg-chat-link-btn">
          بازگشت به همبازی
        </Link>
      </div>
    );
  }

  function clearPendingFile() {
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function onPickFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    if (file.size > MAX_ATTACH_BYTES) {
      setSendError('حجم فایل بیش از حد مجاز است (حداکثر ۱۵ مگابایت)');
      clearPendingFile();
      return;
    }
    setSendError(null);
    setPendingFile(file);
  }

  async function sendMessage(e?: FormEvent) {
    e?.preventDefault();
    if (ended || sending || !myUserId || !match) return;
    const text = draft.trim();
    const file = pendingFile;
    if (!text && !file) return;
    setSending(true);
    setSendError(null);
    setDraft('');
    clearPendingFile();
    try {
      const saved = file
        ? await uploadPlaydateChatFile(match.id, myUserId, file, text)
        : await postPlaydateChatMessage(match.id, myUserId, text);
      const ui = toUiMessage(saved, myUserId);
      setMessages((prev) => (prev.some((m) => m.id === ui.id) ? prev : [...prev, ui]));
      lastMsgIdRef.current = Math.max(lastMsgIdRef.current, saved.id);
    } catch (err) {
      if (text) setDraft(text);
      if (file) setPendingFile(file);
      setSendError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  async function toggleSecure() {
    if (!myUserId || !match || ended) return;
    const next = !secure;
    setSecure(next);
    setActionError(null);
    setMessages((prev) => [
      ...prev,
      systemMessage(
        next
          ? '🔒 چت امن فعال شد.\nاز این به بعد پیام‌ها (متن، عکس، ویس و …) قابل ذخیره یا فوروارد نیستند.'
          : '🔓 چت امن خاموش شد. پیام‌های بعدی مثل قبل قابل ذخیره هستند.',
      ),
    ]);
    try {
      await setPlaydateChatSecure(match.id, myUserId, next);
    } catch (err) {
      setSecure(!next);
      setActionError(err instanceof Error ? err.message : 'تغییر چت امن ناموفق بود');
    }
  }

  async function addContact() {
    if (!myUserId || !peerOwnerId || ended || contactAdded) return;
    setActionError(null);
    try {
      await addUserContact(myUserId, peerOwnerId);
      setContactAdded(true);
      setMessages((prev) => [...prev, systemMessage('➕ مخاطب با موفقیت اضافه شد.')]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'افزودن مخاطب ناموفق بود';
      if (/قبل|already|exists/i.test(msg)) {
        setContactAdded(true);
        setMessages((prev) => [...prev, systemMessage('این شخص از قبل در مخاطبینت بود.')]);
      } else {
        setActionError(msg);
      }
    }
  }

  async function endChat() {
    if (!myUserId || !match || ending || ended) return;
    setEnding(true);
    setActionError(null);
    setEnded(true);
    setInfoCard('none');
    setMessages((prev) => [
      ...prev,
      systemMessage(
        [
          'چت همبازی پایان یافت.',
          '',
          CHAT_WIPE_HINT,
          secure ? 'چت امن فعال بود — حتماً گفتگو را پاک کن.' : null,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    ]);
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
      setMessages([systemMessage('🗑 گفتگو به‌طور کامل پاک شد.')]);
      lastMsgIdRef.current = 0;
      setWiped(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'پاک‌کردن گفتگو ناموفق بود');
    } finally {
      setWiping(false);
    }
  }

  function renderMedia(msg: ChatMsg) {
    const hasFile = Boolean(msg.telegramFileId || msg.storageKey);
    if (!msg.mediaKind || !hasFile || !myUserId || !match) return null;
    const src = playdateChatMediaUrl(match.id, msg.numericId, myUserId);
    if (msg.mediaKind === 'photo' || msg.mediaKind === 'sticker') {
      return (
        <a className="tg-media-link" href={src} target="_blank" rel="noreferrer">
          <img className="tg-media-image" src={src} alt={mediaLabel(msg.mediaKind)} />
        </a>
      );
    }
    if (
      msg.mediaKind === 'video' ||
      msg.mediaKind === 'animation' ||
      msg.mediaKind === 'video_note'
    ) {
      return (
        <video className="tg-media-video" src={src} controls playsInline>
          ویدیو پشتیبانی نمی‌شود
        </video>
      );
    }
    if (msg.mediaKind === 'voice' || msg.mediaKind === 'audio') {
      return <audio className="tg-media-audio" src={src} controls preload="metadata" />;
    }
    return (
      <a className="tg-media-file" href={src} target="_blank" rel="noreferrer">
        📎 {msg.fileName || mediaLabel(msg.mediaKind)}
      </a>
    );
  }

  return (
    <div className={`tg-chat${secure ? ' tg-chat--secure' : ''}${ended ? ' tg-chat--ended' : ''}`}>
      <header className="tg-chat-header">
        <button
          type="button"
          className="tg-chat-back"
          onClick={() => navigate('/explore#requests')}
          aria-label="بازگشت"
        >
          <ArrowRight size={22} strokeWidth={2.2} />
        </button>
        <button
          type="button"
          className="tg-chat-peer"
          onClick={() => setInfoCard(infoCard === 'owner' ? 'none' : 'owner')}
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
              {secure ? '🔒 چت امن' : 'آنلاین در چت همبازی'} · {peerPet.name}
            </small>
          </span>
        </button>
      </header>

      {secure ? (
        <div className="tg-secure-strip" role="status">
          🔒 چت امن فعال است — پیام‌ها قابل ذخیره یا فوروارد نیستند
        </div>
      ) : null}

      <div className="tg-chat-wallpaper" ref={scrollerRef}>
        <div className="tg-chat-messages">
          {messages.map((msg) => {
            if (msg.from === 'system') {
              return (
                <div key={msg.id} className="tg-system-msg">
                  <span>{msg.text}</span>
                </div>
              );
            }
            const showText =
              Boolean(msg.text) &&
              !/^\[(تصویر|ویدیو|پیام صوتی|فایل صوتی|فایل|استیکر|رسانه)\]$/.test(msg.text);
            return (
              <div
                key={msg.id}
                className={`tg-bubble-row${msg.from === 'me' ? ' is-out' : ' is-in'}`}
              >
                <div
                  className={`tg-bubble${secure ? ' is-protected' : ''}${
                    msg.mediaKind ? ' has-media' : ''
                  }`}
                >
                  {renderMedia(msg)}
                  {showText ? <p className="tg-bubble-text">{msg.text}</p> : null}
                  {msg.mediaKind && !showText ? (
                    <span className="tg-media-caption">{mediaLabel(msg.mediaKind)}</span>
                  ) : null}
                  <footer className="tg-bubble-meta">
                    <time>{formatClock(msg.at)}</time>
                    {msg.from === 'me' ? (
                      <CheckCheck size={14} className="tg-ticks" aria-hidden />
                    ) : null}
                    {secure ? <span className="tg-lock">🔒</span> : null}
                  </footer>
                </div>
              </div>
            );
          })}

          {infoCard === 'owner' ? (
            <div className="tg-info-card">
              <button
                type="button"
                className="tg-info-close"
                onClick={() => setInfoCard('none')}
                aria-label="بستن"
              >
                <X size={16} />
              </button>
              <h3>👤 پروفایل طرف مقابل</h3>
              <p>
                <strong>{peerOwnerName}</strong>
              </p>
              <ul>
                <li>شهر: {peerPet.city || '—'}</li>
                <li>محله: {peerPet.neighborhood || '—'}</li>
                <li>پت: {peerPet.name}</li>
              </ul>
            </div>
          ) : null}

          {infoCard === 'pet' ? (
            <div className="tg-info-card">
              <button
                type="button"
                className="tg-info-close"
                onClick={() => setInfoCard('none')}
                aria-label="بستن"
              >
                <X size={16} />
              </button>
              <div
                className="tg-info-pet-cover"
                style={{ backgroundImage: `url(${peerPet.imageUrl})` }}
              />
              <h3>
                🐾 {peerPet.emoji} {peerPet.name}
              </h3>
              <ul>
                <li>
                  نوع: {PET_TYPE_LABELS[peerPet.type]} · {peerPet.breed}
                </li>
                <li>سن: {formatAge(peerPet)}</li>
                <li>جنسیت: {PET_GENDER_LABELS[peerPet.gender]}</li>
                <li>جثه: {PET_SIZE_LABELS[peerPet.size]}</li>
                <li>واکسن: {peerPet.vaccinated ? 'زده' : 'نزده'}</li>
              </ul>
              {peerPet.bio ? <p className="tg-info-bio">{peerPet.bio}</p> : null}
              <Link to={`/pets/${peerPet.id}`} className="tg-chat-link-btn">
                مشاهده کامل پروفایل پت
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {actionError ? <p className="tg-error">{actionError}</p> : null}
      {sendError ? <p className="tg-error">{sendError}</p> : null}

      {!ended ? (
        <>
          {pendingFile ? (
            <div className="tg-attach-preview">
              {pendingPreview ? (
                <img src={pendingPreview} alt="" className="tg-attach-thumb" />
              ) : (
                <span className="tg-attach-name">📎 {pendingFile.name}</span>
              )}
              <button
                type="button"
                className="tg-attach-clear"
                onClick={clearPendingFile}
                aria-label="حذف فایل"
              >
                <X size={16} />
              </button>
            </div>
          ) : null}
          <form
            className="tg-composer"
            onSubmit={(e) => {
              void sendMessage(e);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="tg-file-input"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.zip,.txt"
              onChange={(e) => onPickFile(e.target.files)}
              aria-hidden
              tabIndex={-1}
            />
            <button
              type="button"
              className="tg-attach"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending}
              aria-label="پیوست فایل"
              title="پیوست عکس یا فایل"
            >
              <Paperclip size={20} />
            </button>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                pendingFile
                  ? 'کپشن (اختیاری)…'
                  : secure
                    ? 'پیام امن…'
                    : 'پیام…'
              }
              aria-label="متن پیام"
              autoComplete="off"
            />
            <button
              type="submit"
              className="tg-send"
              disabled={(!draft.trim() && !pendingFile) || sending}
              aria-label="ارسال"
            >
              <Send size={18} />
            </button>
          </form>

          <div className="tg-reply-keyboard" role="toolbar" aria-label="منوی چت همبازی">
            <div className="tg-reply-row">
              <button
                type="button"
                className={`tg-reply-key${secure ? ' is-on' : ''}`}
                onClick={() => void toggleSecure()}
              >
                {secureBtnLabel}
              </button>
              <button
                type="button"
                className="tg-reply-key"
                onClick={() => setInfoCard('owner')}
              >
                {TG_BTNS.peerProfile}
              </button>
            </div>
            <div className="tg-reply-row">
              <button type="button" className="tg-reply-key" onClick={() => setInfoCard('pet')}>
                {TG_BTNS.petProfile}
              </button>
              <button
                type="button"
                className={`tg-reply-key${contactAdded ? ' is-done' : ''}`}
                onClick={() => void addContact()}
                disabled={contactAdded}
              >
                {contactAdded ? '✅ مخاطب اضافه شد' : TG_BTNS.addContact}
              </button>
            </div>
            <div className="tg-reply-row">
              <button
                type="button"
                className="tg-reply-key tg-reply-key--danger"
                onClick={() => void endChat()}
                disabled={ending}
              >
                {ending ? 'در حال قطع…' : TG_BTNS.end}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="tg-ended-bar">
          <p>{wiped ? 'گفتگو کاملاً پاک شد.' : CHAT_WIPE_HINT}</p>
          <button
            type="button"
            className="tg-wipe-btn"
            onClick={() => void wipeConversation()}
            disabled={wiping || wiped}
          >
            {wiped ? (
              <>
                <Check size={16} /> پاک شد
              </>
            ) : wiping ? (
              'در حال پاک‌کردن…'
            ) : (
              '🗑 پاک کردن کل گفتگو'
            )}
          </button>
          <Link to="/explore#requests" className="tg-chat-link-btn">
            بازگشت به همبازی
          </Link>
        </div>
      )}
    </div>
  );
}

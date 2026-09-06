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
  ImageOff,
  Loader2,
  Lock,
  LockOpen,
  MoreVertical,
  Paperclip,
  PhoneOff,
  RefreshCw,
  Send,
  Smile,
  Stethoscope,
  UserPlus,
  X,
} from 'lucide-react';
import {
  VET_CONSULT_REQUEST_TTL_MS,
  isPendingRequestExpired,
  userHasRole,
  type VetConsultChatMediaKind,
  type VetConsultChatMessage,
  type VetConsultation,
} from '@petdate/shared';
import { SiteLogo } from '../components/SiteLogo';
import { PetAvatar } from '../components/PetAvatar';
import { PresenceBadge } from '../components/PresenceBadge';
import { EmojiPicker } from '../components/EmojiPicker';
import { RequestCountdown } from '../components/RequestCountdown';
import { useAuthStore } from '../hooks/useAuthStore';
import { useChatSocket, type ChatSocketEvent } from '../hooks/useChatSocket';
import { useLiveAjaxPoll } from '../hooks/useLiveAjaxPoll';
import { usePeerPresence, usePresenceHeartbeat } from '../hooks/usePresence';
import {
  acceptVetConsultation,
  addUserContact,
  clearVetConsultChatMessages,
  endVetConsultChat,
  getVetConsultation,
  listVetConsultChatMessages,
  listVetConsultations,
  postVetConsultChatMessage,
  rejectVetConsultation,
  setVetConsultChatSecure,
  uploadVetConsultChatFile,
  vetConsultChatMediaUrl,
} from '../lib/api';
import { subscribeIncomingRefresh } from '../lib/liveIncoming';
import {
  acceptInboxItem,
  inboxScopeForUser,
  loadInboxConversations,
  rejectInboxItem,
  type InboxConversation,
} from '../lib/inboxConversations';
import { formatTimeAgo } from '../data/mock';

const CHAT_WIPE_HINT =
  'لطفاً کل این گفتگو را پاک کنید تا اثری از پیام‌ها (متن، عکس، ویس و …) نماند.';

const FALLBACK_POLL_MS = 45_000;
const MESSAGE_FALLBACK_POLL_MS = 15_000;
const MAX_ATTACH_BYTES = 15 * 1024 * 1024;
const DESKTOP_MQ = '(min-width: 860px)';

type UiMsg = {
  id: string;
  numericId: number;
  from: 'me' | 'peer' | 'system';
  text: string;
  at: number;
  mediaKind?: VetConsultChatMediaKind | null;
  telegramFileId?: string | null;
  storageKey?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

function toUi(row: VetConsultChatMessage, myId: number): UiMsg {
  const at = Date.parse(row.createdAt);
  return {
    id: String(row.id),
    numericId: row.id,
    from: row.senderUserId === myId ? 'me' : 'peer',
    text: row.text,
    at: Number.isFinite(at) ? at : Date.now(),
    mediaKind: row.mediaKind,
    telegramFileId: row.telegramFileId,
    storageKey: row.storageKey,
    mimeType: row.mimeType,
    fileName: row.fileName,
  };
}

function systemMessage(text: string): UiMsg {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    numericId: 0,
    from: 'system',
    text,
    at: Date.now(),
  };
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

function mediaLabel(kind?: VetConsultChatMediaKind | null) {
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
  const [ending, setEnding] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [secure, setSecure] = useState(false);
  const [ended, setEnded] = useState(false);
  const [wiped, setWiped] = useState(false);
  const [contactAdded, setContactAdded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [brokenMedia, setBrokenMedia] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);
  const [listLoading, setListLoading] = useState(true);
  /** After the first successful inbox load, never flash the skeleton again. */
  const listReadyRef = useRef(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listActionKey, setListActionKey] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  const lastIdRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const smoothScrollRef = useRef(false);

  const isVetSide = Boolean(user && consult && user.id === consult.vetUserId);
  const isVetUser = userHasRole(user, 'vet');
  const peerUserId = consult
    ? isVetSide
      ? consult.patientUserId
      : consult.vetUserId
    : null;

  usePresenceHeartbeat(user?.id);
  const peerPresence = usePeerPresence(peerUserId);

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

  const userRef = useRef(user);
  userRef.current = user;

  const reloadConversations = useCallback(async (opts?: { soft?: boolean }) => {
    const u = userRef.current;
    if (!u?.id) {
      setConversations([]);
      setListLoading(false);
      listReadyRef.current = false;
      return;
    }
    // Once painted, stay soft — hard loading looks like a full refresh.
    const soft = Boolean(opts?.soft || listReadyRef.current);
    if (!soft) {
      setListLoading(true);
      setListError(null);
    }
    try {
      const mapped = await loadInboxConversations(u.id, u);
      setConversations((prev) => {
        if (
          soft &&
          prev.length === mapped.length &&
          prev.every(
            (row, i) =>
              row.key === mapped[i]?.key &&
              row.preview === mapped[i]?.preview &&
              row.pending === mapped[i]?.pending &&
              row.ended === mapped[i]?.ended &&
              row.title === mapped[i]?.title,
          )
        ) {
          return prev;
        }
        return mapped;
      });
      listReadyRef.current = true;
      if (soft) setListError(null);
    } catch (err) {
      if (!soft) {
        setListError(err instanceof Error ? err.message : 'بارگذاری گفتگوها ناموفق بود');
      }
    } finally {
      if (!soft) setListLoading(false);
    }
  }, []);

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

  const applyConsultFlags = useCallback((next: VetConsultation, opts?: { announce?: boolean }) => {
    setSecure((prev) => {
      const value = Boolean(next.chatSecure);
      if (opts?.announce && prev !== value) {
        setMessages((msgs) => [
          ...msgs,
          systemMessage(
            value
              ? 'طرف مقابل چت امن را فعال کرد.\nپیام‌های این گفتگو قابل ذخیره یا فوروارد نیستند.'
              : 'طرف مقابل چت امن را خاموش کرد.',
          ),
        ]);
      }
      return value;
    });
    setEnded((prev) => {
      const value = Boolean(next.chatEnded);
      if (opts?.announce && !prev && value) {
        setMessages((msgs) => [
          ...msgs,
          systemMessage(['چت مشاوره قطع شد.', '', CHAT_WIPE_HINT].join('\n')),
        ]);
        void reloadConversations({ soft: true });
      }
      return value;
    });
  }, [reloadConversations]);

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

  const onChatSocket = useCallback(
    (event: ChatSocketEvent) => {
      if (event.type === 'inbox') {
        void reloadConversations({ soft: true });
        return;
      }
      if (!consultId || !user?.id) return;
      if (event.type === 'message' && event.channel === 'vet' && event.threadId === consultId) {
        const row = event.message as VetConsultChatMessage;
        if (!row?.id) return;
        setMessages((prev) => {
          if (prev.some((m) => m.numericId === row.id || m.id === String(row.id))) return prev;
          return [...prev, toUi(row, user.id)];
        });
        lastIdRef.current = Math.max(lastIdRef.current, row.id);
        void reloadConversations({ soft: true });
        return;
      }
      if (event.type === 'thread' && event.channel === 'vet' && event.threadId === consultId) {
        const patch = event.patch || {};
        if (typeof patch.chatSecure === 'boolean' || patch.chatEnded || patch.messagesCleared) {
          void loadConsult().then((next) => {
            if (!next) return;
            setConsult(next);
            applyConsultFlags(next, { announce: true });
            if (patch.messagesCleared) {
              setMessages([]);
              lastIdRef.current = 0;
            }
          });
        }
        if (typeof patch.status === 'string') {
          void loadConsult().then((next) => {
            if (!next) return;
            setConsult(next);
            applyConsultFlags(next, { announce: true });
          });
        }
        void reloadConversations({ soft: true });
      }
    },
    [consultId, user?.id, reloadConversations, loadConsult, applyConsultFlags],
  );

  const { connected: wsConnected } = useChatSocket({
    token,
    enabled: Boolean(token && user?.id),
    thread:
      hasThread && consultId > 0 ? { channel: 'vet', threadId: consultId } : null,
    onEvent: onChatSocket,
  });

  useLiveAjaxPoll(
    () => {
      void reloadConversations({ soft: true });
    },
    { enabled: Boolean(user?.id) && !wsConnected, intervalMs: FALLBACK_POLL_MS },
  );

  useEffect(() => {
    if (!user?.id) return;
    return subscribeIncomingRefresh((detail) => {
      if (detail?.kinds && !detail.kinds.includes('vet') && !detail.kinds.includes('playmate')) {
        return;
      }
      void reloadConversations({ soft: true });
    });
  }, [user?.id, reloadConversations]);

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
      setSendError(null);
      setActionError(null);
      try {
        const found = await loadConsult();
        if (cancelled) return;
        if (!found) {
          setError('این مشاوره پیدا نشد یا به آن دسترسی ندارید');
          setConsult(null);
          return;
        }
        setConsult(found);
        setSecure(Boolean(found.chatSecure));
        setEnded(Boolean(found.chatEnded));
        setWiped(false);
        setContactAdded(false);
        setMenuOpen(false);
        setEmojiOpen(false);
        setPendingFile(null);
        setPendingPreview(null);
        setBrokenMedia({});
        lastIdRef.current = 0;
        stickToBottomRef.current = true;
        await syncMessages({ reset: true });
        if (found.status === 'active' && !found.chatEnded) {
          setMessages((prev) =>
            prev.length
              ? prev
              : [systemMessage('چت مشاوره فعال شد — می‌توانی پیام بفرستی.')],
          );
        }
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
      if (consult.status === 'active' && !ended) {
        void syncMessages();
      }
      void loadConsult()
        .then((next) => {
          if (!next) return;
          setConsult((prev) => {
            if (prev?.status === 'active' && next.status === 'requested' && prev.id === next.id) {
              return { ...next, status: 'active' };
            }
            return next;
          });
          if (next.status === 'active' || next.chatEnded) {
            applyConsultFlags(next, { announce: true });
          }
        })
        .catch(() => undefined);
      void reloadConversations({ soft: true });
    }, wsConnected ? FALLBACK_POLL_MS : MESSAGE_FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [
    consult?.status,
    consult?.id,
    ended,
    syncMessages,
    loadConsult,
    reloadConversations,
    applyConsultFlags,
    wsConnected,
  ]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !stickToBottomRef.current) return;
    const behavior = smoothScrollRef.current ? 'smooth' : 'auto';
    smoothScrollRef.current = false;
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior });
    });
  }, [messages, ended, pendingFile, emojiOpen, consult?.status]);

  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = '0px';
    ta.style.height = `${Math.min(128, Math.max(44, ta.scrollHeight))}px`;
  }, [draft, consult?.status, hasThread]);

  useEffect(() => {
    if (!pendingFile || !pendingFile.type.startsWith('image/')) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  useEffect(() => {
    if (ended) setEmojiOpen(false);
  }, [ended]);

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
    setActionError(null);
    try {
      const updated = await acceptVetConsultation(consult.id, token);
      const next = {
        ...updated,
        status: updated.status === 'cancelled' ? updated.status : ('active' as const),
      };
      setConsult(next);
      setSecure(Boolean(updated.chatSecure));
      setEnded(Boolean(updated.chatEnded));
      lastIdRef.current = 0;
      stickToBottomRef.current = true;
      await syncMessages({ reset: true });
      setMessages((prev) =>
        prev.length ? prev : [systemMessage('درخواست پذیرفته شد — چت مشاوره فعال شد.')],
      );
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

  function clearPendingFile() {
    setPendingFile(null);
    setPendingPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function rememberSelection() {
    const ta = inputRef.current;
    if (!ta) return;
    selectionRef.current = {
      start: ta.selectionStart ?? draft.length,
      end: ta.selectionEnd ?? draft.length,
    };
  }

  function insertEmoji(emoji: string) {
    const ta = inputRef.current;
    const sel = selectionRef.current;
    const start = sel?.start ?? ta?.selectionStart ?? draft.length;
    const end = sel?.end ?? ta?.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    const caret = start + emoji.length;
    setDraft(next);
    selectionRef.current = { start: caret, end: caret };
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
    });
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
    if (ended || sending || !token || !user?.id || !consult || consult.status !== 'active') {
      return;
    }
    const text = draft.trim();
    const file = pendingFile;
    if (!text && !file) return;
    setSending(true);
    setSendError(null);
    setError(null);
    setEmojiOpen(false);
    setDraft('');
    clearPendingFile();
    stickToBottomRef.current = true;
    smoothScrollRef.current = true;
    try {
      const saved = file
        ? await uploadVetConsultChatFile(consult.id, user.id, file, text, token)
        : await postVetConsultChatMessage(consult.id, text, token);
      const ui = toUi(saved, user.id);
      setMessages((prev) => (prev.some((m) => m.id === ui.id) ? prev : [...prev, ui]));
      lastIdRef.current = Math.max(lastIdRef.current, saved.id);
      void reloadConversations();
    } catch (err) {
      if (text) setDraft(text);
      if (file) setPendingFile(file);
      setSendError(err instanceof Error ? err.message : 'ارسال پیام ناموفق بود');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  function onComposerKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  async function toggleSecure() {
    if (!user?.id || !consult || ended || consult.status !== 'active') return;
    setMenuOpen(false);
    const next = !secure;
    setSecure(next);
    setActionError(null);
    setMessages((prev) => [
      ...prev,
      systemMessage(
        next
          ? 'چت امن فعال شد.\nاز این به بعد پیام‌ها قابل ذخیره یا فوروارد نیستند.'
          : 'چت امن خاموش شد. پیام‌های بعدی مثل قبل قابل ذخیره هستند.',
      ),
    ]);
    try {
      const updated = await setVetConsultChatSecure(consult.id, user.id, next, token);
      setConsult(updated);
      void reloadConversations();
    } catch (err) {
      setSecure(!next);
      setActionError(err instanceof Error ? err.message : 'تغییر چت امن ناموفق بود');
    }
  }

  async function addContact() {
    if (!user?.id || !peerUserId || ended || contactAdded) return;
    setMenuOpen(false);
    setActionError(null);
    try {
      await addUserContact(user.id, peerUserId);
      setContactAdded(true);
      setMessages((prev) => [...prev, systemMessage('مخاطب با موفقیت اضافه شد.')]);
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
    if (!user?.id || !consult || ending || ended || consult.status !== 'active') return;
    setMenuOpen(false);
    setEnding(true);
    setActionError(null);
    setEnded(true);
    setMessages((prev) => [
      ...prev,
      systemMessage(
        [
          'چت مشاوره پایان یافت.',
          '',
          CHAT_WIPE_HINT,
          secure ? 'چت امن فعال بود — حتماً گفتگو را پاک کن.' : null,
        ]
          .filter(Boolean)
          .join('\n'),
      ),
    ]);
    try {
      const res = await endVetConsultChat(consult.id, user.id, token);
      setConsult(res.consultation);
      void reloadConversations();
    } catch (err) {
      try {
        await clearVetConsultChatMessages(consult.id, user.id, token);
      } catch {
        /* local end still ok */
      }
      setActionError(err instanceof Error ? err.message : 'قطع چت روی سرور ناموفق بود');
    } finally {
      setEnding(false);
    }
  }

  async function wipeConversation() {
    if (!user?.id || !consult || wiping) return;
    setWiping(true);
    setActionError(null);
    try {
      await clearVetConsultChatMessages(consult.id, user.id, token);
      setMessages([systemMessage('گفتگو به‌طور کامل پاک شد.')]);
      lastIdRef.current = 0;
      setWiped(true);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'پاک‌کردن گفتگو ناموفق بود');
    } finally {
      setWiping(false);
    }
  }

  function renderMedia(msg: UiMsg) {
    const hasFile = Boolean(msg.telegramFileId || msg.storageKey);
    if (!msg.mediaKind || !hasFile || !user?.id || !consult) return null;
    if (brokenMedia[msg.id]) {
      return (
        <div className="tg-media-broken" role="img" aria-label={mediaLabel(msg.mediaKind)}>
          <ImageOff size={18} aria-hidden />
          <span>{mediaLabel(msg.mediaKind)} در دسترس نیست</span>
        </div>
      );
    }
    const src = vetConsultChatMediaUrl(consult.id, msg.numericId, user.id);
    const markBroken = () =>
      setBrokenMedia((prev) => (prev[msg.id] ? prev : { ...prev, [msg.id]: true }));
    if (msg.mediaKind === 'photo' || msg.mediaKind === 'sticker') {
      return (
        <a className="tg-media-link" href={src} target="_blank" rel="noreferrer">
          <img
            className="tg-media-image"
            src={src}
            alt={mediaLabel(msg.mediaKind)}
            loading="lazy"
            onError={markBroken}
          />
        </a>
      );
    }
    if (
      msg.mediaKind === 'video' ||
      msg.mediaKind === 'animation' ||
      msg.mediaKind === 'video_note'
    ) {
      return (
        <video
          className="tg-media-video"
          src={src}
          controls
          playsInline
          onError={markBroken}
        >
          ویدیو پشتیبانی نمی‌شود
        </video>
      );
    }
    if (msg.mediaKind === 'voice' || msg.mediaKind === 'audio') {
      return (
        <audio
          className="tg-media-audio"
          src={src}
          controls
          preload="metadata"
          onError={markBroken}
        />
      );
    }
    return (
      <a className="tg-media-file" href={src} target="_blank" rel="noreferrer">
        {'📎 '}
        {msg.fileName || mediaLabel(msg.mediaKind)}
      </a>
    );
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
  const chatUnlocked = Boolean(active && !ended);
  const incomingPending = Boolean(pending && isVetSide);

  const shellClass = [
    'tg-chat',
    'tg-chat--shell',
    'pepito-vet-chat',
    showList && showThread ? 'tg-chat--split' : '',
    !showList && showThread ? 'tg-chat--thread-only' : '',
    showList && !showThread ? 'tg-chat--list-only' : '',
    secure ? 'tg-chat--secure' : '',
    ended ? 'tg-chat--ended' : '',
    pending ? 'tg-chat--pending' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const statusLabel = ended
    ? 'چت پایان یافته'
    : expired
      ? 'درخواست منقضی شده'
      : pending
        ? isVetSide
          ? 'درخواست مشاوره جدید'
          : 'منتظر پاسخ پزشک'
        : chatUnlocked
          ? secure
            ? 'چت امن فعال'
            : 'چت مشاوره فعال'
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
                <SiteLogo className="tg-chat-empty-logo" height={48} />
                <h2>هنوز گفتگویی نیست</h2>
                <p>
                  {inboxScope === 'vet'
                    ? 'درخواست‌ها و چت‌های مشاوره دامپزشکی این نقش اینجا می‌آیند.'
                    : 'درخواست‌های همبازی و مشاوره‌های شما به‌عنوان صاحب پت اینجا می‌آیند.'}
                </p>
                <Link
                  to={inboxScope === 'vet' ? '/vet-consult' : '/explore'}
                  className={
                    inboxScope === 'vet'
                      ? 'tg-chat-link-btn'
                      : 'pepito-btn button-1 tg-chat-playmate-cta'
                  }
                >
                  {inboxScope === 'vet' ? (
                    'رفتن به پنل پزشک'
                  ) : (
                    <>
                      <span className="pepito-btn-icon" aria-hidden>
                        <i className="flaticon-pawprint-4" />
                      </span>
                      پیدا کردن همبازی
                    </>
                  )}
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
              <SiteLogo className="tg-chat-empty-logo" height={48} />
              <h2>{inboxScope === 'vet' ? 'مشاوره‌ای را شروع کن' : 'همبازی پیدا کن'}</h2>
              <Link
                to={inboxScope === 'vet' ? '/vet-consult' : '/explore'}
                className={
                  inboxScope === 'vet'
                    ? 'tg-chat-link-btn'
                    : 'pepito-btn button-1 tg-chat-playmate-cta'
                }
              >
                {inboxScope === 'vet' ? (
                  'رفتن به پنل پزشک'
                ) : (
                  <>
                    <span className="pepito-btn-icon" aria-hidden>
                      <i className="flaticon-pawprint-4" />
                    </span>
                    پیدا کردن همبازی
                  </>
                )}
              </Link>
            </div>
          ) : loading ? (
            <div className="tg-thread-empty">
              <Loader2 className="tg-spin" size={28} />
              <h2>در حال آماده‌سازی چت پزشک…</h2>
            </div>
          ) : !consult ? (
            <div className="tg-thread-empty">
              <SiteLogo className="tg-chat-empty-logo" height={48} />
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
                    <PresenceBadge presence={peerPresence} />
                  </span>
                </div>

                {chatUnlocked ? (
                  <div className="tg-chat-header-actions" ref={menuRef}>
                    <button
                      type="button"
                      className={`tg-icon-btn tg-secure-toggle${secure ? ' is-on' : ''}`}
                      onClick={() => void toggleSecure()}
                      aria-label={secure ? 'خاموش‌کردن چت امن' : 'فعال‌کردن چت امن'}
                      title={secure ? 'خاموش‌کردن چت امن' : 'فعال‌کردن چت امن'}
                    >
                      {secure ? <Lock size={18} /> : <LockOpen size={18} />}
                    </button>
                    <button
                      type="button"
                      className="tg-icon-btn tg-end-chat-btn"
                      onClick={() => void endChat()}
                      disabled={ending}
                      aria-label="بستن چت"
                      title="بستن چت"
                    >
                      <PhoneOff size={18} />
                    </button>
                    <button
                      type="button"
                      className="tg-icon-btn"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-label="منوی گفتگو"
                      aria-expanded={menuOpen}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {menuOpen ? (
                      <div className="tg-chat-menu" role="menu">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => void addContact()}
                          disabled={contactAdded}
                        >
                          <UserPlus size={16} />
                          {contactAdded ? 'مخاطب اضافه شد' : 'افزودن مخاطب'}
                        </button>
                        <button
                          type="button"
                          role="menuitem"
                          className="is-danger"
                          onClick={() => void endChat()}
                          disabled={ending}
                        >
                          {ending ? 'در حال بستن…' : 'بستن چت'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </header>

              {secure && chatUnlocked ? (
                <div className="tg-secure-strip" role="status">
                  چت امن فعال است — پیام‌ها قابل ذخیره یا فوروارد نیستند
                </div>
              ) : pending ? (
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
                      void reloadConversations({ soft: true });
                    }}
                  />
                </div>
              ) : chatUnlocked ? (
                <div className="tg-status-strip tg-status-strip--with-action" role="status">
                  <span>چت مشاوره دامپزشک فعال است</span>
                  <button
                    type="button"
                    className="tg-end-chat-chip"
                    onClick={() => void endChat()}
                    disabled={ending}
                  >
                    {ending ? '…' : 'بستن چت'}
                  </button>
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
                              : ended
                                ? 'چت مشاوره پایان یافت'
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
                      ) : chatUnlocked ? (
                        <p className="tg-request-card-wait" role="status">
                          پذیرفته شد — می‌توانی پیام بفرستی.
                        </p>
                      ) : ended ? (
                        <p className="tg-request-card-wait" role="status">
                          چت قطع شده — می‌توانی گفتگو را پاک کنی.
                        </p>
                      ) : null}
                    </div>
                  </article>

                  {messages.map((m) => {
                    if (m.from === 'system') {
                      return (
                        <div key={m.id} className="tg-system-msg">
                          <span>{m.text}</span>
                        </div>
                      );
                    }
                    const showText =
                      Boolean(m.text) &&
                      !/^\[(تصویر|ویدیو|پیام صوتی|فایل صوتی|فایل|استیکر|رسانه)\]$/.test(m.text);
                    return (
                      <div
                        key={m.id}
                        className={`tg-bubble-row${m.from === 'me' ? ' is-out' : ' is-in'}`}
                      >
                        <div
                          className={`tg-bubble${secure ? ' is-protected' : ''}${
                            m.mediaKind ? ' has-media' : ''
                          }`}
                        >
                          {renderMedia(m)}
                          {showText ? <p className="tg-bubble-text">{m.text}</p> : null}
                          {m.mediaKind && !showText ? (
                            <span className="tg-media-caption">{mediaLabel(m.mediaKind)}</span>
                          ) : null}
                          <footer className="tg-bubble-meta">
                            <time>{formatClock(m.at)}</time>
                            {m.from === 'me' ? (
                              <CheckCheck size={14} className="tg-ticks" aria-hidden />
                            ) : null}
                            {secure ? <Lock size={11} className="tg-lock-ico" aria-hidden /> : null}
                          </footer>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error ? (
                <p className="tg-error" role="alert">
                  {error}
                </p>
              ) : null}
              {actionError ? (
                <p className="tg-error" role="alert">
                  {actionError}
                </p>
              ) : null}
              {sendError ? (
                <p className="tg-error" role="alert">
                  {sendError}
                </p>
              ) : null}

              {!chatUnlocked && !ended ? (
                <div className="tg-request-composer-bar" role="status">
                  {incomingPending
                    ? 'برای شروع چت، درخواست را قبول یا رد کن.'
                    : expired
                      ? 'این درخواست منقضی شده است.'
                      : pending
                        ? 'چت بعد از قبول پزشک فعال می‌شود.'
                        : 'این مشاوره دیگر فعال نیست.'}
                  {expired && !isVetSide ? (
                    <Link
                      to="/vet-consult"
                      className="tg-chat-link-btn"
                      style={{ marginInlineStart: 8 }}
                    >
                      درخواست مجدد
                    </Link>
                  ) : null}
                </div>
              ) : chatUnlocked ? (
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
                  <div className="tg-composer-shell">
                    <EmojiPicker
                      open={emojiOpen}
                      onClose={() => setEmojiOpen(false)}
                      onPick={insertEmoji}
                    />
                    <form
                      className="tg-composer"
                      dir="ltr"
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
                        onClick={() => {
                          setEmojiOpen(false);
                          fileInputRef.current?.click();
                        }}
                        disabled={sending}
                        aria-label="پیوست فایل"
                        title="پیوست عکس یا فایل"
                      >
                        <Paperclip size={20} />
                      </button>
                      <button
                        type="button"
                        className={`tg-emoji-btn${emojiOpen ? ' is-open' : ''}`}
                        onClick={() => setEmojiOpen((v) => !v)}
                        disabled={sending}
                        aria-label="ایموجی"
                        aria-expanded={emojiOpen}
                        title="ایموجی"
                      >
                        <Smile size={20} />
                      </button>
                      <textarea
                        ref={inputRef}
                        dir="auto"
                        value={draft}
                        onChange={(e) => {
                          setDraft(e.target.value);
                          rememberSelection();
                        }}
                        onSelect={rememberSelection}
                        onClick={rememberSelection}
                        onKeyUp={rememberSelection}
                        onBlur={rememberSelection}
                        onKeyDown={onComposerKeyDown}
                        placeholder={
                          pendingFile ? 'کپشن (اختیاری)…' : secure ? 'پیام امن…' : 'پیام…'
                        }
                        aria-label="متن پیام"
                        rows={1}
                        autoComplete="off"
                        enterKeyHint="send"
                        data-testid="vet-chat-input"
                      />
                      <button
                        type="submit"
                        className={`tg-send${sending ? ' is-sending' : ''}`}
                        disabled={(!draft.trim() && !pendingFile) || sending}
                        aria-label="ارسال"
                        data-testid="vet-chat-send"
                      >
                        {sending ? <Loader2 size={18} className="tg-spin" /> : <Send size={18} />}
                      </button>
                    </form>
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
                      'پاک کردن کل گفتگو'
                    )}
                  </button>
                  <Link to="/chats" className="tg-chat-link-btn">
                    بازگشت به گفتگوها
                  </Link>
                </div>
              )}
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

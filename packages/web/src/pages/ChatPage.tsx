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
import { usePetStore } from '../hooks/usePetStore';
import { getPlaydateRequest } from '../lib/api';
import { playdateToMatchRequest } from '../lib/playdateMap';
import {
  PET_GENDER_LABELS,
  PET_SIZE_LABELS,
  PET_TYPE_LABELS,
  type MatchRequest,
  type Pet,
} from '../types';

type ChatMsg = {
  id: string;
  from: 'me' | 'peer';
  text: string;
  at: number;
};

type Panel = 'none' | 'owner' | 'pet';

function seedMessages(match: MatchRequest, myPet: Pet): ChatMsg[] {
  const peer = match.fromPet;
  const base = Date.now() - 1000 * 60 * 42;
  return [
    {
      id: '1',
      from: 'peer',
      text: match.message || `سلام! ${peer.name} آماده‌ی بازیه 🐾`,
      at: base,
    },
    {
      id: '2',
      from: 'me',
      text: `عالی! ${myPet.name} هم خیلی مشتاقه. کی و کجا راحت‌ترید؟`,
      at: base + 1000 * 60 * 4,
    },
    {
      id: '3',
      from: 'peer',
      text: 'پارک نزدیک محله‌مون عصرها خلوت‌تره. اگر خواستی هماهنگ کنیم.',
      at: base + 1000 * 60 * 9,
    },
  ];
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
}

export function ChatPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const { myPet } = usePetStore();
  const { user: authUser } = useAuthStore();
  const myUserId = authUser?.id;

  const [match, setMatch] = useState<MatchRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [secure, setSecure] = useState(false);
  const [contactAdded, setContactAdded] = useState(false);
  const [panel, setPanel] = useState<Panel>('none');
  const [draft, setDraft] = useState('');
  const [ended, setEnded] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);

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
        if (!cancelled) setMatch(playdateToMatchRequest(req, myUserId));
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
    setMessages(seedMessages(match, myPet));
    setSecure(false);
    setContactAdded(false);
    setEnded(false);
    setPanel('none');
    setDraft('');
  }, [match, myPet]);

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
        ? 'چت امن روشن است — پیام‌ها، عکس و ویس قابل ذخیره یا فوروارد نیستند.'
        : 'برای محرمانگی بیشتر، چت امن را روشن کنید.',
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

  function sendMessage(e: FormEvent) {
    e.preventDefault();
    if (ended) return;
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), from: 'me', text, at: Date.now() },
    ]);
    setDraft('');
  }

  function endChat() {
    setEnded(true);
    setPanel('none');
    setMessages([]);
  }

  return (
    <div className={`chat-page${secure ? ' chat-page--secure' : ''}${ended ? ' chat-page--ended' : ''}`}>
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
                onClick={() => setSecure((v) => !v)}
                disabled={ended}
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
                onClick={endChat}
                disabled={ended}
              >
                <Trash2 size={16} />
                <span>قطع چت</span>
              </button>
            </div>
          </header>

          <div className={`chat-secure-banner${secure ? ' is-on' : ''}`}>
            <Shield size={16} strokeWidth={2.2} />
            <p>{secureHint}</p>
          </div>

          <div className="chat-stream" ref={scrollerRef}>
            {!ended && messages.length === 0 && (
              <div className="chat-start-note">
                <MessageCircle size={22} />
                <p>گفتگو با {peerOwnerName} شروع شد. برای هماهنگی همبازی پیام بفرستید.</p>
              </div>
            )}

            {!ended &&
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`chat-bubble-row${msg.from === 'me' ? ' is-me' : ' is-peer'}`}
                >
                  <div className={`chat-bubble${secure ? ' is-protected' : ''}`}>
                    <p>{msg.text}</p>
                    <time>{formatClock(msg.at)}</time>
                    {secure && (
                      <span className="chat-lock-dot" aria-hidden>
                        <Lock size={10} />
                      </span>
                    )}
                  </div>
                </div>
              ))}

            {ended && (
              <div className="chat-ended-panel">
                <div className="chat-ended-orb" aria-hidden />
                <BrandMark iconSize={34} className="chat-ended-brand" />
                <h2>چت همبازی پایان یافت</h2>
                <p>
                  تمام پیام‌ها از این صفحه پاک شد.
                  <br />
                  لطفاً کل این گفتگو را از تاریخچه هم پاک کنید تا اثری نماند.
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

          {!ended && (
            <form className="chat-composer" onSubmit={sendMessage}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={secure ? 'پیام امن بنویسید…' : 'پیام بنویسید…'}
                aria-label="متن پیام"
              />
              <button type="submit" className="chat-send" disabled={!draft.trim()}>
                ارسال
              </button>
            </form>
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

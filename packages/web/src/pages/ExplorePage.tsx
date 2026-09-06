import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { BRAND, primaryRole, userHasRole, type PetProfile } from '@petdate/shared';
import { PlaymateRequestsPanel } from '../components/PlaymateRequestsPanel';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { useUserStore } from '../hooks/useUserStore';
import { listPets } from '../lib/api';
import { findAndSendPlaymates, type FindPlaymateResult } from '../lib/playmateActions';
import { petProfileToUiPet } from '../lib/playdateMap';

const ROLE_EMPTY_MESSAGES: Record<string, { title: string; desc: string; cta?: string; to?: string }> = {
  vet: {
    title: 'حالت دامپزشک',
    desc: 'برای پیدا کردن همبازی به عنوان صاحب پت وارد شو یا از مشاوره آنلاین استفاده کن.',
    cta: '🩺 مشاوره دامپزشک',
    to: '/vet-consult',
  },
  no_pet: {
    title: 'هنوز پتی نداری؟',
    desc: 'می‌تونی فروشگاه و کلینیک‌ها رو ببینی یا پت ثبت کنی.',
    cta: '🛒 فروشگاه پت',
    to: '/shop',
  },
  pet_seeker: {
    title: 'دنبال پت می‌گردی؟',
    desc: 'به زودی آگهی‌های پت‌های قابل‌انتخاب اضافه می‌شه.',
    cta: '🏥 کلینیک‌های نزدیک',
    to: '/clinics',
  },
  community_seeker: {
    title: 'جامعه petdate',
    desc: 'به زودی گروه‌ها و رویدادها اضافه می‌شن.',
  },
  trainer: {
    title: 'حالت مربی',
    desc: 'به زودی درخواست‌های آموزشی نمایش داده می‌شه.',
    cta: '👤 پروفایل',
    to: '/profile',
  },
  pet_sitter: {
    title: 'حالت نگهبان پت',
    desc: 'به زودی درخواست‌های نگهبانی نمایش داده می‌شه.',
    cta: '👤 پروفایل',
    to: '/profile',
  },
};

type FindPhase = 'idle' | 'pick' | 'sending' | 'done';

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function ExplorePage() {
  const location = useLocation();
  const { user } = useUserStore();
  const { user: authUser, isLoggedIn } = useAuthStore();
  const [myPets, setMyPets] = useState<PetProfile[]>([]);
  const [petsLoading, setPetsLoading] = useState(false);
  const [findPhase, setFindPhase] = useState<FindPhase>('idle');
  const [findError, setFindError] = useState<string | null>(null);
  const [findResult, setFindResult] = useState<FindPlaymateResult | null>(null);
  const [statusLine, setStatusLine] = useState<string | null>(null);

  const myUserId = authUser?.id ?? user.id;
  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');
  const emptyRole = !isPetOwner ? primaryRole(user.roles, user.role) : undefined;
  const roleEmpty = emptyRole ? ROLE_EMPTY_MESSAGES[emptyRole] : null;
  const focusRequests = location.hash === '#requests';

  const loadMyPets = useCallback(async () => {
    if (!myUserId || !isPetOwner) {
      setMyPets([]);
      return;
    }
    setPetsLoading(true);
    try {
      const rows = await listPets({ ownerId: myUserId });
      setMyPets(rows);
    } catch {
      setMyPets([]);
    } finally {
      setPetsLoading(false);
    }
  }, [myUserId, isPetOwner]);

  useEffect(() => {
    void loadMyPets();
  }, [loadMyPets]);

  useEffect(() => {
    if (!focusRequests) return;
    const el = document.getElementById('requests');
    if (!el) return;
    const t = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(t);
  }, [focusRequests, petsLoading]);

  async function runFindForPet(pet: PetProfile) {
    if (!myUserId) {
      setFindError('برای ارسال درخواست همبازی وارد حساب شو.');
      return;
    }
    setFindPhase('sending');
    setFindError(null);
    setFindResult(null);
    setStatusLine(null);
    try {
      const result = await findAndSendPlaymates(pet, myUserId);
      setFindResult(result);
      setFindPhase('done');
      if (result.sent === 0) {
        setStatusLine(
          `برای ${result.sourceName} فعلاً همبازی هم‌گروه پیدا نشد. درخواست در تلگرام ارسال نشد.`
        );
      } else {
        setStatusLine(
          `✅ ${result.sent} درخواست برای ${result.sourceName} ارسال شد — به صاحب‌ها در تلگرام اطلاع داده می‌شه.`
        );
      }
    } catch (err) {
      setFindError(err instanceof Error ? err.message : 'ارسال درخواست‌ها ناموفق بود');
      setFindPhase(myPets.length > 1 ? 'pick' : 'idle');
    }
  }

  async function onPrimaryClick() {
    setFindError(null);
    if (!isLoggedIn || !myUserId) return;
    if (petsLoading) return;
    if (myPets.length === 0) return;
    if (myPets.length === 1) {
      await runFindForPet(myPets[0]!);
      return;
    }
    setFindPhase('pick');
    setFindResult(null);
    setStatusLine(null);
  }

  if (roleEmpty) {
    return (
      <div className="pepito-explore">
        <header className="pepito-home-section-head pepito-explore-head">
          <p className="pepito-eyebrow">{BRAND.displayName}</p>
          <h1>پیدا کردن همبازی</h1>
          <p>این بخش برای صاحبان پت است.</p>
        </header>
        <div className="empty-state empty-state--role pepito-explore-empty">
          <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
          <h3>{roleEmpty.title}</h3>
          <p>{roleEmpty.desc}</p>
          {roleEmpty.cta && roleEmpty.to && (
            <Link to={roleEmpty.to} className="pepito-btn button-1">
              <PawIcon />
              {roleEmpty.cta}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const needsLogin = !isLoggedIn || !myUserId;
  const needsPet = !needsLogin && !petsLoading && myPets.length === 0;
  const showPetPick = findPhase === 'pick' && myPets.length > 1;
  const sending = findPhase === 'sending';

  return (
    <div className="pepito-explore">
      <header className="pepito-home-section-head pepito-explore-head">
        <p className="pepito-eyebrow">{BRAND.taglineFa}</p>
        <h1>پیدا کردن همبازی</h1>
        <p>ارسال درخواست همبازی و مدیریت دریافتی‌ها در یک صفحه</p>
      </header>

      <section className="find-playmate-one pepito-explore-find" aria-label="پیدا کردن همبازی">
        {needsLogin ? (
          <Link to="/auth/login" className="pepito-btn button-1">
            <PawIcon />
            ورود برای پیدا کردن همبازی
          </Link>
        ) : needsPet ? (
          <Link to="/add-pet" className="pepito-btn button-1">
            <PawIcon />
            ثبت پت
          </Link>
        ) : showPetPick ? (
          <div className="find-playmate-one__pick">
            <p className="find-playmate-one__hint">کدوم پتت؟</p>
            <div className="find-playmate-pet-list">
              {myPets.map((pet) => {
                const ui = petProfileToUiPet(pet);
                return (
                  <button
                    key={pet.id}
                    type="button"
                    className="find-playmate-pet-btn"
                    disabled={sending}
                    onClick={() => void runFindForPet(pet)}
                  >
                    <img src={ui.imageUrl} alt="" />
                    <span>
                      <strong>{pet.name}</strong>
                      <small>{[pet.breed, pet.city || pet.ownerCity].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="pepito-btn button-1"
            data-testid="find-playmate-primary"
            disabled={sending || petsLoading}
            onClick={() => void onPrimaryClick()}
          >
            <PawIcon />
            {sending
              ? 'در حال ارسال در تلگرام…'
              : findPhase === 'done'
                ? 'ارسال دوباره درخواست'
                : 'پیدا کردن همبازی'}
          </button>
        )}

        {findError && <p className="auth-error find-playmate-one__status">{findError}</p>}
        {!findError && statusLine && (
          <p className="find-playmate-one__status" role="status">
            {statusLine}
            {findResult?.sampleLine ? ` · ${findResult.sampleLine}` : ''}
          </p>
        )}
      </section>

      <section
        id="requests"
        className={`pepito-explore-section${focusRequests ? ' is-hash-focus' : ''}`}
        aria-label="درخواست‌های من"
      >
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">پیام و همبازی</p>
          <h2>درخواست‌های من</h2>
          <p>دریافتی، ارسالی و پذیرفته‌شده — قبول، رد و ورود به چت.</p>
        </header>
        <PlaymateRequestsPanel embedded />
      </section>
    </div>
  );
}

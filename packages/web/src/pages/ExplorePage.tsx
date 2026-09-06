import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PawPrint, Search, SlidersHorizontal } from 'lucide-react';
import { BRAND, primaryRole, userHasRole, type PetProfile } from '@petdate/shared';
import { PetGridCard } from '../components/PetGridCard';
import { CategoryPetIcon } from '../components/PetAvatar';
import { PlaymateRequestsPanel } from '../components/PlaymateRequestsPanel';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';
import { listPets } from '../lib/api';
import { findAndSendPlaymates, type FindPlaymateResult } from '../lib/playmateActions';
import { petProfileToUiPet } from '../lib/playdateMap';
import type { PetType } from '../types';
import { PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird', 'rabbit'];

const ROLE_EMPTY_MESSAGES: Record<string, { title: string; desc: string; cta?: string; to?: string }> = {
  vet: {
    title: 'حالت دامپزشک',
    desc: 'برای مشاهده همبازی‌ها به عنوان صاحب پت وارد شو یا از مشاوره آنلاین استفاده کن.',
    cta: '🩺 مشاوره دامپزشک',
    to: '/vet-consult',
  },
  no_pet: {
    title: 'هنوز پتی نداری؟',
    desc: 'می‌تونی فروشگاه و کلینیک‌ها رو ببینی یا دنبال پت بگردی.',
    cta: '🛒 فروشگاه پت',
    to: '/shop',
  },
  pet_seeker: {
    title: 'دنبال پت می‌گردی؟',
    desc: 'به زودی آگهی‌های پت‌های قابل‌انتخاب اضافه می‌شه. فعلاً جامعه رو کشف کن.',
    cta: '🏥 کلینیک‌های نزدیک',
    to: '/clinics',
  },
  community_seeker: {
    title: 'جامعه petdate',
    desc: 'به زودی گروه‌ها و رویدادها اضافه می‌شن. فعلاً پت‌های نزدیک رو ببین.',
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
  const { pets, myPet } = usePetStore();
  const { user } = useUserStore();
  const { user: authUser, isLoggedIn } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
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

  const filtered = pets
    .filter((p) => {
      if (p.id === myPet.id) return false;
      if (!p.lookingForPlaymate) return false;
      if (activeCategory !== ALL && p.type !== activeCategory) return false;
      if (search && !p.name.includes(search) && !p.breed.includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

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
        <p>
          {filtered.length} پت نزدیک {myPet.city} — کشف و مدیریت درخواست در یک صفحه
        </p>
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

      <section className="pepito-explore-section" aria-label="نزدیک‌ها">
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">پیشنهادی</p>
          <h2>نزدیک‌ها</h2>
          <p>پت‌های نزدیک که دنبال همبازی هستند.</p>
        </header>

        <div className="search-row-inline pepito-explore-search">
          <div className="search-bar">
            <input
              type="search"
              placeholder="جستجوی نژاد، نام..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-icon">
              <Search size={18} strokeWidth={2} />
            </span>
          </div>
          <button className="filter-btn" aria-label="فیلتر" type="button">
            <SlidersHorizontal size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-item${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <div className="category-circle">
                <CategoryPetIcon type={cat} />
              </div>
              <span>{cat === ALL ? 'همه' : PET_TYPE_LABELS[cat]}</span>
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="pet-grid">
            {filtered.map((pet, i) => (
              <PetGridCard key={pet.id} pet={pet} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
            <h3>پتی پیدا نشد</h3>
            <p>فیلتر رو عوض کن یا بعداً دوباره سر بزن</p>
          </div>
        )}
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint, Search, SlidersHorizontal } from 'lucide-react';
import { primaryRole, userHasRole, type PetProfile } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetGridCard } from '../components/PetGridCard';
import { CategoryPetIcon } from '../components/PetAvatar';
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

export function ExplorePage() {
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

  const myUserId = authUser?.id ?? user.id;
  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');
  const emptyRole = !isPetOwner ? primaryRole(user.roles, user.role) : undefined;
  const roleEmpty = emptyRole ? ROLE_EMPTY_MESSAGES[emptyRole] : null;

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

  const filtered = pets
    .filter((p) => {
      if (p.id === myPet.id) return false;
      if (!p.lookingForPlaymate) return false;
      if (activeCategory !== ALL && p.type !== activeCategory) return false;
      if (search && !p.name.includes(search) && !p.breed.includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  async function onPickMyPet(pet: PetProfile) {
    if (!myUserId) {
      setFindError('برای ارسال درخواست همبازی وارد حساب شو.');
      return;
    }
    setFindPhase('sending');
    setFindError(null);
    setFindResult(null);
    try {
      const result = await findAndSendPlaymates(pet, myUserId);
      setFindResult(result);
      setFindPhase('done');
    } catch (err) {
      setFindError(err instanceof Error ? err.message : 'ارسال درخواست‌ها ناموفق بود');
      setFindPhase('pick');
    }
  }

  if (roleEmpty) {
    return (
      <div className="home-page">
        <div className="page-title-block">
          <BrandMark className="greeting-brand" iconSize={22} />
          <h1>جستجو</h1>
        </div>
        <div className="empty-state empty-state--role">
          <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
          <h3>{roleEmpty.title}</h3>
          <p>{roleEmpty.desc}</p>
          {roleEmpty.cta && roleEmpty.to && (
            <Link to={roleEmpty.to} className="cta-btn cta-btn--inline">{roleEmpty.cta}</Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="home-page">
      <div className="home-header compact">
        <div className="greeting">
          <BrandMark className="greeting-brand" iconSize={22} />
          <h1>جستجو</h1>
          <p>{filtered.length} پت نزدیک {myPet.city}</p>
        </div>
        <div className="search-row-inline">
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
          <button className="filter-btn" aria-label="فیلتر">
            <SlidersHorizontal size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="home-body">
        <section className="find-playmate-panel" aria-label="پیدا کردن همبازی">
          <div className="find-playmate-panel__head">
            <PawPrint size={18} strokeWidth={2} />
            <div>
              <h2>🔍 پیدا کردن همبازی</h2>
              <p>
                مثل ربات: پتت رو انتخاب کن تا درخواست همبازی به‌صورت خودکار برای هم‌گروه‌ها ارسال بشه
                (هم‌کشور ← هم‌استان ← هم‌دسته ← هم‌نژاد ← سن ← جنسیت متفاوت).
              </p>
            </div>
          </div>

          {!isLoggedIn || !myUserId ? (
            <div className="find-playmate-panel__body">
              <p className="auth-error">برای ارسال درخواست وارد حساب شو.</p>
              <Link to="/auth/login" className="cta-btn cta-btn--inline">ورود</Link>
            </div>
          ) : findPhase === 'idle' || findPhase === 'pick' ? (
            <div className="find-playmate-panel__body">
              {petsLoading ? (
                <p>در حال بارگذاری پت‌های تو…</p>
              ) : myPets.length === 0 ? (
                <>
                  <p>اول باید حداقل یک پت ثبت کنی تا برات همبازی پیدا کنیم.</p>
                  <Link to="/add-pet" className="cta-btn cta-btn--inline">➕ ثبت پت</Link>
                </>
              ) : (
                <>
                  <p className="find-playmate-panel__prompt">کدوم پتت رو انتخاب می‌کنی؟</p>
                  <div className="find-playmate-pet-list">
                    {myPets.map((pet) => {
                      const ui = petProfileToUiPet(pet);
                      return (
                        <button
                          key={pet.id}
                          type="button"
                          className="find-playmate-pet-btn"
                          onClick={() => void onPickMyPet(pet)}
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
                </>
              )}
              {findError && <p className="auth-error">{findError}</p>}
            </div>
          ) : findPhase === 'sending' ? (
            <div className="find-playmate-panel__body">
              <p>در حال پیدا کردن همبازی و ارسال درخواست‌ها…</p>
            </div>
          ) : (
            <div className="find-playmate-panel__body find-playmate-panel__result">
              {findResult && findResult.sent === 0 ? (
                <>
                  <h3>همبازی هم‌گروه پیدا نشد</h3>
                  <p>
                    برای <strong>{findResult.sourceName}</strong> فعلاً همبازی هم‌گروه
                    ({findResult.speciesLabel}) پیدا نشد. بعداً دوباره امتحان کن.
                  </p>
                </>
              ) : findResult ? (
                <>
                  <h3>✅ برای {findResult.sourceName} درخواست همبازی ارسال شد</h3>
                  <p>
                    هم‌گروه: {findResult.speciesLabel}
                    <br />
                    ارسال‌شده: <strong>{findResult.sent}</strong> درخواست
                    {findResult.skipped ? ` · رد شده/تکراری: ${findResult.skipped}` : ''}
                  </p>
                  {findResult.sampleLine && (
                    <p className="find-playmate-sample">نمونه: {findResult.sampleLine}</p>
                  )}
                  <p>منتظر پاسخ بمون یا همبازی‌های دیگه رو ببین.</p>
                </>
              ) : null}
              <div className="find-playmate-panel__actions">
                <Link to="/matches" className="cta-btn cta-btn--inline">📬 درخواست‌ها</Link>
                <button
                  type="button"
                  className="cta-btn cta-btn--inline cta-btn--ghost"
                  onClick={() => {
                    setFindPhase('pick');
                    setFindResult(null);
                    setFindError(null);
                  }}
                >
                  🔄 تعویض پت من
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
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
      </div>
    </div>
  );
}

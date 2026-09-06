import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  LogOut,
  MapPin,
  PawPrint,
  Pencil,
  X,
} from 'lucide-react';
import {
  BRAND,
  IRAN_PROVINCES,
  ONBOARDING_STATUS_LABELS,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  citiesForProvince,
  normalizeRoles,
  primaryRole,
  userHasRole,
  type UserGender,
} from '@petdate/shared';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';

const HERO_IMG = '/pepito/uploads/2.jpg';

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const { myPet } = usePetStore();
  const { user, logout, isProfileComplete, saveProfile } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedToast, setSavedToast] = useState(false);

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<UserGender | ''>('');
  const [country, setCountry] = useState('ایران');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setAge(user.age ? String(user.age) : '');
    setGender(user.gender ?? '');
    setCountry(user.country ?? 'ایران');
    setProvince(user.province ?? '');
    setCity(user.city ?? '');
    setBio(user.bio ?? '');
    setInterests(user.interests ?? []);
    setError('');
  }, [user, editing]);

  const cities = useMemo(
    () => (province ? citiesForProvince(province) : []),
    [province]
  );

  if (!user) {
    return null;
  }

  const onboardingLabel =
    !user.onboarding
      ? 'شروع نشده'
      : ONBOARDING_STATUS_LABELS[user.onboarding] ?? user.onboarding;

  const roles = normalizeRoles(user.roles, user.role);
  const mainRole = primaryRole(roles, user.role);
  const needsWizard = !isProfileComplete;
  const isPetOwner = userHasRole(user, 'pet_owner');
  const roleLabel = roles.length
    ? roles.map((r) => USER_ROLE_LABELS[r]).join(' · ')
    : 'انتخاب نشده';
  const locationLabel = [user.city, user.province, user.country].filter(Boolean).join('، ') || '—';
  const avatarSrc = user.avatarUrl || (isPetOwner && myPet.imageUrl ? myPet.imageUrl : '');
  const initial = (user.name || 'پ').trim().slice(0, 1);
  const hasPetName = Boolean(myPet?.name && myPet.name !== 'پت من');
  const genderLabel = user.gender ? USER_GENDER_LABELS[user.gender] : null;

  function openEdit() {
    setSearchParams({ edit: '1' }, { replace: false });
  }

  function closeEdit() {
    setSearchParams({}, { replace: true });
    setError('');
  }

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item].slice(0, 6)
    );
  }

  async function onLogout() {
    setBusy(true);
    await logout();
    navigate('/auth/login', { replace: true });
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('نام را درست وارد کن');
      return;
    }
    const ageNum = Number(age);
    if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 90) {
      setError('سن معتبر نیست');
      return;
    }
    if (!gender) {
      setError('جنسیت را انتخاب کن');
      return;
    }
    if (!country.trim()) {
      setError('کشور را مشخص کن');
      return;
    }
    if (country === 'ایران' && !province) {
      setError('استان را انتخاب کن');
      return;
    }
    if (city.trim().length < 2) {
      setError('شهر را وارد کن');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await saveProfile({
        name: name.trim(),
        age: ageNum,
        gender,
        country,
        province: country === 'ایران' ? province : undefined,
        city: city.trim(),
        bio: bio.trim() || undefined,
        interests,
        onboarding: 'profile_complete',
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2200);
      closeEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره پروفایل ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="pepito-profile pepito-profile--edit">
        <header className="pepito-profile-edit-head">
          <div>
            <p className="pepito-eyebrow">ویرایش</p>
            <h1>پروفایل من</h1>
            <p>همان زبان Pepito — فیلدها را کامل کن و ذخیره کن.</p>
          </div>
          <button
            type="button"
            className="pepito-profile-icon-btn"
            onClick={closeEdit}
            aria-label="انصراف"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </header>

        <form className="pepito-profile-edit-form" onSubmit={(e) => void onSave(e)} noValidate>
          <div className="pepito-profile-edit-grid">
            <label className="pepito-field">
              <span>نام نمایشی</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>

            <label className="pepito-field">
              <span>سن</span>
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
                required
              />
            </label>

            <div className="pepito-field pepito-field--full">
              <span>جنسیت</span>
              <div className="pepito-choice-row" role="group" aria-label="جنسیت">
                {(['male', 'female'] as UserGender[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`pepito-choice${gender === g ? ' is-on' : ''}`}
                    onClick={() => setGender(g)}
                  >
                    {USER_GENDER_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pepito-field pepito-field--full">
              <span>کشور</span>
              <div className="pepito-choice-row" role="group" aria-label="کشور">
                {['ایران', 'سایر'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`pepito-choice${country === c ? ' is-on' : ''}`}
                    onClick={() => {
                      setCountry(c);
                      if (c !== 'ایران') setProvince('');
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {country === 'ایران' ? (
              <label className="pepito-field">
                <span>استان</span>
                <select value={province} onChange={(e) => setProvince(e.target.value)} required>
                  <option value="">انتخاب استان</option>
                  {IRAN_PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={`pepito-field${country !== 'ایران' ? ' pepito-field--full' : ''}`}>
              <span>شهر</span>
              {cities.length > 0 ? (
                <select value={city} onChange={(e) => setCity(e.target.value)} required>
                  <option value="">انتخاب شهر</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={city} onChange={(e) => setCity(e.target.value)} required />
              )}
            </label>

            <label className="pepito-field pepito-field--full">
              <span>درباره من</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="کمی از خودت و پت‌ات بگو…"
              />
            </label>

            <div className="pepito-field pepito-field--full">
              <span>علایق (تا ۶ مورد)</span>
              <div className="pepito-choice-wrap">
                {PROFILE_INTEREST_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`pepito-choice pepito-choice--sm${interests.includes(item) ? ' is-on' : ''}`}
                    onClick={() => toggleInterest(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="pepito-profile-error">{error}</p> : null}

          <div className="pepito-profile-edit-actions">
            <button type="submit" className="pepito-btn button-1" disabled={busy}>
              <PawIcon />
              {busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </button>
            <button
              type="button"
              className="pepito-btn pepito-btn--ghost"
              onClick={closeEdit}
              disabled={busy}
            >
              انصراف
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="pepito-profile">
      <section
        className="pepito-profile-hero"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
        aria-label="پروفایل"
      >
        <div className="pepito-profile-hero-wash" aria-hidden />
        <div className="pepito-profile-hero-inner">
          <p className="pepito-kicker pepito-profile-kicker">
            <span className="pepito-kicker-dot" aria-hidden>
              <PawPrint size={16} />
            </span>
            {BRAND.taglineFa}
          </p>
          <p className="pepito-home-brand">{BRAND.displayName}</p>

          <div className="pepito-profile-identity">
            <div className="pepito-profile-avatar" aria-hidden>
              {avatarSrc ? (
                <img src={avatarSrc} alt="" />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <div className="pepito-profile-identity-text">
              <h1>{user.name}</h1>
              <p className="pepito-profile-loc">
                <MapPin size={15} strokeWidth={2} aria-hidden />
                {locationLabel}
              </p>
              <p className="pepito-profile-roles">{roleLabel}</p>
            </div>
          </div>

          <div className="pepito-home-cta pepito-profile-cta">
            {needsWizard ? (
              <Link to="/onboarding/profile" className="pepito-btn button-1">
                <PawIcon />
                تکمیل پروفایل
              </Link>
            ) : (
              <button type="button" className="pepito-btn button-1" onClick={openEdit}>
                <Pencil size={16} strokeWidth={2.25} aria-hidden />
                ویرایش
              </button>
            )}
            {isPetOwner ? (
              <Link to="/add-pet" className="pepito-btn pepito-btn--ghost pepito-home-cta-ghost">
                پت‌ها
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="pepito-profile-block" aria-label="جزئیات">
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">درباره</p>
          <h2>شناسنامه کوتاه</h2>
          <p>نقش، وضعیت و چند خط از تو — بدون شلوغی.</p>
        </header>

        <dl className="pepito-profile-meta">
          <div>
            <dt>نقش فعال</dt>
            <dd>{mainRole ? USER_ROLE_LABELS[mainRole] : '—'}</dd>
          </div>
          <div>
            <dt>وضعیت</dt>
            <dd>
              <span
                className={`pepito-profile-badge${needsWizard ? ' is-warn' : ' is-ok'}`}
              >
                {onboardingLabel}
              </span>
            </dd>
          </div>
          {user.age ? (
            <div>
              <dt>سن</dt>
              <dd>{user.age}</dd>
            </div>
          ) : null}
          {genderLabel ? (
            <div>
              <dt>جنسیت</dt>
              <dd>{genderLabel}</dd>
            </div>
          ) : null}
          {user.phone ? (
            <div>
              <dt>موبایل</dt>
              <dd dir="ltr">{user.phone}</dd>
            </div>
          ) : null}
        </dl>

        {user.bio ? (
          <p className="pepito-profile-bio">{user.bio}</p>
        ) : (
          <p className="pepito-profile-bio pepito-profile-bio--empty">
            هنوز بیویی ننوشتی — با ویرایش می‌تونی اضافه کنی.
          </p>
        )}

        {user.interests && user.interests.length > 0 ? (
          <ul className="pepito-profile-tags">
            {user.interests.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {isPetOwner ? (
        <section className="pepito-profile-block" aria-label="پت‌های من">
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">پت‌ها</p>
            <h2>پت‌های من</h2>
            <p>خلاصه پت ثبت‌شده — مدیریت کامل از مسیر پت‌ها.</p>
          </header>

          <Link to="/add-pet" className="pepito-profile-pet">
            <PetAvatar
              type={myPet.type}
              size="sm"
              imageUrl={myPet.imageUrl}
              name={myPet.name}
            />
            <div>
              <strong>{hasPetName ? myPet.name : 'هنوز پتی ثبت نشده'}</strong>
              <span>
                {hasPetName
                  ? `${myPet.breed} · ${formatAge(myPet)} · ${myPet.neighborhood || locationLabel}`
                  : 'اولین پت را اضافه کن'}
              </span>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="pepito-profile-block pepito-profile-block--quiet" aria-label="حساب">
        <button
          type="button"
          className="pepito-profile-logout"
          onClick={() => void onLogout()}
          disabled={busy}
        >
          <LogOut size={18} strokeWidth={2} aria-hidden />
          {busy ? 'خروج…' : 'خروج از حساب'}
        </button>
      </section>

      {savedToast ? (
        <div className="toast" role="status">
          پروفایل ذخیره شد
        </div>
      ) : null}
    </div>
  );
}

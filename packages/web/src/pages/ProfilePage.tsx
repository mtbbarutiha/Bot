import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, LogOut, MapPin, PawPrint, X } from 'lucide-react';
import {
  BRAND,
  FACE_VERIFY_REWARD,
  IRAN_PROVINCES,
  ONBOARDING_STATUS_LABELS,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  USER_ROLE_LABELS,
  buildProfileCardLines,
  citiesForProvince,
  computeProfileCompletion,
  faceVerifyButtonLabel,
  formatFaInt,
  normalizeRoles,
  parseUserAge,
  primaryRole,
  userHasRole,
  type User,
  type UserGender,
} from '@petdate/shared';
import { AgePicker } from '../components/AgePicker';
import { PetAvatar } from '../components/PetAvatar';
import { ProfileAvatarEditor } from '../components/ProfileAvatarEditor';
import { RoleSwitchControl } from '../components/RoleSwitchControl';
import { formatAge } from '../data/mock';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import {
  deleteUserAccountById,
  fetchProfileCard,
  listUserBlocks,
  listUserContacts,
  patchWebProfile,
  setSilentChatRequests,
} from '../lib/api';

const HERO_IMG = '/pepito/uploads/2.jpg';

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

type PanelKind = 'contacts' | 'likes' | 'interactions' | 'blocked' | 'account' | null;

export function ProfilePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const editing = searchParams.get('edit') === '1';
  const { myPet } = usePetStore();
  const { user, token, logout, isProfileComplete, saveProfile, refreshMe } = useAuthStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  const [cardUser, setCardUser] = useState<User | null>(null);
  const [interactions, setInteractions] = useState<{
    likes: number;
    views: number;
    playdatesTotal: number;
    playdatesPending: number;
    playdatesAccepted: number;
  } | null>(null);
  const [panel, setPanel] = useState<PanelKind>(null);
  const [panelLines, setPanelLines] = useState<string[]>([]);
  const [panelBusy, setPanelBusy] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const card = await fetchProfileCard(user.id);
        if (cancelled) return;
        setCardUser(card.user);
        setInteractions(card.extras?.interactions ?? null);
      } catch {
        if (!cancelled) setCardUser(user);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const cities = useMemo(() => (province ? citiesForProvince(province) : []), [province]);

  if (!user) return null;

  const userId = user.id;
  const display = cardUser ?? user;
  const cardLines = buildProfileCardLines(display);
  const completion = computeProfileCompletion(display);
  const onboardingLabel = !display.onboarding
    ? 'شروع نشده'
    : ONBOARDING_STATUS_LABELS[display.onboarding] ?? display.onboarding;
  const mainRole = primaryRole(normalizeRoles(display.roles, display.role), display.role);
  const needsWizard = !isProfileComplete;
  const isPetOwner = userHasRole(display, 'pet_owner');
  const locationLabel = [display.city, display.province, display.country].filter(Boolean).join('، ') || '—';
  const avatarSrc = display.avatarUrl || (isPetOwner && myPet.imageUrl ? myPet.imageUrl : '');
  const hasPetName = Boolean(myPet?.name && myPet.name !== 'پت من');
  const genderLabel = display.gender ? USER_GENDER_LABELS[display.gender] : null;
  const likes = display.likesCount ?? 0;
  const contactsCount = display.contactsCount ?? 0;
  const verifyStatus = display.verificationStatus ?? 'none';
  const silentOn = Boolean(display.silentChatRequests);

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
    if (name.trim().length < 2) { setError('نام را درست وارد کن'); return; }
    const ageNum = parseUserAge(age);
    if (ageNum == null) { setError('سن معتبر نیست'); return; }
    if (!gender) { setError('جنسیت را انتخاب کن'); return; }
    if (!country.trim()) { setError('کشور را مشخص کن'); return; }
    if (country === 'ایران' && !province) { setError('استان را انتخاب کن'); return; }
    if (city.trim().length < 2) { setError('شهر را وارد کن'); return; }
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
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره پروفایل ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  async function openContacts() {
    setPanel('contacts');
    setPanelBusy(true);
    setPanelLines([]);
    try {
      const list = await listUserContacts(userId);
      setPanelLines(
        list.length
          ? list.map((c, i) => `${formatFaInt(i + 1)}. ${c.contactName || 'بدون نام'}${c.contactUsername ? ` @${c.contactUsername}` : ''}`)
          : ['هنوز مخاطبی نداری. از چت همبازی می‌تونی اضافه کنی.']
      );
    } catch {
      setPanelLines(['لیست مخاطبین در دسترس نیست.']);
    } finally {
      setPanelBusy(false);
    }
  }
  async function openBlocked() {
    setPanel('blocked');
    setPanelBusy(true);
    setPanelLines([]);
    try {
      const list = await listUserBlocks(userId);
      setPanelLines(
        list.length
          ? list.map((b, i) => `${formatFaInt(i + 1)}. ${b.blockedName || 'بدون نام'}${b.blockedUsername ? ` @${b.blockedUsername}` : ''}`)
          : ['لیست بلاک خالی است.']
      );
    } catch {
      setPanelLines(['لیست بلاک در دسترس نیست.']);
    } finally {
      setPanelBusy(false);
    }
  }
  function openLikes() {
    setPanel('likes');
    setPanelLines([`تعداد لایک دریافتی: ${formatFaInt(likes)}`, 'لایک‌ها از بازدید و تعامل دیگران روی پروفایل/پت جمع می‌شود.']);
  }
  function openInteractions() {
    setPanel('interactions');
    setPanelLines([
      `❤️ لایک: ${formatFaInt(interactions?.likes ?? likes)}`,
      `👁️ بازدید: ${formatFaInt(interactions?.views ?? display.profileViews ?? 0)}`,
      `🐾 درخواست همبازی: ${formatFaInt(interactions?.playdatesTotal ?? 0)}`,
      `⏳ در انتظار: ${formatFaInt(interactions?.playdatesPending ?? 0)}`,
      `✅ پذیرفته: ${formatFaInt(interactions?.playdatesAccepted ?? 0)}`,
    ]);
  }
  async function toggleSilent() {
    setBusy(true);
    try {
      const updated = await setSilentChatRequests(userId, !silentOn);
      setCardUser(updated);
      await refreshMe();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر سایلنت ناموفق بود');
    } finally {
      setBusy(false);
    }
  }
  async function deactivateAccount() {
    if (!token) return;
    setBusy(true);
    try {
      await patchWebProfile(token, { isActive: false });
      await refreshMe();
      setPanel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'غیرفعال‌سازی ناموفق بود');
    } finally {
      setBusy(false);
    }
  }
  async function activateAccount() {
    if (!token) return;
    setBusy(true);
    try {
      await patchWebProfile(token, { isActive: true });
      await refreshMe();
      setPanel(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فعال‌سازی ناموفق بود');
    } finally {
      setBusy(false);
    }
  }
  async function deleteAccount() {
    if (!window.confirm('مطمئنی حساب حذف شود؟ این کار برگشت‌پذیر نیست.')) return;
    setBusy(true);
    try {
      await deleteUserAccountById(userId);
      await logout();
      navigate('/auth/login', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف حساب ناموفق بود');
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <div className="pepito-profile pepito-profile--edit">
        <header className="pepito-profile-edit-head">
          <div>
            <p className="pepito-eyebrow">{BRAND.displayName}</p>
            <h1>ویرایش پروفایل</h1>
            <p>عکس، مشخصات و علایق را یک‌جا به‌روز کن.</p>
          </div>
          <button type="button" className="pepito-profile-icon-btn" onClick={closeEdit} aria-label="انصراف">
            <X size={20} strokeWidth={2} />
          </button>
        </header>
        <form className="pepito-profile-edit-form" onSubmit={(e) => void onSave(e)} noValidate>
          <section className="pepito-profile-edit-avatar-block" aria-label="عکس پروفایل">
            <ProfileAvatarEditor imageUrl={avatarSrc} name={user.name} size="xl" />
            <p className="pepito-profile-edit-avatar-hint">برای تغییر عکس، روی آیکون دوربین بزن.</p>
          </section>
          <section className="pepito-profile-edit-section" aria-label="مشخصات">
            <h2 className="pepito-profile-edit-section-title">مشخصات</h2>
            <div className="pepito-profile-edit-grid">
              <label className="pepito-field">
                <span>نام نمایشی</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              </label>
              <div className="pepito-field">
                <span>سن</span>
                <AgePicker value={age} onChange={setAge} />
              </div>
              <div className="pepito-field pepito-field--full">
                <span>جنسیت</span>
                <div className="pepito-choice-row" role="group" aria-label="جنسیت">
                  {(['male', 'female'] as UserGender[]).map((g) => (
                    <button key={g} type="button" className={`pepito-choice${gender === g ? ' is-on' : ''}`} onClick={() => setGender(g)}>
                      {USER_GENDER_LABELS[g]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section className="pepito-profile-edit-section" aria-label="موقعیت">
            <h2 className="pepito-profile-edit-section-title">موقعیت</h2>
            <div className="pepito-profile-edit-grid">
              <div className="pepito-field pepito-field--full">
                <span>کشور</span>
                <div className="pepito-choice-row" role="group" aria-label="کشور">
                  {['ایران', 'سایر'].map((c) => (
                    <button key={c} type="button" className={`pepito-choice${country === c ? ' is-on' : ''}`} onClick={() => { setCountry(c); if (c !== 'ایران') setProvince(''); }}>
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
                    {IRAN_PROVINCES.map((p) => (<option key={p} value={p}>{p}</option>))}
                  </select>
                </label>
              ) : null}
              <label className={`pepito-field${country !== 'ایران' ? ' pepito-field--full' : ''}`}>
                <span>شهر</span>
                {cities.length > 0 ? (
                  <select value={city} onChange={(e) => setCity(e.target.value)} required>
                    <option value="">انتخاب شهر</option>
                    {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                ) : (
                  <input value={city} onChange={(e) => setCity(e.target.value)} required />
                )}
              </label>
            </div>
          </section>
          <section className="pepito-profile-edit-section" aria-label="درباره">
            <h2 className="pepito-profile-edit-section-title">درباره من</h2>
            <div className="pepito-profile-edit-grid">
              <label className="pepito-field pepito-field--full">
                <span>بیو</span>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="کمی از خودت و پت‌ات بگو…" />
              </label>
              <div className="pepito-field pepito-field--full">
                <span>علایق (تا ۶ مورد)</span>
                <div className="pepito-choice-wrap">
                  {PROFILE_INTEREST_OPTIONS.map((item) => (
                    <button key={item} type="button" className={`pepito-choice pepito-choice--sm${interests.includes(item) ? ' is-on' : ''}`} onClick={() => toggleInterest(item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          {error ? <p className="pepito-profile-error">{error}</p> : null}
          <div className="pepito-profile-edit-actions">
            <button type="submit" className="pepito-btn button-1" disabled={busy}>
              <PawIcon />
              {busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </button>
            <button type="button" className="pepito-btn pepito-btn--ghost" onClick={closeEdit} disabled={busy}>انصراف</button>
          </div>
        </form>
      </div>
    );
  }

  const panelTitle =
    panel === 'contacts' ? 'مخاطبین'
      : panel === 'likes' ? 'لایک‌ها'
        : panel === 'interactions' ? 'تعاملات'
          : panel === 'blocked' ? 'بلاک‌شده‌ها'
            : panel === 'account' ? 'حذف / غیرفعال‌سازی' : '';

  return (
    <div className="pepito-profile">
      <section className="pepito-profile-hero" style={{ backgroundImage: `url(${HERO_IMG})` }} aria-label="پروفایل">
        <div className="pepito-profile-hero-wash" aria-hidden />
        <div className="pepito-profile-hero-inner">
          <p className="pepito-kicker pepito-profile-kicker">
            <span className="pepito-kicker-dot" aria-hidden><PawPrint size={16} /></span>
            {BRAND.displayName}
          </p>
          <p className="pepito-home-brand pepito-profile-brand-sub">{BRAND.taglineFa}</p>
          <div className="pepito-profile-identity">
            <ProfileAvatarEditor imageUrl={avatarSrc} name={display.name} size="xl" />
            <div className="pepito-profile-identity-text">
              <h1>{display.name || 'پروفایل من'}</h1>
              <p className="pepito-profile-loc"><MapPin size={15} strokeWidth={2} aria-hidden />{locationLabel}</p>
              {mainRole ? (
                <p className="pepito-profile-active-chip"><span>نقش فعال</span>{USER_ROLE_LABELS[mainRole]}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="pepito-profile-block pepito-profile-card-block" aria-label="کارت پروفایل">
        <ul className="pepito-profile-card-lines">
          <li>{cardLines.likes}</li>
          <li>
            {cardLines.completion}
            <span className="pepito-profile-completion-bar" aria-hidden><span style={{ width: `${completion.percent}%` }} /></span>
          </li>
          <li><code dir="ltr">{cardLines.userId}</code></li>
          <li>{cardLines.identity}</li>
          <li>{cardLines.location}</li>
          <li>{cardLines.purpose}</li>
          <li>{cardLines.interests}</li>
          <li>{cardLines.walletViews}</li>
          <li>{cardLines.contacts}</li>
          <li>{cardLines.photo}</li>
          <li>{cardLines.verification}</li>
          <li>{cardLines.locationStatus}</li>
        </ul>
        {display.isActive === false ? <p className="pepito-profile-inactive-note">⏸ حساب فعلاً غیرفعال است</p> : null}
      </section>

      <section className="pepito-profile-block" aria-label="اقدامات پروفایل">
        <div className="pepito-profile-actions">
          <button type="button" className="pepito-profile-action" onClick={openLikes}>❤️ {formatFaInt(likes)}</button>
          <button type="button" className="pepito-profile-action" onClick={() => void openContacts()}>
            👥 مخاطبین ({contactsCount > 0 ? formatFaInt(contactsCount) : '−'})
          </button>
          <button type="button" className="pepito-profile-action" onClick={openEdit}>📝 ویرایش پروفایل</button>
          {needsWizard ? (
            <Link to="/onboarding/profile" className="pepito-profile-action pepito-profile-action--ok">📋 تکمیل پروفایل</Link>
          ) : (
            <button type="button" className="pepito-profile-action" onClick={openEdit}>📋 تکمیل پروفایل</button>
          )}
          <button type="button" className="pepito-profile-action" onClick={openInteractions}>🔄 تعاملات</button>
          <button
            type="button"
            className={`pepito-profile-action${verifyStatus === 'none' || verifyStatus === 'rejected' ? ' pepito-profile-action--ok' : ''}`}
            onClick={() => {
              setPanel('likes');
              setPanelLines([
                faceVerifyButtonLabel(verifyStatus),
                verifyStatus === 'verified' ? 'پروفایلت احراز شده است.' : verifyStatus === 'pending' ? 'درخواست احراز در صف بررسی است.' : `جایزه تأیید: ${formatFaInt(FACE_VERIFY_REWARD)} سکه — از ربات «احراز چهره» بزن.`,
              ]);
            }}
          >
            {faceVerifyButtonLabel(verifyStatus)}
          </button>
          <button type="button" className="pepito-profile-action pepito-profile-action--wide pepito-profile-action--danger" onClick={() => void openBlocked()}>
            🚫 بلاک‌شده‌ها
          </button>
          <button type="button" className="pepito-profile-action pepito-profile-action--wide" onClick={() => void toggleSilent()} disabled={busy}>
            {silentOn ? '🔔 سایلنت خاموش (روشن است)' : '🔇 سایلنت درخواست چت'}
          </button>
          <button type="button" className="pepito-profile-action pepito-profile-action--wide pepito-profile-action--danger" onClick={() => setPanel('account')}>
            🔴 حذف / غیرفعال‌سازی حساب
          </button>
        </div>
      </section>

      {panel ? (
        <section className="pepito-profile-block pepito-profile-panel" aria-label={panelTitle}>
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">جزئیات</p>
            <h2>{panelTitle}</h2>
          </header>
          {panelBusy ? <p>در حال بارگذاری…</p> : null}
          {panel === 'account' ? (
            <div className="pepito-profile-account-actions">
              {display.isActive !== false ? (
                <button type="button" className="pepito-btn pepito-btn--ghost" disabled={busy} onClick={() => void deactivateAccount()}>⏸ غیرفعال‌سازی</button>
              ) : (
                <button type="button" className="pepito-btn button-1" disabled={busy} onClick={() => void activateAccount()}>▶️ فعال‌سازی</button>
              )}
              <button type="button" className="pepito-btn pepito-profile-action--danger-solid" disabled={busy} onClick={() => void deleteAccount()}>🗑 حذف حساب</button>
              <button type="button" className="pepito-btn pepito-btn--ghost" onClick={() => setPanel(null)}>بستن</button>
            </div>
          ) : (
            <>
              <ul className="pepito-profile-panel-list">{panelLines.map((line) => <li key={line}>{line}</li>)}</ul>
              <button type="button" className="pepito-btn pepito-btn--ghost" onClick={() => setPanel(null)}>بستن</button>
            </>
          )}
        </section>
      ) : null}

      <section className="pepito-profile-block pepito-profile-role-block" aria-label="تغییر نقش">
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">نقش</p>
          <h2>نقش‌های من</h2>
          <p>نقش فعال را ببین و با یک لمس عوض کن.</p>
        </header>
        <RoleSwitchControl variant="profile" />
      </section>

      <section className="pepito-profile-block" aria-label="درباره">
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">درباره</p>
          <h2>شناسنامه کوتاه</h2>
          <p>سن، جنسیت، وضعیت و چند خط از تو.</p>
        </header>
        <dl className="pepito-profile-facts">
          {display.age ? <div><dt>سن</dt><dd>{display.age}</dd></div> : null}
          {genderLabel ? <div><dt>جنسیت</dt><dd>{genderLabel}</dd></div> : null}
          <div>
            <dt>وضعیت</dt>
            <dd><span className={`pepito-profile-badge${needsWizard ? ' is-warn' : ' is-ok'}`}>{onboardingLabel}</span></dd>
          </div>
          {display.phone ? <div><dt>موبایل</dt><dd dir="ltr">{display.phone}</dd></div> : null}
        </dl>
        {display.bio ? <p className="pepito-profile-bio">{display.bio}</p> : (
          <p className="pepito-profile-bio pepito-profile-bio--empty">هنوز بیویی ننوشتی — با ویرایش می‌تونی اضافه کنی.</p>
        )}
        {display.interests && display.interests.length > 0 ? (
          <ul className="pepito-profile-tags">{display.interests.map((item) => <li key={item}>{item}</li>)}</ul>
        ) : null}
      </section>

      {isPetOwner ? (
        <section className="pepito-profile-block" aria-label="پت‌های من">
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">پت‌ها</p>
            <h2>پت‌های من</h2>
            <p>خلاصه پت ثبت‌شده — مدیریت کامل از مسیر پت‌ها.</p>
          </header>
          <Link to="/add-pet" className="pepito-profile-pet-row">
            <PetAvatar type={myPet.type} size="sm" imageUrl={myPet.imageUrl} name={myPet.name} />
            <div className="pepito-profile-pet-row-text">
              <strong>{hasPetName ? myPet.name : 'هنوز پتی ثبت نشده'}</strong>
              <span>{hasPetName ? `${myPet.breed} · ${formatAge(myPet)} · ${myPet.neighborhood || locationLabel}` : 'اولین پت را اضافه کن'}</span>
            </div>
            <ChevronLeft size={18} strokeWidth={2.25} className="pepito-profile-pet-row-chevron" aria-hidden />
          </Link>
        </section>
      ) : null}

      <section className="pepito-profile-block pepito-profile-block--quiet" aria-label="حساب">
        {error ? <p className="pepito-profile-error">{error}</p> : null}
        <button type="button" className="pepito-profile-logout" onClick={() => void onLogout()} disabled={busy}>
          <LogOut size={18} strokeWidth={2} aria-hidden />
          {busy ? 'خروج…' : 'خروج از حساب'}
        </button>
      </section>
      {savedToast ? <div className="toast" role="status">ذخیره شد</div> : null}
    </div>
  );
}

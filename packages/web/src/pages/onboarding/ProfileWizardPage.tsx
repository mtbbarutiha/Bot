import { FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  IRAN_PROVINCES,
  PROFILE_INTEREST_OPTIONS,
  USER_GENDER_LABELS,
  citiesForProvince,
  type UserGender,
} from '@petdate/shared';
import { AuthShell } from '../../components/AuthShell';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useUserStore } from '../../hooks/useUserStore';
import { sanitizeNext } from '../../lib/authRedirect';

const STEPS = [
  'name',
  'age',
  'gender',
  'country',
  'province',
  'city',
  'bio',
  'interests',
] as const;

/** فیلدهایی که در ربات با «⏭ رد کردن» قابل عبورند */
const FIELD_SKIPPABLE = new Set<(typeof STEPS)[number]>(['bio', 'interests']);

export function ProfileWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = sanitizeNext((location.state as { next?: string } | null)?.next, '/home');
  const { user, saveProfile, isLoggedIn } = useAuthStore();
  const { saveOnboardingToApi } = useUserStore();
  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx]!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [age, setAge] = useState(user?.age ? String(user.age) : '');
  const [gender, setGender] = useState<UserGender | ''>(user?.gender ?? '');
  const [country, setCountry] = useState(user?.country ?? 'ایران');
  const [province, setProvince] = useState(user?.province ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [interests, setInterests] = useState<string[]>(user?.interests ?? []);

  const cities = useMemo(
    () => (province ? citiesForProvince(province) : []),
    [province]
  );

  if (!isLoggedIn) {
    navigate(`/auth/login?next=${encodeURIComponent(returnTo)}`, { replace: true });
    return null;
  }

  function toggleInterest(item: string) {
    setInterests((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item].slice(0, 6)
    );
  }

  function advanceFrom(idx: number) {
    if (idx >= STEPS.length - 1) {
      void finish();
      return;
    }
    let nextIdx = idx + 1;
    // skip province when not Iran
    if (STEPS[nextIdx] === 'province' && country !== 'ایران') nextIdx += 1;
    setStepIdx(nextIdx);
  }

  async function finish() {
    setBusy(true);
    setError('');
    try {
      const saved = await saveProfile({
        name: name.trim(),
        age: Number(age),
        gender,
        country,
        province: country === 'ایران' ? province : undefined,
        city: city.trim(),
        bio: bio.trim() || undefined,
        interests,
        onboarding: 'profile_complete',
      });
      const isOwner =
        saved.role === 'pet_owner' ||
        (saved.roles ?? []).includes('pet_owner');
      navigate(isOwner ? '/onboarding/pet' : returnTo, {
        replace: true,
        state: { next: returnTo },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره پروفایل ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  /** مثل ربات: «⏭ فعلاً رد کن» — ویزارد را ترک می‌کند، پروفایل ناقص می‌ماند */
  async function skipWizardLater() {
    setBusy(true);
    setError('');
    try {
      await saveOnboardingToApi('profile_incomplete');
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد کردن ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  /** رد کردن فیلد اختیاری فعلی (بیو / علایق) */
  function skipCurrentField() {
    setError('');
    if (step === 'bio') setBio('');
    if (step === 'interests') setInterests([]);
    advanceFrom(stepIdx);
  }

  function goNext(e?: FormEvent) {
    e?.preventDefault();
    if (step === 'name' && name.trim().length < 2) return setError('نام را درست وارد کن');
    if (step === 'age') {
      const n = Number(age);
      if (!Number.isFinite(n) || n < 13 || n > 90) return setError('سن معتبر نیست');
    }
    if (step === 'gender' && !gender) return setError('جنسیت را انتخاب کن');
    if (step === 'country' && !country.trim()) return setError('کشور را مشخص کن');
    if (step === 'province' && country === 'ایران' && !province) {
      return setError('استان را انتخاب کن');
    }
    if (step === 'city' && city.trim().length < 2) return setError('شهر را وارد کن');

    setError('');
    advanceFrom(stepIdx);
  }

  function back() {
    let prev = stepIdx - 1;
    if (prev >= 0 && STEPS[prev] === 'province' && country !== 'ایران') prev -= 1;
    setStepIdx(Math.max(0, prev));
  }

  return (
    <AuthShell wide>
      <p className="pepito-auth-kicker">پروفایل</p>
      <h1>ساخت پروفایل</h1>
      <p className="auth-lead">
        همان مراحل ربات — مرحله {stepIdx + 1} از {STEPS.length}. اگر الان وقت نداری می‌تونی فعلاً رد کنی.
      </p>
      <div className="wizard-progress">
        <span style={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }} />
      </div>

      <form className="auth-form" onSubmit={goNext}>
          {step === 'name' && (
            <label>
              نام نمایشی
              <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
            </label>
          )}
          {step === 'age' && (
            <label>
              سن
              <input
                value={age}
                onChange={(e) => setAge(e.target.value)}
                inputMode="numeric"
                required
                autoFocus
              />
            </label>
          )}
          {step === 'gender' && (
            <div className="chip-grid">
              {(['male', 'female'] as UserGender[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip${gender === g ? ' is-on' : ''}`}
                  onClick={() => setGender(g)}
                >
                  {USER_GENDER_LABELS[g]}
                </button>
              ))}
            </div>
          )}
          {step === 'country' && (
            <div className="chip-grid">
              {['ایران', 'سایر'].map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip${country === c ? ' is-on' : ''}`}
                  onClick={() => {
                    setCountry(c);
                    if (c !== 'ایران') setProvince('');
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {step === 'province' && (
            <label>
              استان
              <select value={province} onChange={(e) => setProvince(e.target.value)} required>
                <option value="">انتخاب استان</option>
                {IRAN_PROVINCES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          )}
          {step === 'city' && (
            <label>
              شهر
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
          )}
          {step === 'bio' && (
            <label>
              درباره من (اختیاری)
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="کمی از خودت و پت‌ات بگو…"
              />
            </label>
          )}
          {step === 'interests' && (
            <div className="chip-grid">
              {PROFILE_INTEREST_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`chip${interests.includes(item) ? ' is-on' : ''}`}
                  onClick={() => toggleInterest(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <div className="wizard-nav">
            {stepIdx > 0 && (
              <button type="button" className="auth-link-btn" onClick={back}>
                قبلی
              </button>
            )}
            <button type="submit" className="pepito-btn button-1 auth-submit" disabled={busy}>
              {stepIdx >= STEPS.length - 1
                ? busy
                  ? 'در حال ذخیره…'
                  : 'ثبت پروفایل'
                : 'ادامه'}
            </button>
          </div>

          {FIELD_SKIPPABLE.has(step) && (
            <button
              type="button"
              className="pepito-btn pepito-btn--ghost auth-skip-btn"
              onClick={skipCurrentField}
              disabled={busy}
            >
              ⏭ رد کردن
            </button>
          )}

          <button
            type="button"
            className="pepito-btn pepito-btn--ghost auth-skip-btn"
            onClick={() => void skipWizardLater()}
            disabled={busy}
          >
            ⏭ فعلاً رد کن
          </button>
        </form>
    </AuthShell>
  );
}

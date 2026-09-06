import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeRoles, userHasRole } from '@petdate/shared';
import { AuthShell } from '../../components/AuthShell';
import { useAuthStore } from '../../hooks/useAuthStore';
import { sanitizeNext } from '../../lib/authRedirect';

type OtpCredentialLike = { code?: string };

/** Chrome Android Web OTP — typed loosely (not in all TS DOM libs). */
type OtpCredentialRequestOptions = CredentialRequestOptions & {
  otp?: { transport: Array<'sms'> };
};

function digitsOnly(raw: string): string {
  return String(raw ?? '')
    .replace(/[^\d۰-۹٠-٩]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .slice(0, 5);
}

export function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = sanitizeNext(
    searchParams.get('next') || (location.state as { next?: string } | null)?.next,
    '/home'
  );
  const {
    pendingChannel,
    pendingTarget,
    pendingDevCode,
    verifyOtp,
    requestOtp,
  } = useAuthStore();
  const navDevCode = (location.state as { devCode?: string } | null)?.devCode;
  const initialDev = navDevCode || pendingDevCode || '';
  const [code, setCode] = useState(digitsOnly(initialDev));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState(() =>
    initialDev ? `کد توسعه (فقط لوکال): ${initialDev}` : ''
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!pendingChannel || !pendingTarget) {
      navigate(`/auth/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [pendingChannel, pendingTarget, navigate, next]);

  async function submitCode(raw: string) {
    const value = digitsOnly(raw);
    if (value.length < 5 || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const user = await verifyOtp(value);
      const roles = normalizeRoles(user.roles, user.role);
      const complete =
        user.onboarding === 'profile_complete' ||
        Boolean(user.name?.trim() && user.age && user.gender && user.country && user.city);
      if (!roles.length) {
        navigate('/onboarding/role', { replace: true, state: { next } });
      } else if (!complete) {
        navigate('/onboarding/profile', { replace: true, state: { next } });
      } else if (userHasRole(user, 'pet_owner') && user.onboarding !== 'profile_complete') {
        navigate('/onboarding/pet', { replace: true, state: { next } });
      } else {
        navigate(next, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تأیید کد ناموفق بود');
      submittingRef.current = false;
    } finally {
      setBusy(false);
    }
  }

  /** iOS/Safari SMS Autofill + Chrome Android Web OTP API */
  useEffect(() => {
    if (pendingChannel !== 'phone') return;

    const ac = new AbortController();
    const nav = navigator as Navigator & {
      credentials?: CredentialsContainer;
    };

    if (nav.credentials?.get) {
      const req: OtpCredentialRequestOptions = {
        otp: { transport: ['sms'] },
        signal: ac.signal,
      };
      void nav.credentials
        .get(req)
        .then((cred) => {
          const otp = cred as OtpCredentialLike | null;
          const filled = digitsOnly(otp?.code ?? '');
          if (filled.length >= 5) {
            setCode(filled);
            void submitCode(filled);
          }
        })
        .catch(() => {
          /* user dismissed / unsupported */
        });
    }

    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listen once per phone challenge
  }, [pendingChannel, pendingTarget]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await submitCode(code);
  }

  async function resend() {
    if (!pendingChannel || !pendingTarget) return;
    setBusy(true);
    setError('');
    submittingRef.current = false;
    try {
      const res = await requestOtp(pendingChannel, pendingTarget);
      if (res.devCode) {
        setDevHint(`کد توسعه (فقط لوکال): ${res.devCode}`);
        setCode(digitsOnly(res.devCode));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال مجدد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      backTo={`/auth/login?next=${encodeURIComponent(next)}`}
      backLabel="تغییر شماره / ایمیل"
      bannerTitle="تأیید هویت"
      bannerLead="کد پیامک را وارد کن — روی موبایل معمولاً خودش پر می‌شود"
      bannerImage="/pepito/uploads/4.jpg"
    >
      <p className="pepito-auth-kicker">تأیید هویت</p>
      <h1>کد یکبارمصرف</h1>
      <p className="auth-lead">
        کد ۵ رقمی برای <strong>{pendingTarget}</strong> ارسال شد
        {pendingChannel === 'phone'
          ? ' — پیامک را باز کن یا صبر کن تا خودکار وارد شود'
          : ' (ایمیل در لاگ سرور)'}
        .
      </p>
      <form className="auth-form" onSubmit={onSubmit} autoComplete="on">
        <label>
          کد تأیید
          <input
            ref={inputRef}
            name="one-time-code"
            id="otp-code"
            value={code}
            onChange={(e) => {
              const nextCode = digitsOnly(e.target.value);
              setCode(nextCode);
              if (nextCode.length === 5) {
                void submitCode(nextCode);
              }
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            pattern="[0-9]*"
            maxLength={5}
            placeholder="-----"
            required
            autoFocus
            enterKeyHint="done"
            aria-label="کد یکبارمصرف پیامک"
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {devHint && <p className="auth-dev">{devHint}</p>}
        <button
          type="submit"
          className="pepito-btn button-1 auth-submit"
          disabled={busy || code.trim().length < 5}
        >
          {busy ? 'در حال بررسی…' : 'تأیید و ادامه'}
        </button>
      </form>
      <div className="auth-secondary-actions">
        <button type="button" className="auth-link-btn" onClick={resend} disabled={busy}>
          ارسال دوباره کد
        </button>
        <Link to={`/auth/login?next=${encodeURIComponent(next)}`}>تغییر شماره / ایمیل</Link>
      </div>
    </AuthShell>
  );
}

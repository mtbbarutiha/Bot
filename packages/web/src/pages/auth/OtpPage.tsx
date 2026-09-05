import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { normalizeRoles, userHasRole } from '@petdate/shared';
import { AuthShell } from '../../components/AuthShell';
import { useAuthStore } from '../../hooks/useAuthStore';
import { sanitizeNext } from '../../lib/authRedirect';

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
  const [code, setCode] = useState(initialDev);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState(() =>
    initialDev ? `کد توسعه (فقط لوکال): ${initialDev}` : ''
  );

  useEffect(() => {
    if (!pendingChannel || !pendingTarget) {
      navigate(`/auth/login?next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [pendingChannel, pendingTarget, navigate, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const user = await verifyOtp(code.trim());
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
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!pendingChannel || !pendingTarget) return;
    setBusy(true);
    setError('');
    try {
      const res = await requestOtp(pendingChannel, pendingTarget);
      if (res.devCode) {
        setDevHint(`کد توسعه (فقط لوکال): ${res.devCode}`);
        setCode(res.devCode);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال مجدد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell backTo={`/auth/login?next=${encodeURIComponent(next)}`} backLabel="تغییر شماره / ایمیل">
      <p className="pepito-auth-kicker">تأیید هویت</p>
      <h1>کد یکبارمصرف</h1>
      <p className="auth-lead">
        کد ۵ رقمی برای <strong>{pendingTarget}</strong> آماده شد
        {pendingChannel === 'phone'
          ? ' (در حالت توسعه پیامک واقعی ممکن است نرسد)'
          : ' (ایمیل در لاگ سرور)'}
        .
      </p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          کد تأیید
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            maxLength={5}
            placeholder="----"
            required
            autoFocus
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        {devHint && <p className="auth-dev">{devHint}</p>}
        <button
          type="submit"
          className="pepito-btn button-1 auth-submit"
          disabled={busy || code.trim().length < 4}
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

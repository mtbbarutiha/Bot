import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { normalizeRoles, userHasRole } from '@petdate/shared';
import { BrandMark } from '../../components/BrandMark';
import { useAuthStore } from '../../hooks/useAuthStore';

export function OtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    pendingChannel,
    pendingTarget,
    verifyOtp,
    requestOtp,
  } = useAuthStore();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState(
    () => (location.state as { devCode?: string } | null)?.devCode
      ? `کد توسعه: ${(location.state as { devCode?: string }).devCode}`
      : ''
  );

  useEffect(() => {
    if (!pendingChannel || !pendingTarget) navigate('/auth/login', { replace: true });
  }, [pendingChannel, pendingTarget, navigate]);

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
      if (!roles.length) navigate('/onboarding/role', { replace: true });
      else if (!complete) navigate('/onboarding/profile', { replace: true });
      else if (userHasRole(user, 'pet_owner') && user.onboarding !== 'profile_complete') {
        navigate('/onboarding/pet', { replace: true });
      } else navigate('/', { replace: true });
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
      if (res.devCode) setDevHint(`کد توسعه: ${res.devCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال مجدد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero" aria-hidden />
      <div className="auth-card">
        <BrandMark iconSize={34} className="auth-brand" />
        <h1>کد یکبارمصرف</h1>
        <p className="auth-lead">
          کد ۵ رقمی به{' '}
          <strong>{pendingTarget}</strong>{' '}
          ({pendingChannel === 'phone' ? 'پیامک' : 'ایمیل'}) ارسال شد.
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
          <button type="submit" className="auth-submit" disabled={busy || code.trim().length < 4}>
            {busy ? 'در حال بررسی…' : 'تأیید و ادامه'}
          </button>
        </form>
        <div className="auth-secondary-actions">
          <button type="button" className="auth-link-btn" onClick={resend} disabled={busy}>
            ارسال دوباره کد
          </button>
          <Link to="/auth/login">تغییر شماره / ایمیل</Link>
        </div>
      </div>
    </div>
  );
}

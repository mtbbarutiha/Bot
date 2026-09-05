import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Smartphone } from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';
import { useAuthStore } from '../../hooks/useAuthStore';
import type { WebOtpChannel } from '../../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const { requestOtp, isLoggedIn, isProfileComplete, hasRole } = useAuthStore();
  const [channel, setChannel] = useState<WebOtpChannel>('phone');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!hasRole) navigate('/onboarding/role', { replace: true });
    else if (!isProfileComplete) navigate('/onboarding/profile', { replace: true });
    else navigate('/', { replace: true });
  }, [isLoggedIn, hasRole, isProfileComplete, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDevHint('');
    setBusy(true);
    try {
      const res = await requestOtp(channel, target.trim());
      if (res.devCode) setDevHint(`کد توسعه: ${res.devCode}`);
      navigate('/auth/otp', {
        state: res.devCode ? { devCode: res.devCode } : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-hero" aria-hidden />
      <div className="auth-card">
        <BrandMark iconSize={36} className="auth-brand" />
        <h1>ورود به petdate</h1>
        <p className="auth-lead">
          مثل ربات تلگرام، با شماره موبایل یا ایمیل وارد شو و پروفایلت را بساز.
        </p>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            className={`auth-tab${channel === 'phone' ? ' is-on' : ''}`}
            onClick={() => setChannel('phone')}
          >
            <Smartphone size={16} /> موبایل
          </button>
          <button
            type="button"
            className={`auth-tab${channel === 'email' ? ' is-on' : ''}`}
            onClick={() => setChannel('email')}
          >
            <Mail size={16} /> ایمیل
          </button>
        </div>

        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            {channel === 'phone' ? 'شماره موبایل' : 'ایمیل'}
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={channel === 'phone' ? '0912…' : 'you@email.com'}
              inputMode={channel === 'phone' ? 'tel' : 'email'}
              autoComplete={channel === 'phone' ? 'tel' : 'email'}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          {devHint && <p className="auth-dev">{devHint}</p>}
          <button type="submit" className="auth-submit" disabled={busy || !target.trim()}>
            {busy ? 'در حال ارسال…' : 'دریافت کد یکبارمصرف'}
          </button>
        </form>

        <p className="auth-foot">
          هنوز حساب نداری؟ با همان شماره/ایمیل کد بگیر — حساب خودکار ساخته می‌شود.
          <br />
          <Link to="/welcome">بازگشت</Link>
        </p>
      </div>
    </div>
  );
}

import { FormEvent, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Send, Smartphone } from 'lucide-react';
import { AuthShell } from '../../components/AuthShell';
import { useAuthStore } from '../../hooks/useAuthStore';
import { telegramWebLoginDeepLink } from '../../lib/api';
import { postAuthPath, sanitizeNext } from '../../lib/authRedirect';
import type { WebOtpChannel } from '../../lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const next = sanitizeNext(
    searchParams.get('next') || (location.state as { from?: string } | null)?.from,
    '/home'
  );
  const { requestOtp, isLoggedIn, isProfileComplete, hasRole } = useAuthStore();
  const [channel, setChannel] = useState<WebOtpChannel>('phone');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [devHint, setDevHint] = useState('');
  const telegramLoginUrl = telegramWebLoginDeepLink(next);

  useEffect(() => {
    if (!isLoggedIn) return;
    navigate(
      postAuthPath({ hasRole, isProfileComplete, next }),
      { replace: true }
    );
  }, [isLoggedIn, hasRole, isProfileComplete, navigate, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setDevHint('');
    setBusy(true);
    try {
      const res = await requestOtp(channel, target.trim());
      if (res.devCode) setDevHint(`کد توسعه: ${res.devCode}`);
      navigate(`/auth/otp?next=${encodeURIComponent(next)}`, {
        state: res.devCode ? { devCode: res.devCode, next } : { next },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ارسال کد ناموفق بود';
      setError(
        channel === 'phone'
          ? `${msg} اگر پیامک نرسید، از تب ایمیل استفاده کن.`
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      bannerTitle="ورود به Pet Date"
      bannerLead="با تلگرام، موبایل یا ایمیل — همان حساب وب و ربات"
      bannerImage="/pepito/uploads/3.jpg"
    >
      <p className="pepito-auth-kicker">ورود</p>
      <h1>خوش آمدی</h1>
      <p className="auth-lead">
        با اکانت تلگرام یک‌ضرب وارد شو، یا مثل قبل با شماره موبایل / ایمیل کد بگیر — همان حساب،
        همان پت‌ها و چت‌ها.
      </p>

      <a
        className="pepito-btn button-2 auth-telegram-cta"
        href={telegramLoginUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Send size={16} strokeWidth={2} aria-hidden />
        ورود با اکانت تلگرام
      </a>
      <p className="auth-telegram-hint">
        ربات باز می‌شود؛ دکمهٔ «ورود به وبسایت» را بزن تا امن و خودکار وارد وب شوی.
      </p>

      <div className="auth-or" role="separator">
        <span>یا ورود با موبایل / ایمیل</span>
      </div>

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
        <button
          type="submit"
          className="pepito-btn button-1 auth-submit"
          disabled={busy || !target.trim()}
        >
          {busy ? 'در حال ارسال…' : 'دریافت کد یکبارمصرف'}
        </button>
      </form>

      <p className="auth-foot">
        هنوز حساب نداری؟ با تلگرام یا همان شماره/ایمیل وارد شو — حساب خودکار ساخته می‌شود و با ربات
        همگام است.
        <br />
        <Link to="/">بازگشت به صفحه اصلی</Link>
      </p>
    </AuthShell>
  );
}

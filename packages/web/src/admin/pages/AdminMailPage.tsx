import { useCallback, useEffect, useState } from 'react';
import { Mail, RefreshCw, Send } from 'lucide-react';
import { adminFetch, formatNumFa } from '../api';

type SmtpConfig = {
  configured: boolean;
  host: string | null;
  port: number;
  from: string;
  fromName: string;
  user: string | null;
  authConfigured: boolean;
  secure: boolean;
  ignoreTls: boolean;
  tlsRejectUnauthorized: boolean;
  localHost: boolean;
};

type SendRow = {
  id: number;
  to: string;
  subject: string;
  purpose: string | null;
  ok: boolean;
  error: string | null;
  createdAt: string;
};

type OtpRow = {
  channel: string;
  target: string;
  expiresAt: string;
  attempts: number;
  createdAt: string;
};

type MailStatus = {
  generatedAt: string;
  smtp: SmtpConfig;
  smtpReachable: { ok: boolean; detail: string };
  stats: { total: number; ok24h: number; fail24h: number; lastAt: string | null };
  recentSends: SendRow[];
  pendingEmailOtps: OtpRow[];
};

export function AdminMailPage() {
  const [data, setData] = useState<MailStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch<MailStatus>('/api/admin/mail'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری وضعیت ایمیل ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function sendTest() {
    setTestBusy(true);
    setTestMsg(null);
    try {
      await adminFetch('/api/admin/mail/test', {
        method: 'POST',
        body: JSON.stringify({ to: testTo.trim() }),
      });
      setTestMsg('ارسال تست موفق بود — صندوق ورودی را چک کنید.');
      await load();
    } catch (err) {
      setTestMsg(err instanceof Error ? err.message : 'ارسال تست ناموفق بود');
    } finally {
      setTestBusy(false);
    }
  }

  const smtp = data?.smtp;

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Mail size={20} /> ایمیل / SMTP
          </h2>
          <p className="admin-muted" style={{ margin: '6px 0 0' }}>
            پیکربندی ارسال (بدون رمز)، وضعیت پورت، لاگ تلاش‌های اخیر و OTPهای ایمیل فعال
          </p>
        </div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> بروزرسانی
        </button>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-stats admin-stats--dense">
        <div className={`admin-stat admin-stat--${smtp?.configured ? 'mint' : 'orange'}`}>
          <div className="admin-stat-value">{smtp?.configured ? 'فعال' : 'خاموش'}</div>
          <div className="admin-stat-label">SMTP</div>
        </div>
        <div className={`admin-stat admin-stat--${data?.smtpReachable.ok ? 'sky' : 'slate'}`}>
          <div className="admin-stat-value">{data?.smtpReachable.ok ? 'باز' : '—'}</div>
          <div className="admin-stat-label">پورت SMTP</div>
        </div>
        <div className="admin-stat admin-stat--violet">
          <div className="admin-stat-value">{formatNumFa(data?.stats.ok24h ?? 0)}</div>
          <div className="admin-stat-label">موفق ۲۴س</div>
        </div>
        <div className="admin-stat admin-stat--orange">
          <div className="admin-stat-value">{formatNumFa(data?.stats.fail24h ?? 0)}</div>
          <div className="admin-stat-label">ناموفق ۲۴س</div>
        </div>
      </div>

      <div className="admin-dash-grid">
        <section className="admin-card">
          <div className="admin-card-head"><h2>پیکربندی SMTP</h2></div>
          {smtp ? (
            <ul className="admin-kv">
              <li><span>Host</span><strong className="admin-mono">{smtp.host || '—'}</strong></li>
              <li><span>Port</span><strong className="admin-mono">{smtp.port}</strong></li>
              <li><span>From</span><strong className="admin-mono">{smtp.fromName} &lt;{smtp.from}&gt;</strong></li>
              <li><span>User</span><strong className="admin-mono">{smtp.user || 'بدون auth'}</strong></li>
              <li><span>Auth</span><strong>{smtp.authConfigured ? 'بله (رمز مخفی)' : 'خیر'}</strong></li>
              <li><span>Secure / ignoreTLS</span><strong>{String(smtp.secure)} / {String(smtp.ignoreTls)}</strong></li>
              <li><span>TLS rejectUnauthorized</span><strong>{String(smtp.tlsRejectUnauthorized)}</strong></li>
              <li><span>Local host</span><strong>{smtp.localHost ? 'بله' : 'خیر'}</strong></li>
              <li><span>Reachability</span><strong>{data?.smtpReachable.detail}</strong></li>
            </ul>
          ) : (
            <p className="admin-muted">{loading ? '…' : 'داده‌ای نیست'}</p>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-head"><h2>ارسال تست</h2></div>
          <div className="form-group">
            <label className="form-label">آدرس گیرنده</label>
            <input
              className="form-input"
              type="email"
              dir="ltr"
              placeholder="you@example.com"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={testBusy || !testTo.trim() || !smtp?.configured}
            onClick={() => void sendTest()}
          >
            <Send size={16} /> {testBusy ? 'در حال ارسال…' : 'ارسال ایمیل تست'}
          </button>
          {testMsg ? <p className={testMsg.includes('موفق') ? 'admin-muted' : 'admin-error'} style={{ marginTop: 12 }}>{testMsg}</p> : null}
          <p className="admin-muted" style={{ marginTop: 12 }}>
            OTP ورود وب هم از همین SMTP می‌رود (`purpose=login_otp`). رمز SMTP در این پنل نشان داده نمی‌شود.
          </p>
        </section>
      </div>

      <section className="admin-card" style={{ marginTop: 16 }}>
        <div className="admin-card-head"><h2>تلاش‌های اخیر ارسال</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>زمان</th>
                <th>به</th>
                <th>موضوع</th>
                <th>نوع</th>
                <th>وضعیت</th>
                <th>خطا</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentSends ?? []).map((row) => (
                <tr key={row.id}>
                  <td className="admin-mono">{row.id}</td>
                  <td className="admin-mono">{row.createdAt}</td>
                  <td className="admin-mono" dir="ltr">{row.to}</td>
                  <td>{row.subject}</td>
                  <td><span className="admin-badge">{row.purpose || '—'}</span></td>
                  <td>
                    <span className={`admin-status admin-status--${row.ok ? 'accepted' : 'rejected'}`}>
                      {row.ok ? 'موفق' : 'ناموفق'}
                    </span>
                  </td>
                  <td className="admin-muted">{row.error || '—'}</td>
                </tr>
              ))}
              {!data?.recentSends?.length ? (
                <tr><td colSpan={7} className="admin-muted">هنوز لاگی ثبت نشده — بعد از OTP یا تست اینجا می‌آید</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card" style={{ marginTop: 16 }}>
        <div className="admin-card-head"><h2>OTP ایمیل فعال (بدون کد)</h2></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>هدف</th>
                <th>ساخته</th>
                <th>انقضا</th>
                <th>تلاش</th>
              </tr>
            </thead>
            <tbody>
              {(data?.pendingEmailOtps ?? []).map((row) => (
                <tr key={`${row.target}-${row.createdAt}`}>
                  <td className="admin-mono" dir="ltr">{row.target}</td>
                  <td className="admin-mono">{row.createdAt}</td>
                  <td className="admin-mono">{row.expiresAt}</td>
                  <td>{formatNumFa(row.attempts)}</td>
                </tr>
              ))}
              {!data?.pendingEmailOtps?.length ? (
                <tr><td colSpan={4} className="admin-muted">OTP فعالی نیست</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Cpu,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { ADMIN_PASSWORD } from '../auth';

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

type Check = { ok: boolean; detail?: string; freeGb?: number; totalGb?: number };

type Monitoring = {
  ok: boolean;
  generatedAt: string;
  uptimeSec: number;
  node: string;
  platform: string;
  hostname: string;
  loadAvg: number[];
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    systemFreeMb: number;
    systemTotalMb: number;
  };
  counts: {
    users: number;
    pets: number;
    playdates: number;
    playdatesAccepted: number;
    chatMessages: number;
    openGames: number;
  };
  logs: {
    total: number;
    errors24h: number;
    warns24h: number;
    lastErrorAt: string | null;
  };
  checks: Record<string, Check>;
  unhealthy: string[];
};

const CHECK_LABELS: Record<string, string> = {
  api: 'API',
  telegramBot: 'ربات تلگرام',
  sqlite: 'SQLite',
  postgres: 'Postgres',
  redis: 'Redis',
  s3: 'S3 / MinIO',
  elasticsearch: 'Elasticsearch',
  disk: 'دیسک',
};

function formatUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}ر ${h}س ${m}د`;
  if (h > 0) return `${h}س ${m}د`;
  return `${m}د ${sec % 60}ث`;
}

async function adminFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'x-admin-password': ADMIN_PASSWORD },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export function AdminMonitoringPage() {
  const [data, setData] = useState<Monitoring | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminFetch<Monitoring>('/api/admin/monitoring'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری مانیتورینگ ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 10000);
    return () => window.clearInterval(t);
  }, [load]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>مانیتورینگ</h1>
          <p>وضعیت سرویس‌ها و منابع سرور — هر ۱۰ ثانیه</p>
        </div>
        <button type="button" className="admin-btn" onClick={() => void load()}>
          <RefreshCw size={16} />
          بروزرسانی
        </button>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}
      {loading && !data ? <p className="admin-muted">در حال بارگذاری…</p> : null}

      {data ? (
        <>
          <div className={`admin-health-banner ${data.ok ? 'is-ok' : 'is-bad'}`}>
            {data.ok ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
            <div>
              <strong>{data.ok ? 'سیستم سالم است' : 'مشکل در سرویس‌های حیاتی'}</strong>
              <span>
                {data.hostname} · uptime {formatUptime(data.uptimeSec)} · {data.node}
              </span>
            </div>
          </div>

          <div className="admin-stats">
            <div className="admin-stat admin-stat--slate">
              <div className="admin-stat-icon">
                <Server size={20} />
              </div>
              <div>
                <div className="admin-stat-value">{data.memory.rssMb} MB</div>
                <div className="admin-stat-label">RAM فرآیند API</div>
              </div>
            </div>
            <div className="admin-stat admin-stat--blue">
              <div className="admin-stat-icon">
                <Cpu size={20} />
              </div>
              <div>
                <div className="admin-stat-value">{data.loadAvg.join(' / ')}</div>
                <div className="admin-stat-label">Load average</div>
              </div>
            </div>
            <div className="admin-stat admin-stat--green">
              <div className="admin-stat-icon">
                <HardDrive size={20} />
              </div>
              <div>
                <div className="admin-stat-value">
                  {data.memory.systemFreeMb} / {data.memory.systemTotalMb} MB
                </div>
                <div className="admin-stat-label">RAM آزاد سیستم</div>
              </div>
            </div>
            <div className="admin-stat admin-stat--orange">
              <div className="admin-stat-icon">
                <Activity size={20} />
              </div>
              <div>
                <div className="admin-stat-value">{data.logs.errors24h}</div>
                <div className="admin-stat-label">خطای ۲۴ ساعت</div>
              </div>
            </div>
          </div>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>سرویس‌ها</h2>
              <span className="admin-muted">{data.generatedAt}</span>
            </div>
            <div className="admin-checks">
              {Object.entries(data.checks).map(([key, check]) => (
                <div key={key} className={`admin-check ${check.ok ? 'is-ok' : 'is-bad'}`}>
                  {check.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                  <div>
                    <strong>{CHECK_LABELS[key] || key}</strong>
                    <span>
                      {check.detail ||
                        (check.freeGb != null
                          ? `${check.freeGb} / ${check.totalGb} GB آزاد`
                          : check.ok
                            ? 'OK'
                            : 'DOWN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-card">
            <div className="admin-card-head">
              <h2>
                <Database size={18} /> آمار دیتابیس
              </h2>
            </div>
            <div className="admin-stats">
              <div className="admin-stat admin-stat--slate">
                <div>
                  <div className="admin-stat-value">{data.counts.users}</div>
                  <div className="admin-stat-label">کاربران</div>
                </div>
              </div>
              <div className="admin-stat admin-stat--blue">
                <div>
                  <div className="admin-stat-value">{data.counts.pets}</div>
                  <div className="admin-stat-label">پت‌ها</div>
                </div>
              </div>
              <div className="admin-stat admin-stat--green">
                <div>
                  <div className="admin-stat-value">{data.counts.playdatesAccepted}</div>
                  <div className="admin-stat-label">همبازی قبول‌شده</div>
                </div>
              </div>
              <div className="admin-stat admin-stat--orange">
                <div>
                  <div className="admin-stat-value">{data.counts.chatMessages}</div>
                  <div className="admin-stat-label">پیام چت</div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

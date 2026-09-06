import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, HeartHandshake, Package, PawPrint, Stethoscope, Users, Wallet } from 'lucide-react';
import { adminFetch, formatNumFa, formatTomanFa } from '../api';

type Dash = {
  generatedAt: string;
  stats: {
    users: number; pets: number; playdates: number; playdatesPending: number;
    vetConsults: number; vetConsultsOpen: number; shopOrders: number; shopRevenueToman: number;
    walletTotals: { coins: number; toman: number; ton: number; stars: number };
    paymentOrdersPending: number;
    botRelated: { chatMessages: number; openGames: number; errors24h: number };
  };
  recentPets: Array<{ id: number; name: string; species: string; breed?: string; city?: string }>;
  recentShopOrders: Array<{ id: number; status: string; totalToman: number }>;
  recentConsults: Array<{ id: number; status: string; patientName?: string; vetName?: string; petName?: string }>;
};

export function AdminDashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try { setData(await adminFetch<Dash>('/api/admin/dashboard')); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const s = data?.stats;
  const kpis = s ? [
    { label: 'کاربران', value: formatNumFa(s.users), icon: Users, tone: 'violet' },
    { label: 'پت‌ها', value: formatNumFa(s.pets), icon: PawPrint, tone: 'mint' },
    { label: 'همبازی (باز)', value: formatNumFa(s.playdatesPending), icon: HeartHandshake, tone: 'orange' },
    { label: 'مشاوره باز', value: formatNumFa(s.vetConsultsOpen), icon: Stethoscope, tone: 'sky' },
    { label: 'سفارش فروشگاه', value: formatNumFa(s.shopOrders), icon: Package, tone: 'slate' },
    { label: 'درآمد فروشگاه', value: formatTomanFa(s.shopRevenueToman), icon: Wallet, tone: 'mint' },
    { label: 'کیف پول تومان', value: formatTomanFa(s.walletTotals.toman), icon: Wallet, tone: 'violet' },
    { label: 'خطای ۲۴س', value: formatNumFa(s.botRelated.errors24h), icon: Activity, tone: 'orange' },
  ] : [];

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div><h1>داشبورد پلتفرم</h1><p>ربات · فروشگاه · وب · محتوا</p></div>
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void load()}>بروزرسانی</button>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-stats admin-stats--dense">
        {kpis.map((k) => (
          <div key={k.label} className={`admin-stat admin-stat--${k.tone}`}>
            <div className="admin-stat-icon"><k.icon size={18} /></div>
            <div><div className="admin-stat-value">{k.value}</div><div className="admin-stat-label">{k.label}</div></div>
          </div>
        ))}
      </div>
      <div className="admin-dash-grid">
        <section className="admin-card">
          <div className="admin-card-head"><h2>آخرین پت‌ها</h2><Link to="/admin/pets">همه</Link></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>نام</th><th>گونه</th><th>نژاد</th><th>شهر</th></tr></thead>
            <tbody>
              {(data?.recentPets ?? []).map((pet) => (
                <tr key={pet.id}><td>{pet.name}</td><td>{pet.species}</td><td>{pet.breed || '—'}</td><td>{pet.city || '—'}</td></tr>
              ))}
              {!data?.recentPets?.length ? <tr><td colSpan={4} className="admin-muted">موردی نیست</td></tr> : null}
            </tbody>
          </table></div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><h2>سفارش فروشگاه</h2><Link to="/admin/shop/orders">همه</Link></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>#</th><th>مبلغ</th><th>وضعیت</th></tr></thead>
            <tbody>
              {(data?.recentShopOrders ?? []).map((o) => (
                <tr key={o.id}><td>{o.id}</td><td>{formatTomanFa(o.totalToman)}</td><td><span className="admin-badge">{o.status}</span></td></tr>
              ))}
              {!data?.recentShopOrders?.length ? <tr><td colSpan={3} className="admin-muted">سفارشی نیست</td></tr> : null}
            </tbody>
          </table></div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><h2>مشاوره دامپزشک</h2><Link to="/admin/consults">صف</Link></div>
          <div className="admin-table-wrap"><table className="admin-table">
            <thead><tr><th>بیمار</th><th>پزشک</th><th>پت</th><th>وضعیت</th></tr></thead>
            <tbody>
              {(data?.recentConsults ?? []).map((c) => (
                <tr key={c.id}><td>{c.patientName || '—'}</td><td>{c.vetName || '—'}</td><td>{c.petName || '—'}</td><td><span className="admin-badge">{c.status}</span></td></tr>
              ))}
              {!data?.recentConsults?.length ? <tr><td colSpan={4} className="admin-muted">موردی نیست</td></tr> : null}
            </tbody>
          </table></div>
        </section>
        <section className="admin-card">
          <div className="admin-card-head"><h2>کیف پول کل</h2><Link to="/admin/users">کاربران</Link></div>
          {s ? (
            <ul className="admin-kv">
              <li><span>سکه</span><strong>{formatNumFa(s.walletTotals.coins)}</strong></li>
              <li><span>تومان</span><strong>{formatNumFa(s.walletTotals.toman)}</strong></li>
              <li><span>TON</span><strong>{formatNumFa(s.walletTotals.ton)}</strong></li>
              <li><span>Stars</span><strong>{formatNumFa(s.walletTotals.stars)}</strong></li>
              <li><span>پرداخت در انتظار</span><strong>{formatNumFa(s.paymentOrdersPending)}</strong></li>
              <li><span>پیام چت</span><strong>{formatNumFa(s.botRelated.chatMessages)}</strong></li>
            </ul>
          ) : <p className="admin-muted">…</p>}
        </section>
      </div>
    </div>
  );
}

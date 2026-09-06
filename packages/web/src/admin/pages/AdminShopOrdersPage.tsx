import { useCallback, useEffect, useState } from 'react';
import { adminFetch, formatNumFa, formatTomanFa } from '../api';

type Order = { id: number; userId?: number; status: string; totalToman: number; items: unknown[]; customerName?: string; customerPhone?: string; createdAt: string };
const STATUSES = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

export function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await adminFetch<{ orders: Order[] }>(`/api/admin/shop/orders${qs}`);
      setOrders(data.orders); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  const patch = async (id: number, next: string) => {
    try {
      await adminFetch(`/api/admin/shop/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  };
  return (
    <div className="admin-page">
      <header className="admin-header">
        <div><h1>سفارش‌های فروشگاه</h1><p>{formatNumFa(orders.length)} سفارش</p></div>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-table-wrap admin-card"><table className="admin-table">
        <thead><tr><th>#</th><th>مشتری</th><th>مبلغ</th><th>آیتم</th><th>وضعیت</th><th>زمان</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td className="admin-mono">{o.id}</td>
              <td>{o.customerName || (o.userId ? `user #${o.userId}` : '—')}<div className="admin-muted">{o.customerPhone || ''}</div></td>
              <td>{formatTomanFa(o.totalToman)}</td>
              <td>{formatNumFa(Array.isArray(o.items) ? o.items.length : 0)}</td>
              <td>
                <select className="admin-select" value={o.status} onChange={(e) => void patch(o.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td>{new Date(o.createdAt).toLocaleString('fa-IR')}</td>
            </tr>
          ))}
          {!orders.length ? <tr><td colSpan={6} className="admin-muted">سفارشی نیست (checkout هنوز به API وصل نشده — stub آماده است)</td></tr> : null}
        </tbody>
      </table></div>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import type { PaymentOrder } from '@petdate/shared';
import { adminFetch, formatNumFa, formatTomanFa } from '../api';

export function AdminPaymentsPage() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [status, setStatus] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await adminFetch<{ orders: PaymentOrder[] }>(`/api/admin/payments${qs}`);
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (id: number) => {
    try {
      await adminFetch(`/api/admin/payments/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  };

  const reject = async (id: number) => {
    const note = prompt('دلیل رد (اختیاری)') || undefined;
    try {
      await adminFetch(`/api/admin/payments/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ note }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>پرداخت‌های کارت / سکه</h1>
          <p>{formatNumFa(orders.length)} سفارش پرداخت</p>
        </div>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه</option>
          <option value="pending">pending</option>
          <option value="awaiting_receipt">awaiting_receipt</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="paid">paid</option>
        </select>
      </header>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="admin-table-wrap admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>کاربر</th>
              <th>بسته</th>
              <th>مبلغ</th>
              <th>روش</th>
              <th>وضعیت</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="admin-mono">{o.id}</td>
                <td>
                  {o.userName || o.userId}
                  <div className="admin-muted">{o.userUsername ? `@${o.userUsername}` : ''}</div>
                </td>
                <td>
                  {o.packageId} · {formatNumFa(o.coins)} سکه
                </td>
                <td>
                  {o.amountToman != null ? formatTomanFa(o.amountToman) : '—'}
                  {o.amountStars != null ? ` / ${o.amountStars}⭐` : ''}
                </td>
                <td>{o.method}</td>
                <td>
                  <span className="admin-badge">{o.status}</span>
                </td>
                <td>
                  {o.status === 'pending' && o.method === 'card' ? (
                    <div className="admin-row-actions">
                      <button type="button" className="admin-btn admin-btn--primary" onClick={() => void approve(o.id)}>
                        تأیید
                      </button>
                      <button type="button" className="admin-btn admin-btn--danger" onClick={() => void reject(o.id)}>
                        رد
                      </button>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
            {!orders.length ? (
              <tr>
                <td colSpan={7} className="admin-muted">
                  موردی نیست
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

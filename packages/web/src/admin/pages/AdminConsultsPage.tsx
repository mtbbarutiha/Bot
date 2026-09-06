import { useCallback, useEffect, useState } from 'react';
import type { VetConsultation } from '@petdate/shared';
import { adminFetch, formatNumFa } from '../api';

const STATUSES = ['requested', 'active', 'completed', 'cancelled', 'expired'] as const;

export function AdminConsultsPage() {
  const [items, setItems] = useState<VetConsultation[]>([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const qs = status ? `?status=${encodeURIComponent(status)}` : '';
      const data = await adminFetch<{ consultations: VetConsultation[] }>(`/api/admin/consultations${qs}`);
      setItems(data.consultations); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  }, [status]);
  useEffect(() => { void load(); }, [load]);
  const patchStatus = async (id: number, next: string) => {
    try {
      await adminFetch(`/api/admin/consultations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  };
  return (
    <div className="admin-page">
      <header className="admin-header">
        <div><h1>ارتباط با پزشک</h1><p>{formatNumFa(items.length)} مشاوره</p></div>
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">همه</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <div className="admin-table-wrap admin-card"><table className="admin-table">
        <thead><tr><th>#</th><th>بیمار</th><th>پزشک</th><th>پت</th><th>وضعیت</th><th>تغییر</th></tr></thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id}>
              <td className="admin-mono">{c.id}</td>
              <td>{c.patientName || c.patientUserId}</td>
              <td>{c.vetName || c.vetUserId}</td>
              <td>{c.petName || c.petId || '—'}</td>
              <td><span className="admin-badge">{c.status}</span></td>
              <td>
                <select className="admin-select" value={c.status} onChange={(e) => void patchStatus(c.id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {!items.length ? <tr><td colSpan={6} className="admin-muted">مشاوره‌ای نیست</td></tr> : null}
        </tbody>
      </table></div>
    </div>
  );
}

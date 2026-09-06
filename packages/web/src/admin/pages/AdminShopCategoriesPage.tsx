import { useCallback, useEffect, useState } from 'react';
import { adminFetch, formatNumFa } from '../api';

type Cat = { slug: string; labelFa: string; petType: string; description: string; emoji: string; sortOrder: number };

export function AdminShopCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ slug: '', labelFa: '', petType: 'dog', description: '', emoji: '🛒' });
  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ categories: Cat[] }>('/api/admin/shop/categories');
      setCats(data.categories); setError(null);
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminFetch('/api/admin/shop/categories', { method: 'POST', body: JSON.stringify(form) });
      setForm({ slug: '', labelFa: '', petType: 'dog', description: '', emoji: '🛒' });
      await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  };
  const remove = async (slug: string) => {
    if (!confirm(`حذف ${slug}؟`)) return;
    try { await adminFetch(`/api/admin/shop/categories/${encodeURIComponent(slug)}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'خطا'); }
  };
  return (
    <div className="admin-page">
      <header className="admin-header"><div><h1>دسته‌بندی فروشگاه</h1><p>{formatNumFa(cats.length)} دسته</p></div></header>
      {error ? <p className="admin-error">{error}</p> : null}
      <form className="admin-card admin-form" onSubmit={(e) => void save(e)}>
        <div className="admin-form-grid">
          <label><span className="form-label">slug</span><input className="form-input" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></label>
          <label><span className="form-label">عنوان</span><input className="form-input" required value={form.labelFa} onChange={(e) => setForm({ ...form, labelFa: e.target.value })} /></label>
          <label><span className="form-label">نوع</span>
            <select className="admin-select" value={form.petType} onChange={(e) => setForm({ ...form, petType: e.target.value })}>
              <option value="dog">سگ</option><option value="cat">گربه</option><option value="bird">پرنده</option>
            </select>
          </label>
          <label><span className="form-label">ایموجی</span><input className="form-input" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></label>
        </div>
        <button type="submit" className="admin-btn admin-btn--primary" style={{ marginTop: 12 }}>ذخیره</button>
      </form>
      <div className="admin-table-wrap admin-card" style={{ marginTop: 16 }}><table className="admin-table">
        <thead><tr><th></th><th>عنوان</th><th>slug</th><th>نوع</th><th></th></tr></thead>
        <tbody>
          {cats.map((c) => (
            <tr key={c.slug}>
              <td>{c.emoji}</td><td>{c.labelFa}</td><td className="admin-mono">{c.slug}</td><td>{c.petType}</td>
              <td><button type="button" className="admin-btn admin-btn--danger" onClick={() => void remove(c.slug)}>حذف</button></td>
            </tr>
          ))}
          {!cats.length ? <tr><td colSpan={5} className="admin-muted">دسته‌ای نیست — از محصولات سینک کنید</td></tr> : null}
        </tbody>
      </table></div>
    </div>
  );
}

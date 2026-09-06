import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { SHOP_BRANDS, SHOP_CATEGORIES } from '../../data/shopCatalog';
import { adminFetch } from '../api';

type FormState = {
  id: string;
  slug: string;
  title: string;
  brandId: string;
  categorySlug: string;
  petTypes: string;
  priceToman: string;
  compareAtToman: string;
  costToman: string;
  image: string;
  images: string;
  badge: string;
  inStock: boolean;
  stockQty: string;
  params: string;
  description: string;
  featured: boolean;
  sellerName: string;
  warranty: string;
  rating: string;
  reviewCount: string;
  highlights: string;
};

const empty: FormState = {
  id: '',
  slug: '',
  title: '',
  brandId: SHOP_BRANDS[0]?.id || 'petdate',
  categorySlug: SHOP_CATEGORIES[0]?.slug || 'dog-food',
  petTypes: 'dog',
  priceToman: '0',
  compareAtToman: '',
  costToman: '',
  image: '',
  images: '',
  badge: '',
  inStock: true,
  stockQty: '10',
  params: '{}',
  description: '',
  featured: false,
  sellerName: 'پت‌دیت شاپ',
  warranty: 'اصالت و سلامت فیزیکی کالا',
  rating: '4.6',
  reviewCount: '128',
  highlights: '',
};

function linesToList(raw: string): string[] {
  return raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AdminShopProductFormPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (isNew) return;
    try {
      const prod = await adminFetch<Record<string, unknown>>(`/api/admin/shop/products/${id}`);
      const params =
        prod.params && typeof prod.params === 'object'
          ? (prod.params as Record<string, string>)
          : {};
      const images = Array.isArray(prod.images)
        ? (prod.images as string[]).join('\n')
        : typeof params.__images === 'string'
          ? params.__images.split('|').join('\n')
          : '';
      const highlights = Array.isArray(prod.highlights)
        ? (prod.highlights as string[]).join('\n')
        : typeof params.__highlights === 'string'
          ? params.__highlights.split('|').join('\n')
          : '';
      setForm({
        id: String(prod.id),
        slug: String(prod.slug),
        title: String(prod.title),
        brandId: String(prod.brandId),
        categorySlug: String(prod.categorySlug),
        petTypes: Array.isArray(prod.petTypes) ? (prod.petTypes as string[]).join(',') : 'dog',
        priceToman: String(prod.priceToman ?? 0),
        compareAtToman: prod.compareAtToman != null ? String(prod.compareAtToman) : '',
        costToman: prod.costToman != null ? String(prod.costToman) : '',
        image: String(prod.image ?? ''),
        images,
        badge: String(prod.badge ?? ''),
        inStock: Boolean(prod.inStock),
        stockQty: String(prod.stockQty ?? 0),
        params: JSON.stringify(
          Object.fromEntries(Object.entries(params).filter(([k]) => !k.startsWith('__'))),
          null,
          2
        ),
        description: String(prod.description ?? ''),
        featured: Boolean(prod.featured),
        sellerName: String(prod.sellerName ?? params.__sellerName ?? 'پت‌دیت شاپ'),
        warranty: String(prod.warranty ?? params.__warranty ?? 'اصالت و سلامت فیزیکی کالا'),
        rating: String(prod.rating ?? params.__rating ?? '4.6'),
        reviewCount: String(prod.reviewCount ?? params.__reviewCount ?? '128'),
        highlights,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    }
  }, [id, isNew]);

  useEffect(() => {
    void load();
  }, [load]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    let params: Record<string, string> = {};
    try {
      params = JSON.parse(form.params || '{}') as Record<string, string>;
    } catch {
      setError('params باید JSON باشد');
      setBusy(false);
      return;
    }
    const images = linesToList(form.images);
    const highlights = linesToList(form.highlights);
    if (images.length) params.__images = images.join('|');
    else delete params.__images;
    if (highlights.length) params.__highlights = highlights.join('|');
    else delete params.__highlights;
    if (form.sellerName.trim()) params.__sellerName = form.sellerName.trim();
    if (form.warranty.trim()) params.__warranty = form.warranty.trim();
    if (form.rating.trim()) params.__rating = form.rating.trim();
    if (form.reviewCount.trim()) params.__reviewCount = form.reviewCount.trim();

    const payload = {
      id: form.id || undefined,
      slug: form.slug,
      title: form.title,
      brandId: form.brandId,
      categorySlug: form.categorySlug,
      petTypes: form.petTypes.split(',').map((s) => s.trim()).filter(Boolean),
      priceToman: Number(form.priceToman),
      compareAtToman: form.compareAtToman ? Number(form.compareAtToman) : undefined,
      costToman: form.costToman ? Number(form.costToman) : null,
      image: form.image || images[0] || undefined,
      images: images.length ? images : undefined,
      badge: form.badge || null,
      inStock: form.inStock,
      stockQty: Number(form.stockQty),
      params,
      description: form.description,
      featured: form.featured,
      sellerName: form.sellerName.trim() || undefined,
      warranty: form.warranty.trim() || undefined,
      rating: form.rating ? Number(form.rating) : undefined,
      reviewCount: form.reviewCount ? Number(form.reviewCount) : undefined,
      highlights: highlights.length ? highlights : undefined,
    };
    try {
      if (isNew) await adminFetch('/api/admin/shop/products', { method: 'POST', body: JSON.stringify(payload) });
      else await adminFetch(`/api/admin/shop/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      navigate('/admin/shop/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{isNew ? 'محصول جدید' : 'ویرایش محصول'}</h1>
          <p>فیلدهای صفحه محصول (سبک دیجی‌کالا) + کاتالوگ شاپ</p>
        </div>
        <Link to="/admin/shop/products" className="admin-btn admin-btn--ghost">
          بازگشت
        </Link>
      </header>
      {error ? <p className="admin-error">{error}</p> : null}
      <form className="admin-card admin-form" onSubmit={(e) => void save(e)}>
        <div className="admin-form-grid">
          <label>
            <span className="form-label">عنوان</span>
            <input className="form-input" required value={form.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label>
            <span className="form-label">اسلاگ</span>
            <input className="form-input" required value={form.slug} onChange={(e) => set({ slug: e.target.value })} />
          </label>
          <label>
            <span className="form-label">برند</span>
            <select className="admin-select" value={form.brandId} onChange={(e) => set({ brandId: e.target.value })}>
              {SHOP_BRANDS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.labelFa}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">دسته</span>
            <select
              className="admin-select"
              value={form.categorySlug}
              onChange={(e) => set({ categorySlug: e.target.value })}
            >
              {SHOP_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.labelFa}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">نوع پت</span>
            <input className="form-input" value={form.petTypes} onChange={(e) => set({ petTypes: e.target.value })} />
          </label>
          <label>
            <span className="form-label">قیمت تومان</span>
            <input
              className="form-input"
              type="number"
              value={form.priceToman}
              onChange={(e) => set({ priceToman: e.target.value })}
            />
          </label>
          <label>
            <span className="form-label">قیمت قبل تخفیف</span>
            <input
              className="form-input"
              type="number"
              value={form.compareAtToman}
              onChange={(e) => set({ compareAtToman: e.target.value })}
              placeholder="اختیاری"
            />
          </label>
          <label>
            <span className="form-label">بهای تمام‌شده (COGS)</span>
            <input
              className="form-input"
              type="number"
              value={form.costToman}
              onChange={(e) => set({ costToman: e.target.value })}
              placeholder="اختیاری"
            />
          </label>
          <label>
            <span className="form-label">موجودی</span>
            <input
              className="form-input"
              type="number"
              value={form.stockQty}
              onChange={(e) => set({ stockQty: e.target.value })}
            />
          </label>
          <label>
            <span className="form-label">نشان</span>
            <select className="admin-select" value={form.badge} onChange={(e) => set({ badge: e.target.value })}>
              <option value="">—</option>
              <option value="hot">hot</option>
              <option value="sale">sale</option>
              <option value="new">new</option>
              <option value="limited">limited</option>
            </select>
          </label>
          <label>
            <span className="form-label">فروشنده</span>
            <input
              className="form-input"
              value={form.sellerName}
              onChange={(e) => set({ sellerName: e.target.value })}
            />
          </label>
          <label>
            <span className="form-label">گارانتی / اصالت</span>
            <input
              className="form-input"
              value={form.warranty}
              onChange={(e) => set({ warranty: e.target.value })}
            />
          </label>
          <label>
            <span className="form-label">امتیاز (۰–۵)</span>
            <input
              className="form-input"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(e) => set({ rating: e.target.value })}
            />
          </label>
          <label>
            <span className="form-label">تعداد دیدگاه</span>
            <input
              className="form-input"
              type="number"
              value={form.reviewCount}
              onChange={(e) => set({ reviewCount: e.target.value })}
            />
          </label>
          <label className="admin-form-span">
            <span className="form-label">تصویر اصلی</span>
            <input className="form-input" value={form.image} onChange={(e) => set({ image: e.target.value })} />
          </label>
          <label className="admin-form-span">
            <span className="form-label">گالری تصاویر (هر خط یک URL)</span>
            <textarea
              className="form-input admin-mono"
              rows={3}
              dir="ltr"
              value={form.images}
              onChange={(e) => set({ images: e.target.value })}
              placeholder={'/pepito/uploads/01-1.png\n/pepito/uploads/01-2.jpg'}
            />
          </label>
          <label className="admin-form-span">
            <span className="form-label">نکات برجسته (هر خط یک مورد)</span>
            <textarea
              className="form-input"
              rows={3}
              value={form.highlights}
              onChange={(e) => set({ highlights: e.target.value })}
              placeholder={'ارسال سریع\nبسته‌بندی بهداشتی'}
            />
          </label>
          <label className="admin-form-span">
            <span className="form-label">توضیح</span>
            <textarea
              className="form-input"
              rows={3}
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          <label className="admin-form-span">
            <span className="form-label">params JSON (جدول مشخصات)</span>
            <textarea
              className="form-input admin-mono"
              rows={3}
              dir="ltr"
              value={form.params}
              onChange={(e) => set({ params: e.target.value })}
            />
          </label>
        </div>
        <div className="admin-row-actions" style={{ marginTop: 12 }}>
          <label className="admin-check-inline">
            <input type="checkbox" checked={form.inStock} onChange={(e) => set({ inStock: e.target.checked })} /> موجود
          </label>
          <label className="admin-check-inline">
            <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} /> ویژه
          </label>
          <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>
            {busy ? '…' : 'ذخیره'}
          </button>
        </div>
      </form>
    </div>
  );
}

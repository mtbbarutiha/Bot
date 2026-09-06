import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  Info,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Truck,
} from 'lucide-react';
import {
  BADGE_LABELS,
  filterProducts,
  formatToman,
  getBrand,
  getCategory,
  getProduct,
  productDiscountPercent,
  productGallery,
  productRating,
  productSellerName,
  productWarranty,
} from '../../data/shopCatalog';
import { useShopCart } from '../../hooks/useShopCart';
import { ShopChrome } from '../../components/shop/ShopChrome';
import { ShopProductCard } from '../../components/shop/ShopProductCard';

type DetailTab = 'desc' | 'specs';

export function ShopProductPage() {
  const { id = '' } = useParams<{ id: string }>();
  const product = getProduct(id);
  const { add } = useShopCart();
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState<DetailTab>('desc');
  const [addedFlash, setAddedFlash] = useState(false);

  const gallery = useMemo(() => (product ? productGallery(product) : []), [product]);
  const brand = product ? getBrand(product.brandId) : undefined;
  const category = product ? getCategory(product.categorySlug) : undefined;
  const discount = product ? productDiscountPercent(product) : null;
  const seller = product ? productSellerName(product) : '';
  const warranty = product ? productWarranty(product) : '';
  const { rating, count: reviewCount } = product
    ? productRating(product)
    : { rating: 0, count: 0 };

  const related = useMemo(() => {
    if (!product) return [];
    return filterProducts({ categorySlug: product.categorySlug })
      .filter((p) => p.id !== product.id)
      .slice(0, 4);
  }, [product]);

  if (!product) {
    return <Navigate to="/shop" replace />;
  }

  const highlights = product.highlights?.length
    ? product.highlights
    : [
        brand ? `برند ${brand.labelFa}` : 'برند پت‌دیت شاپ',
        product.inStock ? 'آماده ارسال از انبار پت‌دیت' : 'فعلاً ناموجود',
        warranty,
      ];

  const paramEntries = Object.entries(product.params);
  const mainSrc = gallery[Math.min(activeImg, Math.max(gallery.length - 1, 0))] ?? product.image;

  const onAdd = () => {
    if (!product.inStock) return;
    add(product.id);
    setAddedFlash(true);
    window.setTimeout(() => setAddedFlash(false), 1600);
  };

  return (
    <ShopChrome
      bannerTitle={product.title}
      bannerLead={
        brand ? `${brand.labelFa}${category ? ` · ${category.labelFa}` : ''}` : category?.labelFa
      }
    >
      <div className="pepito-container pd-shop-detail pd-dk-pdp">
        <nav className="pd-shop-breadcrumb" aria-label="مسیر">
          <Link to="/shop">پت دیت شاپ</Link>
          {category ? (
            <>
              <span>/</span>
              <Link to={`/shop/c/${category.slug}`}>{category.labelFa}</Link>
            </>
          ) : null}
          <span>/</span>
          <span>{product.title}</span>
        </nav>

        <div className="pd-dk-pdp-top">
          <div className="pd-dk-gallery">
            <div className="pd-dk-gallery-main">
              <img src={mainSrc} alt={product.title} />
              {product.badge ? (
                <span className={`pd-shop-badge pd-shop-badge--${product.badge}`}>
                  {BADGE_LABELS[product.badge]}
                  {discount != null ? ` ${discount.toLocaleString('fa-IR')}٪` : ''}
                </span>
              ) : null}
              {discount != null ? (
                <span className="pd-dk-discount-pill">{discount.toLocaleString('fa-IR')}٪</span>
              ) : null}
            </div>
            {gallery.length > 1 ? (
              <div className="pd-dk-thumbs" role="list">
                {gallery.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    role="listitem"
                    className={`pd-dk-thumb${i === activeImg ? ' is-active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`تصویر ${i + 1}`}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="pd-dk-info">
            {brand ? (
              <Link
                to={`/shop/c/${category?.slug ?? 'all'}?brand=${brand.id}`}
                className="pd-dk-brand"
              >
                {brand.labelFa}
                <ChevronLeft size={14} aria-hidden />
              </Link>
            ) : null}
            <h1 className="pd-dk-title">{product.title}</h1>

            <div className="pd-dk-meta">
              <span className="pd-dk-rating" title="امتیاز کاربران">
                <Star size={14} fill="currentColor" aria-hidden />
                {rating.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}
              </span>
              <span className="pd-dk-meta-sep" aria-hidden>
                |
              </span>
              <span>{reviewCount.toLocaleString('fa-IR')} دیدگاه</span>
              {category ? (
                <>
                  <span className="pd-dk-meta-sep" aria-hidden>
                    |
                  </span>
                  <Link to={`/shop/c/${category.slug}`}>{category.labelFa}</Link>
                </>
              ) : null}
            </div>

            <ul className="pd-dk-highlights">
              {highlights.map((h) => (
                <li key={h}>
                  <CheckCircle2 size={15} aria-hidden />
                  {h}
                </li>
              ))}
            </ul>

            {paramEntries.length > 0 ? (
              <div className="pd-dk-quick-params">
                {paramEntries.slice(0, 4).map(([k, v]) => (
                  <div key={k} className="pd-dk-quick-param">
                    <span>{k}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <aside className="pd-dk-buybox" aria-label="خرید">
            <div className="pd-dk-buybox-seller">
              <Store size={16} aria-hidden />
              <div>
                <span className="pd-dk-buybox-label">فروشنده</span>
                <strong>{seller}</strong>
              </div>
            </div>
            <div className="pd-dk-buybox-row">
              <ShieldCheck size={16} aria-hidden />
              <span>{warranty}</span>
            </div>
            <div className="pd-dk-buybox-row">
              <Truck size={16} aria-hidden />
              <span>{product.inStock ? 'موجود در انبار پت‌دیت' : 'ناموجود'}</span>
            </div>

            <div className="pd-dk-buybox-price">
              {product.compareAtToman && product.compareAtToman > product.priceToman ? (
                <span className="pd-shop-price-was">{formatToman(product.compareAtToman)}</span>
              ) : null}
              <div className="pd-dk-buybox-now">
                {discount != null ? (
                  <span className="pd-dk-buybox-off">{discount.toLocaleString('fa-IR')}٪</span>
                ) : null}
                <span className="pd-shop-price-now">{formatToman(product.priceToman)}</span>
              </div>
            </div>

            <button
              type="button"
              className="pepito-btn button-1 pd-dk-add"
              disabled={!product.inStock}
              onClick={onAdd}
            >
              <ShoppingBag size={16} strokeWidth={2} aria-hidden />
              {product.inStock ? (addedFlash ? 'به سبد اضافه شد' : 'افزودن به سبد') : 'ناموجود'}
            </button>
            <Link to="/shop/cart" className="pd-dk-cart-link">
              مشاهده سبد خرید
              <ChevronLeft size={14} aria-hidden />
            </Link>
          </aside>
        </div>

        <section className="pd-dk-tabs-block" aria-label="جزئیات محصول">
          <div className="pd-dk-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'desc'}
              className={tab === 'desc' ? 'is-active' : undefined}
              onClick={() => setTab('desc')}
            >
              <Info size={15} aria-hidden />
              توضیحات
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'specs'}
              className={tab === 'specs' ? 'is-active' : undefined}
              onClick={() => setTab('specs')}
            >
              مشخصات
            </button>
          </div>
          <div className="pd-dk-tab-panel" role="tabpanel">
            {tab === 'desc' ? (
              <p className="pd-dk-desc">{product.description}</p>
            ) : (
              <table className="pd-dk-specs">
                <tbody>
                  <tr>
                    <th>برند</th>
                    <td>{brand?.labelFa ?? '—'}</td>
                  </tr>
                  <tr>
                    <th>دسته‌بندی</th>
                    <td>{category?.labelFa ?? '—'}</td>
                  </tr>
                  {paramEntries.map(([k, v]) => (
                    <tr key={k}>
                      <th>{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                  <tr>
                    <th>وضعیت موجودی</th>
                    <td>{product.inStock ? 'موجود' : 'ناموجود'}</td>
                  </tr>
                  <tr>
                    <th>گارانتی</th>
                    <td>{warranty}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        </section>

        {related.length > 0 ? (
          <section className="pd-shop-block">
            <div className="pepito-section-head">
              <p className="pepito-eyebrow">مرتبط</p>
              <h2>کالاهای مشابه</h2>
            </div>
            <div className="pd-shop-product-grid">
              {related.map((p) => (
                <ShopProductCard key={p.id} product={p} onAdd={add} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ShopChrome>
  );
}

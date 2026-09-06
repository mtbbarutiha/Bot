import { Link, Navigate, useParams } from 'react-router-dom';
import { PawPrint, ShoppingBag } from 'lucide-react';
import {
  BADGE_LABELS,
  filterProducts,
  formatToman,
  getBrand,
  getCategory,
  getProduct,
  productDiscountPercent,
} from '../../data/shopCatalog';
import { useShopCart } from '../../hooks/useShopCart';
import { ShopChrome } from '../../components/shop/ShopChrome';
import { ShopProductCard } from '../../components/shop/ShopProductCard';

export function ShopProductPage() {
  const { id = '' } = useParams<{ id: string }>();
  const product = getProduct(id);
  const { add } = useShopCart();

  if (!product) {
    return <Navigate to="/shop" replace />;
  }

  const brand = getBrand(product.brandId);
  const category = getCategory(product.categorySlug);
  const discount = productDiscountPercent(product);
  const related = filterProducts({
    categorySlug: product.categorySlug,
  })
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <ShopChrome
      bannerTitle={product.title}
      bannerLead={brand ? `${brand.labelFa}${category ? ` · ${category.labelFa}` : ''}` : category?.labelFa}
    >
      <div className="pepito-container pd-shop-detail">
        <nav className="pd-shop-breadcrumb" aria-label="مسیر">
          <Link to="/shop">پت شاپ</Link>
          {category ? (
            <>
              <span>/</span>
              <Link to={`/shop/c/${category.slug}`}>{category.labelFa}</Link>
            </>
          ) : null}
          <span>/</span>
          <span>{product.title}</span>
        </nav>

        <div className="pd-shop-detail-grid">
          <div className="pd-shop-detail-media">
            <img src={product.image} alt={product.title} />
            {product.badge ? (
              <span className={`pd-shop-badge pd-shop-badge--${product.badge}`}>
                {BADGE_LABELS[product.badge]}
                {discount != null ? ` ${discount.toLocaleString('fa-IR')}٪` : ''}
              </span>
            ) : null}
          </div>
          <div className="pd-shop-detail-info">
            {brand ? <p className="pd-shop-card-brand">{brand.labelFa}</p> : null}
            <h2>{product.title}</h2>
            <div className="pd-shop-card-prices pd-shop-detail-prices">
              {product.compareAtToman && product.compareAtToman > product.priceToman ? (
                <span className="pd-shop-price-was">{formatToman(product.compareAtToman)}</span>
              ) : null}
              <span className="pd-shop-price-now">{formatToman(product.priceToman)}</span>
            </div>
            <p className="pd-shop-detail-desc">{product.description}</p>
            <dl className="pd-shop-params">
              {Object.entries(product.params).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
              <div>
                <dt>موجودی</dt>
                <dd>{product.inStock ? 'موجود' : 'ناموجود'}</dd>
              </div>
            </dl>
            <div className="pd-shop-detail-actions">
              <button
                type="button"
                className="pepito-btn button-1"
                disabled={!product.inStock}
                onClick={() => add(product.id)}
              >
                <ShoppingBag size={16} strokeWidth={2} aria-hidden />
                {product.inStock ? 'افزودن به سبد' : 'ناموجود'}
              </button>
              <Link to="/shop/cart" className="pepito-btn button-3">
                <span className="pepito-btn-icon" aria-hidden>
                  <PawPrint size={14} />
                </span>
                مشاهده سبد
              </Link>
            </div>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="pd-shop-block">
            <div className="pepito-section-head">
              <p className="pepito-eyebrow">مرتبط</p>
              <h2>محصولات مشابه</h2>
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

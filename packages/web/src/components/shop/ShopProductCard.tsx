import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import {
  BADGE_LABELS,
  formatToman,
  getBrand,
  productDiscountPercent,
  type ShopProduct,
} from '../../data/shopCatalog';

export function ShopProductCard({
  product,
  onAdd,
}: {
  product: ShopProduct;
  onAdd?: (id: string) => void;
}) {
  const brand = getBrand(product.brandId);
  const discount = productDiscountPercent(product);
  const paramLine = Object.entries(product.params)
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ');

  return (
    <article className={`pd-shop-card${!product.inStock ? ' is-oos' : ''}`}>
      <Link to={`/shop/product/${product.slug}`} className="pd-shop-card-media">
        <img src={product.image} alt={product.title} loading="lazy" />
        {product.badge ? (
          <span className={`pd-shop-badge pd-shop-badge--${product.badge}`}>
            {BADGE_LABELS[product.badge]}
            {discount != null ? ` ${discount.toLocaleString('fa-IR')}٪` : ''}
          </span>
        ) : null}
        {!product.inStock ? <span className="pd-shop-oos-tag">ناموجود</span> : null}
      </Link>
      <div className="pd-shop-card-body">
        {brand ? <p className="pd-shop-card-brand">{brand.labelFa}</p> : null}
        <h3>
          <Link to={`/shop/product/${product.slug}`}>{product.title}</Link>
        </h3>
        {paramLine ? <p className="pd-shop-card-params">{paramLine}</p> : null}
        <div className="pd-shop-card-footer">
          <div className="pd-shop-card-prices">
            {product.compareAtToman && product.compareAtToman > product.priceToman ? (
              <span className="pd-shop-price-was">{formatToman(product.compareAtToman)}</span>
            ) : null}
            <span className="pd-shop-price-now">{formatToman(product.priceToman)}</span>
          </div>
          {onAdd ? (
            <button
              type="button"
              className="pd-shop-add-btn"
              disabled={!product.inStock}
              onClick={() => onAdd(product.id)}
            >
              <ShoppingBag size={15} strokeWidth={2.2} aria-hidden />
              {product.inStock ? 'بخر' : 'ناموجود'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

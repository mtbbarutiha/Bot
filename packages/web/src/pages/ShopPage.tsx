import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { formatPrice, MOCK_PRODUCTS } from '../data/services';

const CATEGORIES = ['همه', ...Array.from(new Set(MOCK_PRODUCTS.map((p) => p.category)))];

export function ShopPage() {
  const [category, setCategory] = useState('همه');
  const [cartCount, setCartCount] = useState(0);

  const filtered =
    category === 'همه' ? MOCK_PRODUCTS : MOCK_PRODUCTS.filter((p) => p.category === category);

  return (
    <div className="service-page">
      <div className="page-title-block">
        <BrandMark className="greeting-brand" iconSize={22} />
        <h1>فروشگاه پت</h1>
        <p>غذا، اسباب‌بازی و لوازم — {cartCount} در سبد</p>
      </div>

      <div className="shop-categories">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`shop-cat-btn${category === cat ? ' active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="product-grid">
        {filtered.map((product) => (
          <div key={product.id} className={`product-card${!product.inStock ? ' out-of-stock' : ''}`}>
            <div className="product-emoji">{product.imageEmoji}</div>
            <h3>{product.name}</h3>
            <p className="product-desc">{product.description}</p>
            <div className="product-footer">
              <span className="product-price">{formatPrice(product.price)}</span>
              <button
                type="button"
                className="product-add-btn"
                disabled={!product.inStock}
                onClick={() => setCartCount((c) => c + 1)}
              >
                <ShoppingBag size={16} strokeWidth={2} />
                {product.inStock ? 'افزودن' : 'ناموجود'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {cartCount > 0 && (
        <div className="service-action-bar">
          <button type="button" className="cta-btn" disabled>
            پرداخت (فاز بعدی) — {cartCount} قلم
          </button>
        </div>
      )}
    </div>
  );
}

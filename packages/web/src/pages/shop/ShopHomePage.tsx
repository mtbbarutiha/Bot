import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import {
  SHOP_BRANDS,
  SHOP_CATEGORIES,
  SHOP_PET_TYPES,
  SHOP_PRICE_MAX,
  categoriesForPet,
  getFeaturedProducts,
  type ShopPetType,
} from '../../data/shopCatalog';
import { useShopCart } from '../../hooks/useShopCart';
import { ShopChrome } from '../../components/shop/ShopChrome';
import { ShopProductCard } from '../../components/shop/ShopProductCard';

export function ShopHomePage() {
  const { add } = useShopCart();
  const [petType, setPetType] = useState<ShopPetType>('all');
  const featured = useMemo(() => getFeaturedProducts(), []);
  const cats = useMemo(() => categoriesForPet(petType), [petType]);

  return (
    <ShopChrome
      bannerTitle="پت شاپ PetDate"
      bannerLead="از غذای سگ و گربه تا لوازم پرنده — فیلتر برند، نوع پت و قیمت به تومان"
    >
      <div className="pepito-container pd-shop-home">
        <section className="pd-shop-pet-tabs" aria-label="نوع حیوان">
          {SHOP_PET_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`pd-shop-chip${petType === t.id ? ' is-active' : ''}`}
              onClick={() => setPetType(t.id)}
            >
              {t.labelFa}
            </button>
          ))}
        </section>

        <section className="pd-shop-block">
          <div className="pepito-section-head pepito-section-head--center">
            <p className="pepito-eyebrow">
              <span className="pepito-eyebrow-icon" aria-hidden>
                <PawPrint size={18} />
              </span>
              دسته‌بندی‌ها
            </p>
            <h2>انتخاب کن، فیلتر کن، بخر</h2>
          </div>
          <div className="pd-shop-cat-grid">
            {cats.map((c) => (
              <Link key={c.slug} to={`/shop/c/${c.slug}`} className="pd-shop-cat-tile">
                <span className="pd-shop-cat-emoji" aria-hidden>
                  {c.emoji}
                </span>
                <span className="pd-shop-cat-label">{c.labelFa}</span>
                <span className="pd-shop-cat-desc">{c.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="pd-shop-block">
          <div className="pepito-section-head pepito-section-head--center">
            <p className="pepito-eyebrow">محصولات ویژه</p>
            <h2>پیشنهادهای امروز</h2>
          </div>
          <div className="pd-shop-product-grid">
            {featured.map((p) => (
              <ShopProductCard key={p.id} product={p} onAdd={add} />
            ))}
          </div>
          <div className="pd-shop-home-cta">
            <Link to="/shop/c/dog-food" className="pepito-btn button-1">
              <span className="pepito-btn-icon" aria-hidden>
                <PawPrint size={16} />
              </span>
              مشاهده همه محصولات
            </Link>
          </div>
        </section>

        <section className="pd-shop-block pd-shop-brands">
          <div className="pepito-section-head pepito-section-head--center">
            <p className="pepito-eyebrow">برند‌های محبوب</p>
            <h2>از برندهای معتبر</h2>
          </div>
          <div className="pd-shop-brand-row">
            {SHOP_BRANDS.map((b) => (
              <Link key={b.id} to={`/shop/c/all?brand=${b.id}`} className="pd-shop-brand-chip">
                {b.labelFa}
              </Link>
            ))}
          </div>
          <p className="pd-shop-meta-note">
            محدوده قیمت کاتالوگ تا {SHOP_PRICE_MAX.toLocaleString('fa-IR')} تومان ·{' '}
            {SHOP_CATEGORIES.length.toLocaleString('fa-IR')} دسته
          </p>
        </section>
      </div>
    </ShopChrome>
  );
}

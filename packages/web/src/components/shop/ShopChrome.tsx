import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { PawPrint, ShoppingBag } from 'lucide-react';
import { BRAND } from '@petdate/shared';
import { useAuthStore } from '../../hooks/useAuthStore';
import { useShopCart } from '../../hooks/useShopCart';
import { loginPath } from '../../lib/authRedirect';
import { NavUserCluster } from '../NavUserCluster';
import { SiteFooter } from '../SiteFooter';

function PawIcon({ size = 14 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function ShopChrome({
  children,
  bannerTitle = 'پت دیت شاپ',
  bannerLead = 'غذا، لوازم و اسباب‌بازی با قیمت تومان — پت دیت شاپ',
  hideBanner = false,
}: {
  children: ReactNode;
  bannerTitle?: string;
  bannerLead?: string;
  hideBanner?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const { itemCount } = useShopCart();
  const { isLoggedIn } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('pepito-landing-active');
    document.body.classList.add('pepito-landing-active');
    return () => {
      root.classList.remove('pepito-landing-active');
      document.body.classList.remove('pepito-landing-active');
    };
  }, []);

  return (
    <div className="pepito-landing pepito-flow-page pd-shop-page" dir="rtl">
      <header className={`pepito-nav${scrolled ? ' is-scrolled' : ''}${isLoggedIn ? ' pepito-nav--app' : ''}`}>
        <NavUserCluster />
        <Link to="/" className="pepito-nav-logo" aria-label={BRAND.displayName}>
          <img src="/pepito/img/logo.png" alt={BRAND.displayName} />
        </Link>
        <nav className="pepito-nav-links pepito-nav-links--app" aria-label="پت دیت شاپ">
          <NavLink to="/shop" end>
            پت دیت شاپ
          </NavLink>
          <NavLink to="/shop/c/dog-food">سگ</NavLink>
          <NavLink to="/shop/c/cat-food">گربه</NavLink>
          <NavLink to="/shop/c/bird-food">پرنده</NavLink>
          <Link to="/#services">خدمات</Link>
        </nav>
        <div className="pepito-nav-actions">
          <Link
            to="/shop/cart"
            className="pd-shop-cart-link"
            data-shop-cart-target
            aria-label="سبد خرید"
          >
            <ShoppingBag size={18} strokeWidth={2} />
            {itemCount > 0 ? (
              <span className="pd-shop-cart-count">{itemCount.toLocaleString('fa-IR')}</span>
            ) : null}
          </Link>
          {!isLoggedIn ? (
            <Link to={loginPath('/shop')} className="pepito-nav-login">
              ورود
            </Link>
          ) : null}
          <Link to="/shop" className="pepito-btn pepito-btn--nav">
            <PawIcon />
            پت شاپ
          </Link>
        </div>
      </header>

      {!hideBanner ? (
        <section className="pd-shop-hero pd-shop-hero--full" aria-label={bannerTitle}>
          <img
            className="pd-shop-hero-img"
            src="/media/petdate-shop-hero.png"
            alt="پت دیت شاپ — فضای برند فروشگاه حیوانات خانگی"
          />
          <div className="pd-shop-hero-wash" aria-hidden />
          <div className="pd-shop-hero-inner">
            <p className="pd-shop-hero-brand">
              <span className="pepito-kicker-dot" aria-hidden>
                <PawPrint size={16} />
              </span>
              PetDate Shop
            </p>
            <h1>{bannerTitle}</h1>
            {bannerLead ? <p>{bannerLead}</p> : null}
          </div>
        </section>
      ) : null}

      <main className="pd-shop-main">{children}</main>

      <SiteFooter />
    </div>
  );
}

import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';
import { SITE_NAV_AUTH, SITE_NAV_GUEST } from '../lib/siteNav';

/**
 * Site-wide mobile bottom dock (full primary set).
 * Guest: شاپ / همبازی / سبد / ورود
 * Logged-in: شاپ / همبازی / گفتگو / کیف پول / پروفایل
 * Desktop uses a slimmer SiteDesktopNav + left avatar/wallet/cart cluster.
 */
export function LandingMobileDock() {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuthStore();

  if (
    pathname.startsWith('/admin') ||
    pathname === '/chats' ||
    pathname.startsWith('/chats/') ||
    pathname.startsWith('/vet-chats')
  ) {
    return null;
  }

  const items = isLoggedIn ? SITE_NAV_AUTH : SITE_NAV_GUEST;

  return (
    <nav className="pepito-landing-mobile-dock" aria-label="میانبرهای موبایل">
      {items.map((item) => {
        const href = item.gate && !isLoggedIn ? loginPath(item.to) : item.to;
        const active = item.match?.(pathname) ?? pathname === item.to;
        return (
          <Link
            key={item.key}
            to={href}
            className={`pepito-landing-mobile-dock-link${active ? ' is-active' : ''}`}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon size={22} strokeWidth={2} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

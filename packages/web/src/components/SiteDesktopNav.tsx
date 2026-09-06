import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';
import { SITE_NAV_AUTH, SITE_NAV_GUEST } from '../lib/siteNav';

/**
 * Desktop primary actions — same destinations as the mobile bottom dock.
 * Visible from 860px up (CSS); hidden on admin/chat.
 */
export function SiteDesktopNav() {
  const { pathname } = useLocation();
  const { isLoggedIn } = useAuthStore();

  if (pathname.startsWith('/admin') || /\/chats?\//.test(pathname)) {
    return null;
  }

  const items = isLoggedIn ? SITE_NAV_AUTH : SITE_NAV_GUEST;

  return (
    <nav className="pepito-site-desktop-nav" aria-label="میانبرهای اصلی">
      {items.map((item) => {
        const href = item.gate && !isLoggedIn ? loginPath(item.to) : item.to;
        const active = item.match?.(pathname) ?? pathname === item.to;
        return (
          <Link
            key={item.key}
            to={href}
            className={`pepito-site-desktop-nav-link${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <item.icon size={16} strokeWidth={2.25} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

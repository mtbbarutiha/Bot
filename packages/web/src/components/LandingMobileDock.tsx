import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, ShoppingBag, UserRound, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuthStore';
import { loginPath } from '../lib/authRedirect';

type DockItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Require login (and post-auth readiness for app destinations) */
  gate: boolean;
  match?: (pathname: string) => boolean;
};

const ITEMS: DockItem[] = [
  {
    key: 'shop',
    label: 'شاپ',
    to: '/shop',
    icon: ShoppingBag,
    gate: false,
    match: (p) => p === '/shop' || p.startsWith('/shop/'),
  },
  {
    key: 'playmate',
    label: 'پیدا کردن همبازی',
    to: '/explore',
    icon: LayoutGrid,
    gate: true,
    match: (p) => p === '/explore' || p.startsWith('/explore'),
  },
  {
    key: 'wallet',
    label: 'مشاهده کیف پول',
    to: '/wallet',
    icon: Wallet,
    gate: true,
    match: (p) => p === '/wallet' || p.startsWith('/wallet/'),
  },
  {
    key: 'profile',
    label: 'پروفایل',
    to: '/profile',
    icon: UserRound,
    gate: true,
    match: (p) => p === '/profile' || p.startsWith('/profile'),
  },
];

/**
 * Mobile-only sticky actions for the Pepito landing (`/`).
 * Not mounted inside the logged-in Layout shell (that already has `pepito-app-mobile-nav`).
 */
export function LandingMobileDock() {
  const { pathname } = useLocation();
  const { isLoggedIn, hasRole, isProfileComplete } = useAuthStore();
  const ready = isLoggedIn && hasRole && isProfileComplete;

  return (
    <nav className="pepito-landing-mobile-dock" aria-label="میانبرهای موبایل">
      {ITEMS.map((item) => {
        const href = item.gate && !ready ? loginPath(item.to) : item.to;
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

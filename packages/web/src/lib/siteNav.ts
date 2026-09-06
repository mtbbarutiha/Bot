import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  LogIn,
  MessagesSquare,
  ShoppingBag,
  ShoppingCart,
  Stethoscope,
  UserRound,
  Wallet,
} from 'lucide-react';
import type { User, UserRole } from '@petdate/shared';
import { primaryRole } from '@petdate/shared';

export type SiteNavItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Send guests through login when true */
  gate?: boolean;
  match?: (pathname: string) => boolean;
};

const SHOP: SiteNavItem = {
  key: 'shop',
  label: 'شاپ',
  to: '/shop',
  icon: ShoppingBag,
  match: (p) => p === '/shop' || (p.startsWith('/shop/') && p !== '/shop/cart'),
};

const SHOP_AUTH: SiteNavItem = {
  ...SHOP,
  match: (p) => p === '/shop' || p.startsWith('/shop/'),
};

const PLAYMATE: SiteNavItem = {
  key: 'playmate',
  label: 'همبازی',
  to: '/explore',
  icon: LayoutGrid,
  match: (p) => p === '/explore' || p.startsWith('/explore'),
};

const CHATS: SiteNavItem = {
  key: 'chats',
  label: 'گفتگو',
  to: '/chats',
  icon: MessagesSquare,
  match: (p) => p === '/chats' || p.startsWith('/chats/') || p.startsWith('/vet-chats'),
};

const WALLET: SiteNavItem = {
  key: 'wallet',
  label: 'کیف پول',
  to: '/wallet',
  icon: Wallet,
  match: (p) => p === '/wallet' || p.startsWith('/wallet/'),
};

const PROFILE: SiteNavItem = {
  key: 'profile',
  label: 'پروفایل',
  to: '/profile',
  icon: UserRound,
  match: (p) => p === '/profile' || p.startsWith('/profile'),
};

const VET_PANEL: SiteNavItem = {
  key: 'vet_panel',
  label: 'پنل پزشک',
  to: '/vet-consult',
  icon: Stethoscope,
  match: (p) => p === '/vet-consult' || p.startsWith('/vet-consult'),
};

const CART: SiteNavItem = {
  key: 'cart',
  label: 'سبد خرید',
  to: '/shop/cart',
  icon: ShoppingCart,
  match: (p) => p === '/shop/cart',
};

const LOGIN: SiteNavItem = {
  key: 'login',
  label: 'ورود',
  to: '/auth/login',
  icon: LogIn,
  match: (p) => p.startsWith('/auth'),
};

/** Guest primary destinations (mobile dock + desktop header). */
export const SITE_NAV_GUEST: SiteNavItem[] = [
  SHOP,
  { ...PLAYMATE, gate: true },
  CART,
  LOGIN,
];

/**
 * Logged-in owner set (legacy default). Prefer `siteNavMobileForUser`.
 * Owner: شاپ / همبازی / گفتگو / کیف پول / پروفایل
 */
export const SITE_NAV_AUTH: SiteNavItem[] = [SHOP_AUTH, PLAYMATE, CHATS, WALLET, PROFILE];

/**
 * Desktop header shortcuts — avoid duplicating left-cluster tools.
 * Guest: cart lives in NavUserCluster; Auth: wallet chip + circular avatar cover wallet/profile.
 */
export const SITE_NAV_DESKTOP_GUEST: SiteNavItem[] = SITE_NAV_GUEST.filter(
  (item) => item.key !== 'cart',
);

export const SITE_NAV_DESKTOP_AUTH: SiteNavItem[] = SITE_NAV_AUTH.filter(
  (item) => item.key !== 'wallet' && item.key !== 'profile',
);

/** Mobile dock items for the active primary role. */
export function siteNavMobileForRole(role?: UserRole | null): SiteNavItem[] {
  switch (role) {
    case 'vet':
      // دامپزشک: بدون همبازی — پنل پزشک + گفتگو
      return [SHOP_AUTH, VET_PANEL, CHATS, WALLET, PROFILE];
    case 'pet_owner':
      return [SHOP_AUTH, PLAYMATE, CHATS, WALLET, PROFILE];
    case 'trainer':
    case 'pet_sitter':
    case 'pet_seeker':
    case 'community_seeker':
    case 'no_pet':
      // بدون همبازی — فقط مقصدهای عمومی
      return [SHOP_AUTH, CHATS, WALLET, PROFILE];
    default:
      return [SHOP_AUTH, CHATS, WALLET, PROFILE];
  }
}

/** Desktop header items for the active primary role (no wallet/profile — in cluster). */
export function siteNavDesktopForRole(role?: UserRole | null): SiteNavItem[] {
  return siteNavMobileForRole(role).filter(
    (item) => item.key !== 'wallet' && item.key !== 'profile',
  );
}

export function siteNavMobileForUser(user?: User | null): SiteNavItem[] {
  return siteNavMobileForRole(primaryRole(user?.roles, user?.role));
}

export function siteNavDesktopForUser(user?: User | null): SiteNavItem[] {
  return siteNavDesktopForRole(primaryRole(user?.roles, user?.role));
}

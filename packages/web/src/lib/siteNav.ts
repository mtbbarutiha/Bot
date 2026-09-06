import type { LucideIcon } from 'lucide-react';
import {
  LayoutGrid,
  LogIn,
  MessagesSquare,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  Wallet,
} from 'lucide-react';

export type SiteNavItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Send guests through login when true */
  gate?: boolean;
  match?: (pathname: string) => boolean;
};

/** Guest primary destinations (mobile dock + desktop header). */
export const SITE_NAV_GUEST: SiteNavItem[] = [
  {
    key: 'shop',
    label: 'شاپ',
    to: '/shop',
    icon: ShoppingBag,
    match: (p) => p === '/shop' || (p.startsWith('/shop/') && p !== '/shop/cart'),
  },
  {
    key: 'playmate',
    label: 'همبازی',
    to: '/explore',
    icon: LayoutGrid,
    gate: true,
    match: (p) => p === '/explore' || p.startsWith('/explore'),
  },
  {
    key: 'cart',
    label: 'سبد خرید',
    to: '/shop/cart',
    icon: ShoppingCart,
    match: (p) => p === '/shop/cart',
  },
  {
    key: 'login',
    label: 'ورود',
    to: '/auth/login',
    icon: LogIn,
    match: (p) => p.startsWith('/auth'),
  },
];

/** Logged-in primary destinations (mobile dock + desktop header). */
export const SITE_NAV_AUTH: SiteNavItem[] = [
  {
    key: 'shop',
    label: 'شاپ',
    to: '/shop',
    icon: ShoppingBag,
    match: (p) => p === '/shop' || p.startsWith('/shop/'),
  },
  {
    key: 'playmate',
    label: 'همبازی',
    to: '/explore',
    icon: LayoutGrid,
    match: (p) => p === '/explore' || p.startsWith('/explore'),
  },
  {
    key: 'chats',
    label: 'گفتگو',
    to: '/chats',
    icon: MessagesSquare,
    match: (p) => p === '/chats' || p.startsWith('/chats/') || p.startsWith('/vet-chats'),
  },
  {
    key: 'wallet',
    label: 'کیف پول',
    to: '/wallet',
    icon: Wallet,
    match: (p) => p === '/wallet' || p.startsWith('/wallet/'),
  },
  {
    key: 'profile',
    label: 'پروفایل',
    to: '/profile',
    icon: UserRound,
    match: (p) => p === '/profile' || p.startsWith('/profile'),
  },
];

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

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  LogOut,
  Mail,
  PawPrint,
  ShoppingBag,
  Stethoscope,
  User,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LandingChrome } from './LandingChrome';
import { useAuthStore } from '../hooks/useAuthStore';

/** Bot-parity destinations — web labels stay clean (icons carry the cue). */
const navItems: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/home', icon: Home, label: 'خانه' },
  { to: '/explore', icon: LayoutGrid, label: 'پیدا کردن همبازی' },
  { to: '/matches', icon: Mail, label: 'درخواست‌ها' },
  { to: '/add-pet', icon: PawPrint, label: 'پت‌های من' },
  { to: '/vet-consult', icon: Zap, label: 'ارتباط با پزشک' },
  { to: '/clinics', icon: Stethoscope, label: 'کلینیک‌ها' },
  { to: '/shop', icon: ShoppingBag, label: 'پت‌شاپ' },
  { to: '/profile', icon: User, label: 'پروفایل' },
];

const mobileNav = navItems.filter((i) =>
  ['/home', '/explore', '/matches', '/profile'].includes(i.to)
);

export function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function onLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <LandingChrome
      appNav
      hideBanner
      footer={false}
      actionLabel="خروج"
      onAction={() => void onLogout()}
      ctaLabel="همبازی"
      ctaTo="/explore"
      className="pepito-app-shell"
    >
      <div className="pepito-app-layout">
        <aside className="pepito-app-rail" aria-label="منوی بیشتر">
          <p className="pepito-app-rail-user">{user?.name || 'کاربر Pet Date'}</p>
          <nav className="pepito-app-rail-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/home'}
                className={({ isActive }) => `pepito-app-rail-link${isActive ? ' is-active' : ''}`}
              >
                <item.icon size={18} strokeWidth={2} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <button type="button" className="pepito-app-rail-logout" onClick={() => void onLogout()}>
            <LogOut size={16} /> خروج
          </button>
        </aside>

        <main className="pepito-app-main">
          <Outlet />
        </main>

        <nav className="pepito-app-mobile-nav" aria-label="منوی اصلی">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home'}
              className={({ isActive }) => `pepito-app-mobile-link${isActive ? ' is-active' : ''}`}
              aria-label={item.label}
            >
              <item.icon size={22} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </LandingChrome>
  );
}

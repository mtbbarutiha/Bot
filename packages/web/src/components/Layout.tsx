import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  LayoutGrid,
  PawPrint,
  ShoppingBag,
  Stethoscope,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LandingChrome } from './LandingChrome';
import { RoleSwitchControl } from './RoleSwitchControl';
import { useAuthStore } from '../hooks/useAuthStore';

/** Bot-parity destinations — web labels stay clean (icons carry the cue).
 *  Profile lives in the top-left ProfileMenu (avatar), not this rail. */
const navItems: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/home', icon: Home, label: 'خانه' },
  { to: '/explore', icon: LayoutGrid, label: 'پیدا کردن همبازی' },
  { to: '/add-pet', icon: PawPrint, label: 'پت‌های من' },
  { to: '/vet-consult', icon: Zap, label: 'ارتباط با پزشک' },
  { to: '/clinics', icon: Stethoscope, label: 'کلینیک‌ها' },
  { to: '/shop', icon: ShoppingBag, label: 'پت‌شاپ' },
];

const mobileNav = navItems.filter((i) =>
  ['/home', '/explore', '/add-pet'].includes(i.to)
);

export function Layout() {
  const { user } = useAuthStore();

  return (
    <LandingChrome
      appNav
      hideBanner
      footer
      ctaLabel="همبازی"
      ctaTo="/explore"
      className="pepito-app-shell"
    >
      <div className="pepito-app-layout">
        <aside className="pepito-app-rail" aria-label="منوی بیشتر">
          <p className="pepito-app-rail-brand">Pet Date</p>
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
            <RoleSwitchControl variant="rail" />
          </nav>
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

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
import { BrandMark } from './BrandMark';
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
    <div className="app-layout">
      <aside className="desktop-sidebar" aria-label="منوی اصلی">
        <BrandMark iconSize={28} className="desktop-sidebar-brand" />
        <p className="desktop-sidebar-user">{user?.name || 'کاربر petdate'}</p>
        <nav className="desktop-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home'}
              className={({ isActive }) => `desktop-nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={20} strokeWidth={2} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <button type="button" className="desktop-logout" onClick={onLogout}>
          <LogOut size={18} /> خروج
        </button>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="floating-nav mobile-nav" aria-label="منوی اصلی">
        {mobileNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/home'}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            aria-label={item.label}
          >
            <item.icon size={22} strokeWidth={2} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

import { NavLink, Outlet } from 'react-router-dom';
import { Home, LayoutGrid, Mail, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const navItems: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/', icon: Home, label: 'خانه' },
  { to: '/explore', icon: LayoutGrid, label: 'جستجو' },
  { to: '/matches', icon: Mail, label: 'درخواست‌ها' },
  { to: '/profile', icon: User, label: 'پروفایل' },
];

export function Layout() {
  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="floating-nav" aria-label="منوی اصلی">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
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

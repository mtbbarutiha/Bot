import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  LayoutGrid,
  PawPrint,
  ShoppingBag,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LandingChrome } from './LandingChrome';
import { LiveIncomingRequests } from './LiveIncomingRequests';
import { RoleSwitchControl } from './RoleSwitchControl';

/** Bot-parity destinations — web labels stay clean (icons carry the cue).
 *  «خانه» is the Pepito landing (`/`); in-app dashboard stays at `/home` as «پنل».
 *  Profile lives in the top-left ProfileMenu (avatar), not this rail.
 *  Clinics nav/route temporarily hidden from product UX. */
const navItems: { to: string; icon: LucideIcon; label: string }[] = [
  { to: '/', icon: Home, label: 'خانه' },
  { to: '/home', icon: LayoutDashboard, label: 'پنل' },
  { to: '/explore', icon: LayoutGrid, label: 'پیدا کردن همبازی' },
  { to: '/add-pet', icon: PawPrint, label: 'پت‌های من' },
  { to: '/vet-consult', icon: Zap, label: 'ارتباط با پزشک' },
  { to: '/shop', icon: ShoppingBag, label: 'پت‌شاپ' },
];

export function Layout() {
  const { pathname } = useLocation();
  const isChat = pathname === '/chats' || pathname.startsWith('/chats/');
  return (
    <LandingChrome
      appNav
      hideBanner
      footer={!isChat}
      className={`pepito-app-shell${isChat ? ' pepito-app-shell--chat' : ''}`}
    >
      <div className="pepito-app-layout">
        <aside className="pepito-app-rail" aria-label="منوی بیشتر">
          <nav className="pepito-app-rail-nav">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/' || item.to === '/home'}
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
          <LiveIncomingRequests />
        </main>
      </div>
    </LandingChrome>
  );
}

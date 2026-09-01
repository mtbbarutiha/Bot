import { NavLink, Outlet } from 'react-router-dom';
import './Layout.css';

const navItems = [
  { to: '/', icon: '🏠', label: 'خانه' },
  { to: '/sections', icon: '👥', label: 'سکشن‌ها' },
  { to: '/create', icon: '➕', label: 'بازی جدید' },
  { to: '/profile', icon: '👤', label: 'پروفایل' },
];

export function Layout() {
  return (
    <div className="app-layout">
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="منوی اصلی">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <span className="bottom-nav-icon" aria-hidden>{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

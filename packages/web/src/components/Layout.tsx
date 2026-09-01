import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', icon: '🏠' },
  { to: '/explore', icon: '⊞' },
  { to: '/matches', icon: '💌' },
  { to: '/profile', icon: '👤' },
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
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {item.icon}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

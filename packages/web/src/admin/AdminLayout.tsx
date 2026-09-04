import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Mail,
  PawPrint,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { logoutAdmin } from './auth';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/admin/pets', icon: PawPrint, label: 'پت‌ها' },
  { to: '/admin/matches', icon: Mail, label: 'درخواست‌ها' },
  { to: '/admin/users', icon: Users, label: 'کاربران' },
  { to: '/admin/verification', icon: ShieldCheck, label: 'احراز هویت' },
];

export function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <BrandMark className="brand-mark--lg admin-brand-mark" iconSize={36} variant="light" />
          <small className="admin-brand-sub">پنل مدیریت petdate</small>
        </div>

        <nav className="admin-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
            >
              <item.icon size={18} strokeWidth={2} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-foot">
          <button type="button" className="admin-logout" onClick={handleLogout}>
            <LogOut size={16} />
            خروج
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <Outlet />
      </div>
    </div>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Cat,
  Dog,
  LayoutDashboard,
  LogOut,
  Mail,
  PawPrint,
  Users,
} from 'lucide-react';
import { logoutAdmin } from './auth';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/admin/pets', icon: PawPrint, label: 'پت‌ها' },
  { to: '/admin/matches', icon: Mail, label: 'درخواست‌ها' },
  { to: '/admin/users', icon: Users, label: 'کاربران' },
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
          <PawPrint size={22} strokeWidth={2.5} />
          <div>
            <strong>petdate</strong>
            <small>پنل مدیریت</small>
          </div>
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
          <div className="admin-hint">
            <Dog size={14} />
            <Cat size={14} />
            <span>مدیریت محتوا</span>
          </div>
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

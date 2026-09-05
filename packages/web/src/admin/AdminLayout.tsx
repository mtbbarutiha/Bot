import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Mail,
  PawPrint,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { AdminWordmark } from './AdminWordmark';
import { logoutAdmin } from './auth';
import '../styles/admin.css';

const NAV = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'داشبورد' },
  { to: '/admin/pets', icon: PawPrint, label: 'پت‌ها' },
  { to: '/admin/matches', icon: Mail, label: 'درخواست‌ها' },
  { to: '/admin/users', icon: Users, label: 'کاربران' },
  { to: '/admin/verification', icon: ShieldCheck, label: 'احراز هویت' },
  { to: '/admin/logs', icon: ScrollText, label: 'لاگ خطاها' },
  { to: '/admin/monitoring', icon: Activity, label: 'مانیتورینگ' },
];

export function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin/login');
  };

  return (
    <div className="admin-app">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <AdminWordmark />
            <small className="admin-brand-sub">restricted · ops only</small>
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
    </div>
  );
}

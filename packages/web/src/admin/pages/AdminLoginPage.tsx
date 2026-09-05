import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { AdminWordmark } from '../AdminWordmark';
import { loginAdmin } from '../auth';
import '../../styles/admin.css';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(password)) {
      navigate('/admin/dashboard');
      return;
    }
    setError('رمز عبور اشتباه است');
  };

  return (
    <div className="admin-app admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <AdminWordmark className="admin-login-brand" size="lg" />
        <p className="admin-login-subtitle">ورود اپراتور — جدا از اپلیکیشن کاربران</p>

        <div className="form-group">
          <label className="form-label">رمز عبور</label>
          <div className="admin-input-icon">
            <Lock size={16} />
            <input
              className="form-input"
              type="password"
              placeholder="رمز عبور را وارد کنید"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
          </div>
        </div>

        {error && <p className="admin-error">{error}</p>}

        <button type="submit" className="cta-btn admin-btn--primary">ورود به کنسول</button>
        <p className="admin-login-hint">رمز پیش‌فرض: <code>petdate</code></p>
      </form>
    </div>
  );
}

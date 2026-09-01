import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, PawPrint } from 'lucide-react';
import { loginAdmin } from '../auth';

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
    <div className="admin-login-page">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div className="admin-login-icon">
          <PawPrint size={32} strokeWidth={2} />
        </div>
        <h1>ورود ادمین</h1>
        <p>پنل مدیریت petdate</p>

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

        <button type="submit" className="cta-btn">ورود</button>
        <p className="admin-login-hint">رمز پیش‌فرض: <code>petdate</code></p>
      </form>
    </div>
  );
}

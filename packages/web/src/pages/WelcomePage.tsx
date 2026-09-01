import { useNavigate } from 'react-router-dom';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <div className="welcome-logo">petdate</div>
        <div className="welcome-wave">
          <div className="welcome-pet">🐱</div>
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-dots">
          <span className="active" /><span /><span />
        </div>
        <h1>همبازی برای پت‌ات</h1>
        <p>پت‌های نزدیک رو پیدا کن، درخواست بده و بازی کن — روی تلگرام، وب و PWA</p>

        <div className="welcome-nav">
          <button className="welcome-back" onClick={() => navigate(-1)} aria-label="بازگشت">→</button>
          <button className="welcome-go" onClick={() => navigate('/')}>
            <span className="paw-icon">🐾</span>
            <span>بزن بریم</span>
            <span className="arrows">›››</span>
          </button>
        </div>
      </div>
    </div>
  );
}

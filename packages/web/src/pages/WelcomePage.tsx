import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cat, PawPrint } from 'lucide-react';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <div className="welcome-logo">petdate</div>
        <div className="welcome-wave">
          <div className="welcome-pet-icon">
            <Cat size={96} strokeWidth={1.25} />
          </div>
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-dots">
          <span className="active" /><span /><span />
        </div>
        <h1>همبازی برای پت‌ات</h1>
        <p>پت‌های نزدیک رو پیدا کن، درخواست بده و بازی کن — روی تلگرام، وب و PWA</p>

        <div className="welcome-nav">
          <button className="welcome-back" onClick={() => navigate(-1)} aria-label="بازگشت">
            <ArrowRight size={22} strokeWidth={2} />
          </button>
          <button className="welcome-go" onClick={() => navigate('/')}>
            <span className="paw-icon">
              <PawPrint size={20} strokeWidth={2} />
            </span>
            <span>بزن بریم</span>
            <span className="arrows">›››</span>
          </button>
        </div>
      </div>
    </div>
  );
}

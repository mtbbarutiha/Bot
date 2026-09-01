import { useNavigate } from 'react-router-dom';
import { ArrowRight, Cat, PawPrint } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <BrandMark className="welcome-logo" />
        <div className="welcome-wave">
          <div className="welcome-wave-glow" aria-hidden />
          <div className="welcome-pet-icon">
            <Cat size={88} strokeWidth={1.25} />
          </div>
        </div>
      </div>

      <div className="welcome-content">
        <div className="welcome-dots">
          <span className="active" /><span /><span />
        </div>
        <h1>همبازی مناسب<br />برای پت‌ات</h1>
        <p>پت‌های نزدیک رو پیدا کن، درخواست بده و با صاحب‌شون آشنا شو.</p>

        <div className="welcome-nav">
          <button type="button" className="welcome-back" onClick={() => navigate(-1)} aria-label="بازگشت">
            <ArrowRight size={20} strokeWidth={2} />
          </button>
          <button type="button" className="welcome-go" onClick={() => navigate('/')}>
            <span>شروع کن</span>
            <span className="paw-icon">
              <PawPrint size={18} strokeWidth={2} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

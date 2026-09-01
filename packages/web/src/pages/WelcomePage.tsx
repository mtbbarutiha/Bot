import { useNavigate } from 'react-router-dom';
import { ArrowRight, PawPrint } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { WELCOME_PHOTOS } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <BrandMark className="welcome-logo" />
        <div className="welcome-wave">
          <div className="welcome-wave-glow" aria-hidden />
          <div className="welcome-photo-stack">
            <img src={WELCOME_PHOTOS[0]} alt="سگ" className="welcome-photo welcome-photo--1" />
            <img src={WELCOME_PHOTOS[1]} alt="گربه" className="welcome-photo welcome-photo--2" />
            <img src={WELCOME_PHOTOS[2]} alt="پت" className="welcome-photo welcome-photo--3" />
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

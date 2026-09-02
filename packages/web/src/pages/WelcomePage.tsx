import { useNavigate } from 'react-router-dom';
import { ArrowRight, PawPrint } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { WelcomeHero } from '../components/WelcomeHero';
import { WELCOME_HERO } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-top">
        <BrandMark className="welcome-logo brand-mark--lg" iconSize={40} />
        <div className="welcome-wave">
          <div className="welcome-wave-glow" aria-hidden />
          <WelcomeHero
            mainSrc={WELCOME_HERO.main}
            accentSrc={WELCOME_HERO.accent}
          />
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

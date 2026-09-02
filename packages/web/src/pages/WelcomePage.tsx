import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { WELCOME_HERO } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <img
        className="welcome-bg"
        src={WELCOME_HERO}
        alt="پت‌های بازیگوش"
      />
      <div className="welcome-overlay" aria-hidden />

      <div className="welcome-body">
        <header className="welcome-topbar">
          <BrandMark iconSize={32} variant="light" />
        </header>

        <div className="welcome-hero-text">
          <h1>
            <span className="welcome-hero-brand" aria-label="petdate">
              <span className="welcome-hero-pet">pet</span>
              <span className="welcome-hero-date">date</span>
            </span>
            <span className="welcome-hero-tag">همبازی برای پت‌ات</span>
          </h1>
          <p>پت‌های نزدیک رو پیدا کن و با صاحب‌شون آشنا شو</p>
        </div>

        <div className="welcome-footer">
          <button
            type="button"
            className="welcome-cta"
            onClick={() => navigate('/')}
          >
            شروع کن
          </button>
          <button
            type="button"
            className="welcome-skip"
            onClick={() => navigate(-1)}
            aria-label="بازگشت"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { WELCOME_HERO } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <img className="welcome-bg" src={WELCOME_HERO} alt="petdate" />
      <div className="welcome-overlay" aria-hidden />

      <div className="welcome-body">
        <header className="welcome-headline">
          <BrandMark variant="light" size="hero" showIcon={false} />
          <p className="welcome-headline-sub">همبازی برای پت‌ات</p>
        </header>

        <div className="welcome-footer">
          <button
            type="button"
            className="welcome-cta"
            onClick={() => navigate('/')}
          >
            شروع کن
          </button>
        </div>
      </div>
    </div>
  );
}

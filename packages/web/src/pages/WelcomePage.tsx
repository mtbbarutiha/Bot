import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../components/BrandMark';
import { WELCOME_HERO } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <img className="welcome-bg" src={WELCOME_HERO} alt="petdate" />
      <div className="welcome-overlay" aria-hidden />

      <div className="welcome-ui">
        <header className="welcome-top">
          <BrandMark
            variant="light"
            iconSize={40}
            className="welcome-brand-mark"
          />
          <p className="welcome-tagline">همبازی برای پت‌ات</p>
        </header>

        <footer className="welcome-bottom">
          <button
            type="button"
            className="welcome-cta"
            onClick={() => navigate('/')}
          >
            شروع کن
          </button>
        </footer>
      </div>
    </div>
  );
}

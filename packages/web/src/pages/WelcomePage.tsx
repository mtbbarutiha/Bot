import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MapPin, PawPrint } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { WELCOME_HERO } from '../data/petImages';

const FEATURES = [
  { icon: PawPrint, text: 'پت‌های واقعی نزدیک' },
  { icon: MapPin, text: 'بر اساس محله شما' },
  { icon: Heart, text: 'پیدا کردن همبازی' },
] as const;

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <img className="welcome-bg" src={WELCOME_HERO} alt="petdate" />
      <div className="welcome-overlay" aria-hidden />

      <header className="welcome-float">
        <BrandMark
          variant="light"
          size="hero"
          iconSize={52}
          className="welcome-brand-mark"
        />
      </header>

      <div className="welcome-sheet">
        <div className="welcome-sheet-handle" aria-hidden />

        <div className="welcome-sheet-body">
          <h1 className="welcome-sheet-title">همبازی برای پت‌ات</h1>
          <p className="welcome-sheet-desc">
            با petdate پت‌های نزدیک رو کشف کن و با صاحب‌شون آشنا شو.
          </p>

          <ul className="welcome-sheet-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <span className="welcome-feature-dot">
                  <Icon size={14} strokeWidth={2.25} />
                </span>
                {text}
              </li>
            ))}
          </ul>

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
            onClick={() => navigate('/')}
          >
            رد کردن
            <ArrowLeft size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

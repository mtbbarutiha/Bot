import { useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, MessageCircle, PawPrint, Sparkles } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { WelcomeStack } from '../components/WelcomeStack';
import { WELCOME_STACK } from '../data/petImages';

const FEATURES = [
  { icon: PawPrint, label: 'پت‌های واقعی نزدیک' },
  { icon: MapPin, label: 'بر اساس محله شما' },
  { icon: MessageCircle, label: 'ارتباط با صاحب پت' },
] as const;

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-visual">
        <div className="welcome-visual__mesh" aria-hidden />
        <div className="welcome-visual__glow" aria-hidden />

        <header className="welcome-header">
          <BrandMark className="brand-mark--lg" iconSize={36} variant="light" />
          <span className="welcome-badge">
            <Sparkles size={13} strokeWidth={2.5} />
            همبازی برای پت‌ها
          </span>
        </header>

        <WelcomeStack pets={WELCOME_STACK} />
      </div>

      <div className="welcome-content">
        <h1>
          بهترین همبازی
          <br />
          <span>برای پت‌ات</span>
        </h1>
        <p>پت‌های نزدیک رو کشف کن، درخواست بده و با صاحب‌شون آشنا شو.</p>

        <ul className="welcome-features">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label}>
              <span className="welcome-feature-icon">
                <Icon size={15} strokeWidth={2.25} />
              </span>
              {label}
            </li>
          ))}
        </ul>

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

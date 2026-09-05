import { useNavigate } from 'react-router-dom';
import { BRAND } from '@petdate/shared';
import { WELCOME_HERO } from '../data/petImages';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page welcome-page--neon">
      <img
        className="welcome-bg"
        src={WELCOME_HERO}
        alt={`${BRAND.displayName} — ${BRAND.taglineEn}`}
      />
      <div className="welcome-overlay welcome-overlay--neon" aria-hidden />

      <div className="welcome-ui welcome-ui--neon">
        <header className="welcome-top welcome-top--spacer" aria-hidden />

        <footer className="welcome-bottom welcome-bottom--neon">
          <p className="welcome-tagline welcome-tagline--en">{BRAND.taglineEn}</p>
          <p className="welcome-tagline">{BRAND.taglineFa}</p>
          <button
            type="button"
            className="welcome-cta welcome-cta--neon"
            onClick={() => navigate('/onboarding/role')}
          >
            🚀 شروع کن
          </button>
        </footer>
      </div>
    </div>
  );
}

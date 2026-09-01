import { useNavigate } from 'react-router-dom';

export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-cat-frame">🐱</div>
      </div>

      <div className="welcome-content">
        <h1>همبازی پت‌ات رو پیدا کن</h1>
        <p>
          پت‌های نزدیک رو ببین، درخواست همبازی بده و با صاحب‌شون آشنا شو.
          روی تلگرام، وب و PWA.
        </p>

        <button className="welcome-cta" onClick={() => navigate('/')}>
          <span className="paw-icon">🐾</span>
          <span>شروع کن</span>
        </button>

        <div className="welcome-dots">
          <span className="active" />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

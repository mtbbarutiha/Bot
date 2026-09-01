import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { SectionCard } from '../components/SectionCard';
import {
  CURRENT_USER,
  MOCK_GAMES,
  MOCK_SECTIONS,
  getGamesForSection,
} from '../data/mock';
import './HomePage.css';

export function HomePage() {
  const [showToast, setShowToast] = useState(false);
  const myGames = getGamesForSection(CURRENT_USER.sectionId);
  const openGames = MOCK_GAMES.filter((g) => g.status === 'open').slice(0, 4);

  const handleInstall = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="page home-page">
      <div className="hero">
        <div className="hero-content">
          <div className="hero-emoji">🎮</div>
          <h1 className="hero-title">همبازی</h1>
          <p className="hero-subtitle">
            برای سکشن‌ت بازی پیدا کن — روی تلگرام، وب و PWA
          </p>
          <div className="hero-stats">
            <div>
              <div className="hero-stat-value">{MOCK_SECTIONS.length}</div>
              <div className="hero-stat-label">سکشن فعال</div>
            </div>
            <div>
              <div className="hero-stat-value">{MOCK_GAMES.filter((g) => g.status === 'open').length}</div>
              <div className="hero-stat-label">بازی باز</div>
            </div>
            <div>
              <div className="hero-stat-value">{MOCK_SECTIONS.reduce((s, x) => s + x.memberCount, 0)}</div>
              <div className="hero-stat-label">بازیکن</div>
            </div>
          </div>
          <div className="platform-badges">
            <span className="platform-badge">📱 PWA</span>
            <span className="platform-badge">🌐 وب</span>
            <span className="platform-badge">✈️ تلگرام</span>
          </div>
        </div>
      </div>

      <div className="install-banner">
        <div className="install-banner-text">
          <strong>نصب اپ همبازی</strong>
          برای دسترسی سریع‌تر، اپ را به صفحه اصلی اضافه کن
        </div>
        <button className="btn btn-sm btn-secondary" onClick={handleInstall}>
          نصب
        </button>
      </div>

      {myGames.length > 0 && (
        <section className="home-section">
          <div className="section-header">
            <h2 className="section-title">بازی‌های سکشن من</h2>
            <Link to={`/sections/${CURRENT_USER.sectionId}`} className="btn btn-ghost btn-sm">
              همه
            </Link>
          </div>
          <p className="section-desc">
            {CURRENT_USER.sectionName} — {myGames.length} بازی باز
          </p>
          <div className="stack">
            {myGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </section>
      )}

      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">بازی‌های پیشنهادی</h2>
          <Link to="/sections" className="btn btn-ghost btn-sm">
            همه سکشن‌ها
          </Link>
        </div>
        <div className="stack">
          {openGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="section-header">
          <h2 className="section-title">سکشن‌های محبوب</h2>
        </div>
        <div className="stack">
          {MOCK_SECTIONS.slice(0, 3).map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              gameCount={getGamesForSection(section.id).length}
            />
          ))}
        </div>
      </section>

      <Link to="/create" className="btn btn-primary btn-block home-cta">
        ➕ ساخت بازی جدید
      </Link>

      {showToast && (
        <div className="toast" role="status">
          در مرورگر موبایل از منو «Add to Home Screen» استفاده کن
        </div>
      )}
    </div>
  );
}

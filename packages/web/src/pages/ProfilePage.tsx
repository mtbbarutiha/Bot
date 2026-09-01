import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CURRENT_USER, MOCK_SECTIONS, getGamesForSection } from '../data/mock';

export function ProfilePage() {
  const [selectedSection, setSelectedSection] = useState(String(CURRENT_USER.sectionId));
  const [showToast, setShowToast] = useState(false);
  const myGames = getGamesForSection(Number(selectedSection));

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const currentSection = MOCK_SECTIONS.find((s) => s.id === Number(selectedSection));

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">پروفایل</h1>
        <p className="page-subtitle">تنظیمات حساب و سکشن</p>
      </header>

      <div className="card" style={{ textAlign: 'center', marginBottom: 20, padding: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-primary-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: 'white',
            margin: '0 auto 12px',
            fontWeight: 800,
          }}
        >
          {CURRENT_USER.name.charAt(0)}
        </div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{CURRENT_USER.name}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
          بازیکن فعال
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="section">سکشن من</label>
        <select
          id="section"
          className="form-select"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
        >
          {MOCK_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.name}
            </option>
          ))}
        </select>
      </div>

      {currentSection && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '2rem' }}>{currentSection.emoji}</span>
            <div>
              <div style={{ fontWeight: 700 }}>{currentSection.name}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {currentSection.memberCount} عضو · {myGames.length} بازی باز
              </div>
            </div>
          </div>
          <Link
            to={`/sections/${currentSection.id}`}
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 12, display: 'inline-flex' }}
          >
            مشاهده بازی‌های سکشن ←
          </Link>
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={handleSave} style={{ marginBottom: 24 }}>
        ذخیره تغییرات
      </button>

      <div className="card" style={{ background: 'var(--color-surface-2)' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>بسترهای در دسترس</h3>
        <div className="stack" style={{ gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
            <span>🌐</span>
            <span>وب — همین الان فعال</span>
            <span className="badge badge-open" style={{ marginRight: 'auto' }}>فعال</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem' }}>
            <span>📱</span>
            <span>PWA — قابل نصب روی موبایل</span>
            <span className="badge badge-open" style={{ marginRight: 'auto' }}>فعال</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', opacity: 0.6 }}>
            <span>✈️</span>
            <span>ربات تلگرام</span>
            <span className="badge badge-type" style={{ marginRight: 'auto' }}>فاز ۲</span>
          </div>
        </div>
      </div>

      {showToast && (
        <div className="toast" role="status">
          تنظیمات ذخیره شد (نمایشی)
        </div>
      )}
    </div>
  );
}

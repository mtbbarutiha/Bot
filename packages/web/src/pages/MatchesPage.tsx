import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_MATCHES, MY_PET, formatTimeAgo } from '../data/mock';

export function MatchesPage() {
  const [matches, setMatches] = useState(MOCK_MATCHES);
  const [tab, setTab] = useState<'pending' | 'accepted'>('pending');

  const filtered = matches.filter((m) =>
    tab === 'pending' ? m.status === 'pending' : m.status === 'accepted'
  );

  const handleAccept = (id: number) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'accepted' as const } : m))
    );
  };

  const handleReject = (id: number) => {
    setMatches((prev) => prev.filter((m) => m.id !== id));
  };

  const pendingCount = matches.filter((m) => m.status === 'pending').length;

  return (
    <>
      <div className="greeting" style={{ paddingTop: 20 }}>
        <h1>درخواست‌ها 💌</h1>
        <p>برای {MY_PET.name} · {pendingCount} جدید</p>
      </div>

      <div className="categories" style={{ paddingBottom: 16 }}>
        <button
          className={`category-item${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
        >
          <div className="category-circle" style={{ width: 48, height: 48, fontSize: '1rem' }}>
            ⏳
          </div>
          <span>در انتظار ({pendingCount})</span>
        </button>
        <button
          className={`category-item${tab === 'accepted' ? ' active' : ''}`}
          onClick={() => setTab('accepted')}
        >
          <div className="category-circle" style={{ width: 48, height: 48, fontSize: '1rem' }}>
            ✓
          </div>
          <span>پذیرفته</span>
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="match-list">
          {filtered.map((match) => (
            <div key={match.id} className="match-card">
              <div className="match-card-header">
                <div className="match-avatar">{match.fromPet.emoji}</div>
                <div className="match-info">
                  <h3>{match.fromPet.name}</h3>
                  <p>{match.fromPet.breed} · {match.fromPet.neighborhood}</p>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>
                  {formatTimeAgo(match.createdAt)}
                </span>
              </div>

              {match.message && (
                <p className="match-msg">«{match.message}»</p>
              )}

              {match.status === 'pending' ? (
                <div className="match-actions">
                  <button className="btn-accept" onClick={() => handleAccept(match.id)}>
                    ✓ قبول
                  </button>
                  <button className="btn-reject" onClick={() => handleReject(match.id)}>
                    رد
                  </button>
                  <Link
                    to={`/pets/${match.fromPet.id}`}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '999px',
                      background: 'var(--blue-100)',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    پروفایل
                  </Link>
                </div>
              ) : (
                <div className="match-actions">
                  <button className="btn-accept" disabled style={{ opacity: 0.5 }}>
                    💬 چت (فاز بعدی)
                  </button>
                  <Link
                    to={`/pets/${match.fromPet.id}`}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '10px',
                      borderRadius: '999px',
                      background: '#f3f4f6',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                    }}
                  >
                    پروفایل
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">💌</div>
          <h3>{tab === 'pending' ? 'درخواست جدیدی نیست' : 'هنوز مچی نداری'}</h3>
          <p>برو جستجو کن و همبازی پیدا کن!</p>
          <Link to="/explore" className="cta-btn dark" style={{ display: 'inline-block', marginTop: 16, padding: '12px 24px' }}>
            جستجو
          </Link>
        </div>
      )}
    </>
  );
}

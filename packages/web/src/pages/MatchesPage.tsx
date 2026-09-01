import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Mail, MessageCircle } from 'lucide-react';
import { PetAvatar } from '../components/PetAvatar';
import { formatTimeAgo } from '../data/mock';
import { usePetStore } from '../hooks/usePetStore';

export function MatchesPage() {
  const { matches, myPet, updateMatchStatus, deleteMatch } = usePetStore();
  const [tab, setTab] = useState<'pending' | 'accepted'>('pending');

  const filtered = matches.filter((m) =>
    tab === 'pending' ? m.status === 'pending' : m.status === 'accepted'
  );

  const pendingCount = matches.filter((m) => m.status === 'pending').length;

  return (
    <>
      <div className="page-title-block">
        <h1>
          درخواست‌ها
          <Mail size={22} className="title-icon" />
        </h1>
        <p>برای {myPet.name} · {pendingCount} جدید</p>
      </div>

      <div className="match-tabs">
        <button
          className={`match-tab${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
        >
          <Clock size={14} strokeWidth={2} />
          در انتظار ({pendingCount})
        </button>
        <button
          className={`match-tab${tab === 'accepted' ? ' active' : ''}`}
          onClick={() => setTab('accepted')}
        >
          <Check size={14} strokeWidth={2} />
          پذیرفته
        </button>
      </div>

      {filtered.length > 0 ? (
        <div className="match-list">
          {filtered.map((match) => (
            <div key={match.id} className="match-card">
              <div className="match-card-header">
                <PetAvatar type={match.fromPet.type} size="sm" imageUrl={match.fromPet.imageUrl} name={match.fromPet.name} />
                <div className="match-info">
                  <h3>{match.fromPet.name}</h3>
                  <p>{match.fromPet.breed} · {formatTimeAgo(match.createdAt)}</p>
                </div>
              </div>
              {match.message && <p className="match-msg">«{match.message}»</p>}
              {match.status === 'pending' ? (
                <div className="match-actions">
                  <button className="btn-accept" onClick={() => updateMatchStatus(match.id, 'accepted')}>
                    <Check size={16} strokeWidth={2.5} />
                    قبول
                  </button>
                  <button className="btn-reject" onClick={() => deleteMatch(match.id)}>رد</button>
                  <Link to={`/pets/${match.fromPet.id}`} className="btn-profile">پروفایل</Link>
                </div>
              ) : (
                <div className="match-actions">
                  <button className="btn-reject" disabled style={{ opacity: 0.5 }}>
                    <MessageCircle size={16} strokeWidth={2} />
                    چت (فاز بعدی)
                  </button>
                  <Link to={`/pets/${match.fromPet.id}`} className="btn-accept btn-profile">پروفایل</Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <Mail size={40} strokeWidth={1.5} />
          </div>
          <h3>{tab === 'pending' ? 'درخواست جدیدی نیست' : 'هنوز مچی نداری'}</h3>
          <Link to="/explore" className="cta-btn cta-btn--inline">
            جستجو
          </Link>
        </div>
      )}
    </>
  );
}

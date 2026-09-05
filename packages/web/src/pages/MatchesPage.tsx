import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check, Clock, Mail, MapPin, MessageCircle } from 'lucide-react';
import { userHasRole } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { formatTimeAgo } from '../data/mock';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';

export function MatchesPage() {
  const { matches, myPet, updateMatchStatus, deleteMatch } = usePetStore();
  const { user } = useUserStore();
  const [tab, setTab] = useState<'pending' | 'accepted'>('pending');

  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');

  if (!isPetOwner) {
    return (
      <>
        <div className="page-title-block">
          <BrandMark className="greeting-brand" iconSize={22} />
          <h1>درخواست‌ها</h1>
        </div>
        <div className="empty-state empty-state--role">
          <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
          <h3>همبازی برای صاحبان پت</h3>
          <p>این بخش برای نقش «صاحب پت» فعاله. از پروفایل نقشت رو تغییر بده یا خدمات دیگه رو امتحان کن.</p>
          <Link to="/profile" className="cta-btn cta-btn--inline">👤 پروفایل</Link>
        </div>
      </>
    );
  }

  const filtered = matches.filter((m) =>
    tab === 'pending' ? m.status === 'pending' : m.status === 'accepted'
  );

  const pendingCount = matches.filter((m) => m.status === 'pending').length;

  return (
    <>
      <div className="page-title-block">
        <BrandMark className="greeting-brand" iconSize={22} />
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
              <Link to={`/pets/${match.fromPet.id}`} className="match-card-photo">
                <img src={match.fromPet.imageUrl} alt={match.fromPet.name} />
                <div className="match-card-photo-overlay">
                  <strong>{match.fromPet.name}</strong>
                  <span>{match.fromPet.breed}</span>
                </div>
              </Link>
              <div className="match-card-body">
                <div className="match-card-header">
                  <PetAvatar type={match.fromPet.type} size="sm" imageUrl={match.fromPet.imageUrl} name={match.fromPet.name} />
                  <div className="match-info">
                    <h3>{match.fromPet.name}</h3>
                    <p>{formatTimeAgo(match.createdAt)}</p>
                  </div>
                </div>
                {match.message && <p className="match-msg">«{match.message}»</p>}
                {match.scheduledAt && (
                  <p className="match-schedule">
                    <Calendar size={14} strokeWidth={2} />
                    {new Date(match.scheduledAt).toLocaleDateString('fa-IR')}
                    {match.location && (
                      <>
                        <MapPin size={14} strokeWidth={2} />
                        {match.location}
                      </>
                    )}
                  </p>
                )}
                {match.status === 'pending' ? (
                  <div className="match-actions">
                    <button className="btn-accept" onClick={() => updateMatchStatus(match.id, 'accepted')}>
                      <Check size={16} strokeWidth={2.5} />
                      ✅ قبول
                    </button>
                    <button className="btn-reject" onClick={() => deleteMatch(match.id)}>❌ رد</button>
                    <Link to={`/pets/${match.fromPet.id}`} className="btn-profile">👤 پروفایل</Link>
                  </div>
                ) : (
                  <div className="match-actions">
                    <Link to={`/chats/${match.id}`} className="btn-accept">
                      <MessageCircle size={16} strokeWidth={2} />
                      💬 باز کردن چت
                    </Link>
                    <Link to={`/pets/${match.fromPet.id}`} className="btn-profile">👤 پروفایل</Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
          <h3>{tab === 'pending' ? 'درخواست جدیدی نیست' : 'هنوز مچی نداری'}</h3>
          <Link to="/explore" className="cta-btn cta-btn--inline">
            🔍 جستجو
          </Link>
        </div>
      )}
    </>
  );
}

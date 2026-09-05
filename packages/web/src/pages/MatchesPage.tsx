import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Check, Clock, Mail, MapPin, MessageCircle, RefreshCw } from 'lucide-react';
import { userHasRole } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { formatTimeAgo } from '../data/mock';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';
import { listPlaydateRequests, updatePlaydateStatus } from '../lib/api';
import { playdateToMatchRequest } from '../lib/playdateMap';
import type { MatchRequest } from '../types';

export function MatchesPage() {
  const { myPet } = usePetStore();
  const { user } = useUserStore();
  const { user: authUser, isLoggedIn } = useAuthStore();
  const [tab, setTab] = useState<'pending' | 'accepted'>('pending');
  const [matches, setMatches] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const myUserId = authUser?.id ?? user.id;

  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');

  const reload = useCallback(async () => {
    if (!myUserId) {
      setMatches([]);
      setLoading(false);
      setError('برای دیدن درخواست‌های ربات وارد حساب شو.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listPlaydateRequests({ userId: myUserId });
      const mapped = rows
        .filter((r) => {
          const ownsTo = r.toUserId === myUserId || r.toPet?.ownerId === myUserId;
          const ownsFrom = r.fromUserId === myUserId || r.fromPet?.ownerId === myUserId;
          if (r.status === 'pending') return Boolean(ownsTo);
          if (r.status === 'accepted') return Boolean(ownsTo || ownsFrom);
          return false;
        })
        .map((r) => playdateToMatchRequest(r, myUserId));
      setMatches(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'بارگذاری درخواست‌ها ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, [myUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const incomingPending = useMemo(
    () => matches.filter((m) => m.status === 'pending'),
    [matches]
  );
  const accepted = useMemo(
    () => matches.filter((m) => m.status === 'accepted'),
    [matches]
  );
  const filtered = tab === 'pending' ? incomingPending : accepted;
  const pendingCount = incomingPending.length;

  async function onAccept(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await updatePlaydateStatus(id, 'accepted');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'قبول درخواست ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function onReject(id: number) {
    setBusyId(id);
    setError(null);
    try {
      await updatePlaydateStatus(id, 'rejected');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'رد درخواست ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

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
          <Link to="/profile" className="cta-btn cta-btn--inline">پروفایل</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-title-block">
        <BrandMark className="greeting-brand" iconSize={22} />
        <h1>
          درخواست‌ها
          <Mail size={22} className="title-icon" />
        </h1>
        <p>
          {isLoggedIn ? `همگام با ربات · ${pendingCount} جدید` : 'برای همگام‌سازی با ربات وارد شو'}
          {myPet?.name ? ` · ${myPet.name}` : ''}
        </p>
      </div>

      <div className="match-tabs">
        <button
          type="button"
          className={`match-tab${tab === 'pending' ? ' active' : ''}`}
          onClick={() => setTab('pending')}
        >
          <Clock size={14} strokeWidth={2} />
          در انتظار ({pendingCount})
        </button>
        <button
          type="button"
          className={`match-tab${tab === 'accepted' ? ' active' : ''}`}
          onClick={() => setTab('accepted')}
        >
          <Check size={14} strokeWidth={2} />
          پذیرفته
        </button>
        <button type="button" className="match-tab" onClick={() => void reload()} aria-label="بروزرسانی">
          <RefreshCw size={14} strokeWidth={2} />
          بروزرسانی
        </button>
      </div>

      {error && <p className="auth-error" style={{ margin: '12px 0' }}>{error}</p>}

      {loading ? (
        <div className="empty-state">
          <h3>در حال بارگذاری…</h3>
        </div>
      ) : filtered.length > 0 ? (
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
                  <PetAvatar
                    type={match.fromPet.type}
                    size="sm"
                    imageUrl={match.fromPet.imageUrl}
                    name={match.fromPet.name}
                  />
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
                    <button
                      type="button"
                      className="btn-accept"
                      disabled={busyId === match.id}
                      onClick={() => void onAccept(match.id)}
                    >
                      <Check size={16} strokeWidth={2.5} />
                      {busyId === match.id ? '…' : 'قبول'}
                    </button>
                    <button
                      type="button"
                      className="btn-reject"
                      disabled={busyId === match.id}
                      onClick={() => void onReject(match.id)}
                    >
                      رد
                    </button>
                  </div>
                ) : (
                  <div className="match-actions">
                    <span className="btn-accept" style={{ pointerEvents: 'none' }}>
                      <MessageCircle size={16} strokeWidth={2} />
                      پذیرفته · چت در ربات
                    </span>
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
          <p style={{ color: '#5f7d93', fontSize: '0.9rem' }}>
            درخواست‌های ربات تلگرام اینجا می‌آیند — با همان حساب (موبایل/ایمیل).
          </p>
          <Link to="/explore" className="cta-btn cta-btn--inline">
            جستجو
          </Link>
        </div>
      )}
    </>
  );
}

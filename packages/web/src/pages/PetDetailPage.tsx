import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  PawPrint,
  Phone,
  Share2,
} from 'lucide-react';
import type { PetProfile } from '@petdate/shared';
import { formatAge, formatDistance } from '../data/mock';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { listPets, listPlaydateRequests } from '../lib/api';
import { petProfileToUiPet } from '../lib/playdateMap';
import { sendPlaymateRequestNow } from '../lib/playmateActions';
import { PET_TYPE_LABELS } from '../types';

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPetById: getPet, myPet } = usePetStore();
  const { user: authUser, isLoggedIn } = useAuthStore();
  const pet = getPet(Number(id));
  const [liked, setLiked] = useState(false);
  const [showPickFrom, setShowPickFrom] = useState(false);
  const [myPets, setMyPets] = useState<PetProfile[]>([]);
  const [alreadyRequested, setAlreadyRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const myUserId = authUser?.id;
  const isMyPet = pet?.id === myPet.id || (myUserId != null && pet?.ownerId === myUserId);

  const refreshPending = useCallback(async () => {
    if (!myUserId || !pet) {
      setAlreadyRequested(false);
      return;
    }
    try {
      const rows = await listPlaydateRequests({ userId: myUserId, status: 'pending' });
      setAlreadyRequested(
        rows.some(
          (r) =>
            r.toPetId === pet.id &&
            (r.fromUserId === myUserId || r.fromPet?.ownerId === myUserId)
        )
      );
    } catch {
      setAlreadyRequested(false);
    }
  }, [myUserId, pet]);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  useEffect(() => {
    if (!myUserId) {
      setMyPets([]);
      return;
    }
    void listPets({ ownerId: myUserId })
      .then(setMyPets)
      .catch(() => setMyPets([]));
  }, [myUserId]);

  if (!pet) {
    return (
      <div className="empty-state empty-state--top">
        <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
        <h3>پت پیدا نشد</h3>
        <button className="cta-btn cta-btn--inline" onClick={() => navigate('/explore')}>
          ↩️ بازگشت
        </button>
      </div>
    );
  }

  async function sendFrom(fromPetId: number) {
    if (!myUserId || !pet) return;
    setBusy(true);
    setError(null);
    try {
      const req = await sendPlaymateRequestNow({
        fromPetId,
        toPetId: pet.id,
        fromUserId: myUserId,
      });
      setAlreadyRequested(true);
      setShowPickFrom(false);
      setToast('✅ درخواست همبازی ارسال شد!');
      setTimeout(() => setToast(null), 1200);
      if (req?.id) {
        navigate(`/chats/${req.id}`);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال درخواست ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  function onRequestClick() {
    if (!isLoggedIn || !myUserId) {
      navigate('/auth/login');
      return;
    }
    if (alreadyRequested || busy) return;
    if (myPets.length === 0) {
      setError('اول یک پت ثبت کن');
      return;
    }
    if (myPets.length === 1) {
      void sendFrom(myPets[0]!.id);
      return;
    }
    setShowPickFrom(true);
  }

  return (
    <div className="detail-page">
      <div className="detail-hero-banner">
        <img src={pet.imageUrl} alt={pet.name} className="detail-hero-img" />
        <div className="detail-hero-overlay" />
        <div className="detail-header detail-header--overlay">
          <button className="icon-btn icon-btn--glass" onClick={() => navigate(-1)} aria-label="↩️ بازگشت">
            <ArrowRight size={20} strokeWidth={2} />
          </button>
          <h1>{pet.name}</h1>
          <div className="detail-header-actions">
            <button className="icon-btn icon-btn--glass" onClick={() => setLiked(!liked)} aria-label="علاقه‌مندی">
              <Heart size={20} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} className={liked ? 'icon-liked' : ''} />
            </button>
            <button className="icon-btn icon-btn--glass" aria-label="اشتراک">
              <Share2 size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
        <div className="detail-hero-caption">
          <span className="brand">{pet.breed}</span>
          <span className="price-pill">{formatDistance(pet.distanceKm)}</span>
        </div>
      </div>

      <div className="detail-info">
        <div className="detail-title-row">
          <div>
            <h2 className="title">{pet.name}</h2>
            <p className="subtitle">{PET_TYPE_LABELS[pet.type]} · {formatAge(pet)}</p>
          </div>
        </div>

        <div className="detail-specs">
          <div className="spec-item">
            <div className="spec-value">{formatAge(pet)}</div>
            <div className="spec-label">سن</div>
          </div>
          <div className="spec-divider" />
          <div className="spec-item">
            <div className="spec-value">{pet.neighborhood || pet.city || '—'}</div>
            <div className="spec-label">محله</div>
          </div>
          <div className="spec-divider" />
          <div className="spec-item">
            <div className="spec-value">{pet.ownerName || '—'}</div>
            <div className="spec-label">صاحب</div>
          </div>
        </div>

        {pet.bio && <p className="detail-bio">{pet.bio}</p>}

        <div className="detail-tags">
          {pet.traits.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
          {pet.vaccinated && <span className="tag green">واکسینه</span>}
          {pet.neutered && <span className="tag green">عقیم</span>}
          {pet.lookingForPlaymate && <span className="tag blue">دنبال همبازی</span>}
        </div>

        {pet.healthNotes && (
          <div className="detail-health">
            <strong>سلامت:</strong> {pet.healthNotes}
          </div>
        )}

        {error && <p className="auth-error" style={{ marginTop: 12 }}>{error}</p>}
      </div>

      {!isMyPet && (
        <div className="detail-action-bar">
          <button className="action-circle" aria-label="تماس" type="button">
            <Phone size={18} strokeWidth={2} />
          </button>
          <Link to="/explore#requests" className="action-circle" aria-label="درخواست‌ها">
            <MessageCircle size={18} strokeWidth={2} />
          </Link>
          <button
            type="button"
            className="cta-main"
            onClick={onRequestClick}
            disabled={alreadyRequested || busy}
          >
            <span className="paw">
              {alreadyRequested ? <Check size={16} strokeWidth={2.5} /> : <PawPrint size={16} strokeWidth={2} />}
            </span>
            <span>
              {busy
                ? 'در حال ارسال…'
                : alreadyRequested
                  ? 'درخواست ارسال شد'
                  : 'درخواست همبازی'}
            </span>
          </button>
        </div>
      )}

      {showPickFrom && (
        <div className="modal-overlay" onClick={() => setShowPickFrom(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>کدوم پتت رو می‌فرستی؟</h2>
            <p>برای {pet.name} — مثل ربات، بدون نوشتن پیام</p>
            <div className="find-playmate-pet-list">
              {myPets.map((p) => {
                const ui = petProfileToUiPet(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="find-playmate-pet-btn"
                    disabled={busy}
                    onClick={() => void sendFrom(p.id)}
                  >
                    <img src={ui.imageUrl} alt="" />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{[p.breed, p.city || p.ownerCity].filter(Boolean).join(' · ')}</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" className="btn-reject" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowPickFrom(false)}>
              ❌ انصراف
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

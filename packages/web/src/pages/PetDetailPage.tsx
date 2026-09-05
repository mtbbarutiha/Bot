import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Check,
  Heart,
  MapPin,
  MessageCircle,
  PawPrint,
  Phone,
  Share2,
} from 'lucide-react';
import { formatAge, formatDistance } from '../data/mock';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { usePetStore } from '../hooks/usePetStore';
import { PET_TYPE_LABELS } from '../types';

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPetById: getPet, myPet, sendPlaydateRequest, hasPendingRequest } = usePetStore();
  const pet = getPet(Number(id));
  const [liked, setLiked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({
    message: '',
    scheduledAt: '',
    location: '',
  });

  const isMyPet = pet?.id === myPet.id;
  const alreadyRequested = pet ? hasPendingRequest(pet.id) : false;

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

  const handleSendRequest = () => {
    sendPlaydateRequest({
      toPetId: pet.id,
      message: form.message || `سلام! ${myPet.name} دنبال همبازیه 🐾`,
      scheduledAt: form.scheduledAt || undefined,
      location: form.location || pet.neighborhood,
    });
    setShowModal(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

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
            <div className="spec-value">{pet.neighborhood}</div>
            <div className="spec-label">محله</div>
          </div>
          <div className="spec-divider" />
          <div className="spec-item">
            <div className="spec-value">{pet.ownerName}</div>
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
      </div>

      {!isMyPet && (
        <div className="detail-action-bar">
          <button className="action-circle" aria-label="تماس">
            <Phone size={18} strokeWidth={2} />
          </button>
          <button className="action-circle" aria-label="پیام">
            <MessageCircle size={18} strokeWidth={2} />
          </button>
          <button
            className="cta-main"
            onClick={() => setShowModal(true)}
            disabled={alreadyRequested}
          >
            <span className="paw">
              {alreadyRequested ? <Check size={16} strokeWidth={2.5} /> : <PawPrint size={16} strokeWidth={2} />}
            </span>
            <span>
              {alreadyRequested ? 'درخواست ارسال شد' : `درخواست همبازی برای ${myPet.name}`}
            </span>
          </button>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <h2>درخواست همبازی</h2>
            <p>برای {pet.name} از طرف {myPet.name}</p>

            <div className="form-group">
              <label className="form-label">پیام</label>
              <textarea
                className="form-textarea"
                placeholder={`سلام! ${myPet.name} دنبال همبازیه`}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Calendar size={14} strokeWidth={2} />
                زمان پیشنهادی
              </label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <MapPin size={14} strokeWidth={2} />
                مکان
              </label>
              <input
                className="form-input"
                placeholder={pet.neighborhood}
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>

            <button type="button" className="cta-btn" onClick={handleSendRequest}>
              📨 ارسال درخواست
            </button>
          </div>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد!</div>
      )}
    </div>
  );
}

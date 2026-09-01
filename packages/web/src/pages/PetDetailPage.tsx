import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Heart,
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
  const { getPetById: getPet, myPet } = usePetStore();
  const pet = getPet(Number(id));
  const [requested, setRequested] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const isMyPet = pet?.id === myPet.id;

  if (!pet) {
    return (
      <div className="empty-state empty-state--top">
        <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
        <h3>پت پیدا نشد</h3>
        <button className="cta-btn cta-btn--inline" onClick={() => navigate('/explore')}>
          بازگشت
        </button>
      </div>
    );
  }

  const handleRequest = () => {
    setRequested(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="detail-page">
      <div className="detail-hero-banner">
        <img src={pet.imageUrl} alt={pet.name} className="detail-hero-img" />
        <div className="detail-hero-overlay" />
        <div className="detail-header detail-header--overlay">
          <button className="icon-btn icon-btn--glass" onClick={() => navigate(-1)} aria-label="بازگشت">
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
        </div>
      </div>

      {!isMyPet && (
        <div className="detail-action-bar">
          <button className="action-circle" aria-label="تماس">
            <Phone size={18} strokeWidth={2} />
          </button>
          <button className="action-circle" aria-label="پیام">
            <MessageCircle size={18} strokeWidth={2} />
          </button>
          <button className="cta-main" onClick={handleRequest} disabled={requested}>
            <span className="paw">
              {requested ? <Check size={16} strokeWidth={2.5} /> : <PawPrint size={16} strokeWidth={2} />}
            </span>
            <span>{requested ? 'درخواست ارسال شد' : `درخواست همبازی برای ${myPet.name}`}</span>
          </button>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد! (نمایشی)</div>
      )}
    </div>
  );
}

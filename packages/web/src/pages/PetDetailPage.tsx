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
import { PetAvatar } from '../components/PetAvatar';
import { getPetById, formatAge, formatDistance, MY_PET } from '../data/mock';
import { PET_TYPE_LABELS } from '../types';

export function PetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const pet = getPetById(Number(id));
  const [requested, setRequested] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const isMyPet = pet?.id === MY_PET.id;

  if (!pet) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <div className="empty-icon">
          <PawPrint size={40} strokeWidth={1.5} />
        </div>
        <h3>پت پیدا نشد</h3>
        <button className="cta-btn" style={{ marginTop: 16 }} onClick={() => navigate('/explore')}>
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
      <div className="detail-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="بازگشت">
          <ArrowRight size={20} strokeWidth={2} />
        </button>
        <h1>جزئیات</h1>
        <div className="detail-header-actions">
          <button className="icon-btn" onClick={() => setLiked(!liked)} aria-label="علاقه‌مندی">
            <Heart size={20} strokeWidth={2} fill={liked ? 'currentColor' : 'none'} className={liked ? 'icon-liked' : ''} />
          </button>
          <button className="icon-btn" aria-label="اشتراک">
            <Share2 size={20} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="detail-hero">
        <p className="brand">{pet.breed}</p>
        <p className="subtitle">{PET_TYPE_LABELS[pet.type]}</p>
        <div className="glow-circle">
          <PetAvatar type={pet.type} size="xl" />
        </div>
        <h2 className="title">{pet.name}</h2>
        <div className="price-pill">{formatDistance(pet.distanceKm)}</div>
      </div>

      <div className="detail-info">
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
            <span>{requested ? 'درخواست ارسال شد' : `درخواست همبازی برای ${MY_PET.name}`}</span>
          </button>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد! (نمایشی)</div>
      )}
    </div>
  );
}

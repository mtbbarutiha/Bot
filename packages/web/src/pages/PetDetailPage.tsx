import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getPetById, formatAge, formatDistance, MY_PET } from '../data/mock';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, PET_TYPE_LABELS } from '../types';

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
        <div className="icon">😿</div>
        <h3>پت پیدا نشد</h3>
        <button className="welcome-cta" style={{ marginTop: 16 }} onClick={() => navigate('/explore')}>
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
      <div className="detail-hero-img">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="بازگشت">→</button>
        <button className="heart-btn" onClick={() => setLiked(!liked)} aria-label="علاقه‌مندی">
          {liked ? '❤️' : '🤍'}
        </button>
        {pet.emoji}
      </div>

      <div className="detail-sheet">
        <h1>نام پت: {pet.name}</h1>
        <p className="distance-line">فاصله: {formatDistance(pet.distanceKm)} · {pet.neighborhood}</p>

        <div className="stat-boxes">
          <div className="stat-box purple">
            <div className="label">جنسیت</div>
            <div className="value">{PET_GENDER_LABELS[pet.gender]}</div>
          </div>
          <div className="stat-box yellow">
            <div className="label">سن</div>
            <div className="value">{formatAge(pet)}</div>
          </div>
          <div className="stat-box green">
            <div className="label">نژاد</div>
            <div className="value">{pet.breed}</div>
          </div>
        </div>

        <div className="about-section">
          <h3>درباره {pet.name}</h3>
          <p>
            {pet.bio || `${pet.name} یک ${PET_TYPE_LABELS[pet.type]} ${PET_SIZE_LABELS[pet.size]} است که دنبال همبازی می‌گردد.`}
            {' '}صاحب: {pet.ownerName}.
            {pet.vaccinated && ' واکسینه شده است.'}
            {pet.neutered && ' عقیم شده است.'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
          {pet.traits.map((t) => (
            <span key={t} className="pet-tag">{t}</span>
          ))}
        </div>
      </div>

      {!isMyPet && (
        <div className="detail-action-bar">
          <button className="action-circle" aria-label="تماس">📞</button>
          <button className="action-circle" aria-label="پیام">💬</button>
          <button className="cta-main" onClick={handleRequest} disabled={requested}>
            <span className="paw">🐾</span>
            <span>{requested ? 'درخواست ارسال شد ✓' : `می‌خوام با ${pet.name} بازی کنم`}</span>
          </button>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد! (نمایشی)</div>
      )}
    </div>
  );
}

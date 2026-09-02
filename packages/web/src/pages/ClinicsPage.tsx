import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Star } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { MOCK_CLINICS } from '../data/services';

export function ClinicsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(MOCK_CLINICS[0]?.id ?? null);
  const selected = MOCK_CLINICS.find((c) => c.id === selectedId);

  return (
    <div className="service-page">
      <div className="page-title-block">
        <BrandMark className="greeting-brand" iconSize={22} />
        <h1>کلینیک‌های نزدیک</h1>
        <p>دامپزشکی و اورژانس در محدوده شما</p>
      </div>

      <div className="map-placeholder" aria-label="نقشه کلینیک‌ها">
        <div className="map-placeholder-grid">
          {MOCK_CLINICS.map((clinic) => (
            <button
              key={clinic.id}
              type="button"
              className={`map-pin${selectedId === clinic.id ? ' active' : ''}`}
              style={{
                left: `${20 + (clinic.lng - 51.3) * 200}%`,
                top: `${30 + (35.82 - clinic.lat) * 180}%`,
              }}
              onClick={() => setSelectedId(clinic.id)}
              aria-label={clinic.name}
            >
              <MapPin size={18} strokeWidth={2} />
            </button>
          ))}
        </div>
        <span className="map-placeholder-label">نقشه — فاز بعدی Leaflet</span>
      </div>

      <div className="clinic-list">
        {MOCK_CLINICS.map((clinic) => (
          <button
            key={clinic.id}
            type="button"
            className={`clinic-card${selectedId === clinic.id ? ' active' : ''}`}
            onClick={() => setSelectedId(clinic.id)}
          >
            <div className="clinic-card-header">
              <h3>{clinic.name}</h3>
              <span className="clinic-rating">
                <Star size={14} fill="currentColor" strokeWidth={0} />
                {clinic.rating}
              </span>
            </div>
            <p className="clinic-address">{clinic.address}</p>
            <div className="clinic-meta">
              <span>{clinic.openHours}</span>
              <span>{clinic.neighborhood}</span>
            </div>
            <div className="clinic-tags">
              {clinic.services.map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="service-action-bar">
          <a href={`tel:${selected.phone.replace(/[^0-9+]/g, '')}`} className="cta-btn cta-btn--inline">
            <Phone size={18} strokeWidth={2} />
            تماس با {selected.name}
          </a>
          <Link to="/vet-consult" className="link-btn">مشاوره آنلاین</Link>
        </div>
      )}
    </div>
  );
}

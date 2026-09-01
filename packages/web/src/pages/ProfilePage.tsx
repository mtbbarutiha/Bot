import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, MapPin, Send, Smartphone } from 'lucide-react';
import { PetAvatar } from '../components/PetAvatar';
import { CURRENT_OWNER, MY_PET, formatAge } from '../data/mock';

export function ProfilePage() {
  const [showToast, setShowToast] = useState(false);

  return (
    <>
      <div className="profile-hero">
        <PetAvatar type={MY_PET.type} size="lg" className="profile-avatar-wrap" />
        <div className="profile-name">{CURRENT_OWNER.name}</div>
        <div className="profile-city">
          <MapPin size={14} strokeWidth={2} />
          {CURRENT_OWNER.city}
        </div>
      </div>

      <div className="profile-section">
        <div className="section-row section-row--flush">
          <h2>پت‌های من</h2>
          <Link to="/add-pet">+ افزودن</Link>
        </div>

        <div className="my-pet-chip">
          <PetAvatar type={MY_PET.type} size="sm" />
          <div>
            <h3>{MY_PET.name}</h3>
            <p>{MY_PET.breed} · {formatAge(MY_PET)} · {MY_PET.neighborhood}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">نام صاحب</label>
          <input className="form-input" defaultValue={CURRENT_OWNER.name} />
        </div>

        <div className="form-group">
          <label className="form-label">شهر</label>
          <input className="form-input" defaultValue={CURRENT_OWNER.city} />
        </div>

        <button
          className="cta-btn cta-btn--spaced"
          onClick={() => { setShowToast(true); setTimeout(() => setShowToast(false), 2500); }}
        >
          ذخیره تغییرات
        </button>

        <div className="menu-item">
          <div className="menu-icon"><Send size={18} strokeWidth={2} /></div>
          <div className="menu-text">
            <strong>ربات تلگرام</strong>
            <small>petdate — فاز بعدی</small>
          </div>
        </div>
        <div className="menu-item">
          <div className="menu-icon"><Globe size={18} strokeWidth={2} /></div>
          <div className="menu-text"><strong>وب</strong><small>فعال</small></div>
        </div>
        <div className="menu-item">
          <div className="menu-icon"><Smartphone size={18} strokeWidth={2} /></div>
          <div className="menu-text"><strong>PWA</strong><small>قابل نصب</small></div>
        </div>
      </div>

      {showToast && <div className="toast" role="status">ذخیره شد (نمایشی)</div>}
    </>
  );
}

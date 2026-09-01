import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, MapPin, Send, Shield, Smartphone } from 'lucide-react';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { usePetStore } from '../hooks/usePetStore';

export function ProfilePage() {
  const { myPet, owners } = usePetStore();
  const owner = owners.find((o) => o.id === myPet.ownerId) ?? owners[0];
  const [showToast, setShowToast] = useState(false);

  return (
    <>
      <div className="profile-hero">
        <div className="profile-hero-photo">
          <img src={myPet.imageUrl} alt={myPet.name} />
        </div>
        <div className="profile-name">{owner.name}</div>
        <div className="profile-city">
          <MapPin size={14} strokeWidth={2} />
          {owner.city}
        </div>
      </div>

      <div className="profile-section">
        <div className="section-row section-row--flush">
          <h2>پت‌های من</h2>
          <Link to="/add-pet">+ افزودن</Link>
        </div>

        <div className="my-pet-chip">
          <PetAvatar type={myPet.type} size="sm" imageUrl={myPet.imageUrl} name={myPet.name} />
          <div>
            <h3>{myPet.name}</h3>
            <p>{myPet.breed} · {formatAge(myPet)} · {myPet.neighborhood}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">نام صاحب</label>
          <input className="form-input" defaultValue={owner.name} />
        </div>

        <div className="form-group">
          <label className="form-label">شهر</label>
          <input className="form-input" defaultValue={owner.city} />
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
        <Link to="/admin/login" className="menu-item">
          <div className="menu-icon"><Shield size={18} strokeWidth={2} /></div>
          <div className="menu-text">
            <strong>پنل ادمین</strong>
            <small>مدیریت پت‌ها و درخواست‌ها</small>
          </div>
        </Link>
      </div>

      {showToast && <div className="toast" role="status">ذخیره شد (نمایشی)</div>}
    </>
  );
}

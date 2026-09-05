import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Globe, MapPin, Send, Shield, Smartphone } from 'lucide-react';
import type { UserRole } from '@petdate/shared';
import {
  ONBOARDING_STATUS_LABELS,
  USER_ROLE_LABELS,
  normalizeRoles,
  primaryRole,
  userHasRole,
} from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';

const WIZARD_LINKS: Partial<Record<UserRole, string>> = {
  pet_owner: '/onboarding/pet',
  vet: '/onboarding/wizard/vet',
  no_pet: '/onboarding/wizard/no_pet',
  pet_seeker: '/onboarding/wizard/pet_seeker',
  community_seeker: '/onboarding/wizard/community_seeker',
  trainer: '/onboarding/wizard/trainer',
  pet_sitter: '/onboarding/wizard/pet_sitter',
};

export function ProfilePage() {
  const { myPet, owners } = usePetStore();
  const { user } = useUserStore();
  const owner = owners.find((o) => o.id === myPet.ownerId) ?? owners[0];
  const [showToast, setShowToast] = useState(false);

  const onboardingLabel =
    user.onboarding === 'none'
      ? 'شروع نشده'
      : ONBOARDING_STATUS_LABELS[user.onboarding as keyof typeof ONBOARDING_STATUS_LABELS] ?? user.onboarding;

  const roles = normalizeRoles(user.roles, user.role);
  const mainRole = primaryRole(roles, user.role);
  const wizardLink = mainRole ? WIZARD_LINKS[mainRole] : '/onboarding/role';
  const needsWizard = user.onboarding !== 'profile_complete';
  const isPetOwner = userHasRole(user, 'pet_owner');
  const roleLabel = roles.length
    ? roles.map((r) => USER_ROLE_LABELS[r]).join(' · ')
    : 'انتخاب نشده';

  return (
    <>
      <div className="profile-hero">
        <BrandMark className="profile-brand" iconSize={26} />
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
        <div className="profile-status-card">
          <div className="profile-status-row">
            <span className="profile-status-label">نقش</span>
            <span className="profile-status-value">{roleLabel}</span>
          </div>
          <div className="profile-status-row">
            <span className="profile-status-label">وضعیت پروفایل</span>
            <span className={`profile-status-badge${needsWizard ? ' incomplete' : ' complete'}`}>
              {onboardingLabel}
            </span>
          </div>
          {user.telegramId && (
            <div className="profile-status-row">
              <span className="profile-status-label">تلگرام</span>
              <span className="profile-status-value">متصل (@Petdatebot)</span>
            </div>
          )}
          {needsWizard && wizardLink && (
            <Link to={wizardLink} className="profile-wizard-link">
              تکمیل پروفایل
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
          )}
        </div>

        {isPetOwner && (
          <>
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
          </>
        )}

        <div className="profile-services">
          <h2>خدمات</h2>
          <div className="service-links">
            <Link to="/clinics" className="service-link-card">🩺 کلینیک‌های نزدیک</Link>
            <Link to="/shop" className="service-link-card">🛒 فروشگاه پت</Link>
            <Link to="/vet-consult" className="service-link-card">💬 مشاوره دامپزشک</Link>
            {isPetOwner && (
              <Link to="/explore" className="service-link-card">🐾 کشف همبازی</Link>
            )}
          </div>
        </div>

        <button
          className="cta-btn cta-btn--spaced"
          onClick={() => { setShowToast(true); setTimeout(() => setShowToast(false), 2500); }}
        >
          💾 ذخیره تغییرات
        </button>

        <div className="menu-item">
          <div className="menu-icon"><Send size={18} strokeWidth={2} /></div>
          <div className="menu-text">
            <strong>ربات تلگرام</strong>
            <small>@Petdatebot — هم‌تراز با وب</small>
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

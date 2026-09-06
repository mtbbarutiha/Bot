import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Globe, LogOut, MapPin, Send, Shield, Smartphone } from 'lucide-react';
import {
  ONBOARDING_STATUS_LABELS,
  USER_ROLE_LABELS,
  normalizeRoles,
  primaryRole,
  userHasRole,
} from '@petdate/shared';
import { PetAvatar } from '../components/PetAvatar';
import { formatAge } from '../data/mock';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';


export function ProfilePage() {
  const navigate = useNavigate();
  const { myPet } = usePetStore();
  const { user, logout, isProfileComplete } = useAuthStore();
  const [showToast, setShowToast] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return null;
  }

  const onboardingLabel =
    !user.onboarding
      ? 'شروع نشده'
      : ONBOARDING_STATUS_LABELS[user.onboarding] ?? user.onboarding;

  const roles = normalizeRoles(user.roles, user.role);
  const mainRole = primaryRole(roles, user.role);
  const wizardLink = isProfileComplete
    ? mainRole === 'pet_owner'
      ? '/onboarding/pet'
      : '/onboarding/profile'
    : '/onboarding/profile';
  const needsWizard = !isProfileComplete;
  const isPetOwner = userHasRole(user, 'pet_owner');
  const roleLabel = roles.length
    ? roles.map((r) => USER_ROLE_LABELS[r]).join(' · ')
    : 'انتخاب نشده';
  const locationLabel = [user.city, user.province, user.country].filter(Boolean).join('، ') || '—';

  async function onLogout() {
    setBusy(true);
    await logout();
    navigate('/auth/login', { replace: true });
  }

  return (
    <div className="pepito-profile">
      <div className="profile-hero pepito-profile-hero">
        <p className="pepito-home-brand profile-brand">Pet Date</p>
        <div className="profile-hero-photo">
          {user.avatarUrl || (isPetOwner && myPet.imageUrl) ? (
            <img src={user.avatarUrl || myPet.imageUrl} alt={user.name} />
          ) : (
            <div className="profile-hero-fallback">{user.name.slice(0, 1)}</div>
          )}
        </div>
        <div className="profile-name">{user.name}</div>
        <div className="profile-city">
          <MapPin size={14} strokeWidth={2} />
          {locationLabel}
        </div>
      </div>

      <div className="profile-section pepito-profile-body">
        <div className="profile-status-card pepito-profile-panel">
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
          {user.phone && (
            <div className="profile-status-row">
              <span className="profile-status-label">موبایل</span>
              <span className="profile-status-value" dir="ltr">{user.phone}</span>
            </div>
          )}
          {user.email && (
            <div className="profile-status-row">
              <span className="profile-status-label">ایمیل</span>
              <span className="profile-status-value" dir="ltr">{user.email}</span>
            </div>
          )}
          {user.telegramId && (
            <div className="profile-status-row">
              <span className="profile-status-label">تلگرام</span>
              <span className="profile-status-value">متصل (@Petdatebot)</span>
            </div>
          )}
          {(needsWizard || isPetOwner) && (
            <Link to={wizardLink} className="profile-wizard-link pepito-btn button-1">
              {needsWizard ? 'تکمیل پروفایل' : 'ویرایش / ثبت پت'}
              <ChevronLeft size={16} strokeWidth={2} />
            </Link>
          )}
        </div>

        {user.bio ? (
          <p className="profile-bio">{user.bio}</p>
        ) : null}

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
                <p>
                  {myPet.breed} · {formatAge(myPet)} · {myPet.neighborhood}
                </p>
              </div>
            </div>
          </>
        )}

        <div className="profile-services">
          <h2>خدمات</h2>
          <div className="service-links">
            <Link to="/clinics" className="service-link-card">
              کلینیک‌های نزدیک
            </Link>
            <Link to="/shop" className="service-link-card">
              فروشگاه پت
            </Link>
            <Link to="/vet-consult" className="service-link-card">
              مشاوره دامپزشک
            </Link>
            {isPetOwner && (
              <Link to="/explore" className="service-link-card">
                کشف همبازی
              </Link>
            )}
          </div>
        </div>

        <button
          className="cta-btn cta-btn--spaced"
          type="button"
          onClick={() => {
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2500);
            navigate('/onboarding/profile');
          }}
        >
          ویرایش پروفایل
        </button>

        <div className="menu-item">
          <div className="menu-icon">
            <Send size={18} strokeWidth={2} />
          </div>
          <div className="menu-text">
            <strong>ربات تلگرام</strong>
            <small>@Petdatebot — هم‌تراز با وب</small>
          </div>
        </div>

        <div className="menu-item">
          <div className="menu-icon">
            <Globe size={18} strokeWidth={2} />
          </div>
          <div className="menu-text">
            <strong>وب دسکتاپ</strong>
            <small>ورود با OTP</small>
          </div>
        </div>
        <div className="menu-item">
          <div className="menu-icon">
            <Smartphone size={18} strokeWidth={2} />
          </div>
          <div className="menu-text">
            <strong>PWA</strong>
            <small>قابل نصب</small>
          </div>
        </div>
        <Link to="/admin/login" className="menu-item">
          <div className="menu-icon">
            <Shield size={18} strokeWidth={2} />
          </div>
          <div className="menu-text">
            <strong>پنل ادمین</strong>
            <small>مدیریت پت‌ها و درخواست‌ها</small>
          </div>
        </Link>

        <button
          type="button"
          className="cta-btn cta-btn--spaced profile-logout-btn"
          onClick={() => void onLogout()}
          disabled={busy}
        >
          <LogOut size={18} /> {busy ? 'خروج…' : 'خروج از حساب'}
        </button>
      </div>

      {showToast && (
        <div className="toast" role="status">
          انتقال به ویرایش پروفایل
        </div>
      )}
    </div>
  );
}

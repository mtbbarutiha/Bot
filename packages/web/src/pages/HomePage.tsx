import { Link, Navigate } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { BRAND, dashboardPathForRole, primaryRole } from '@petdate/shared';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';

const HERO_IMG = '/pepito/uploads/3.jpg';

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function HomePage() {
  const { myPet } = usePetStore();
  const { user } = useUserStore();
  const { user: authUser, isProfileComplete } = useAuthStore();

  // نقش فعال (نه فقط «داشتن نقش») — هم‌تراز ربات و RoleSwitchControl
  const active =
    primaryRole(authUser?.roles, authUser?.role) ??
    primaryRole(user.roles, user.role);

  // دامپزشک فعال → داشبورد اختصاصی پزشک (نه پنل صاحب‌پت)
  if (active === 'vet') {
    return <Navigate to={dashboardPathForRole('vet')} replace />;
  }

  const isPetOwner = active === 'pet_owner';
  const displayName = authUser?.name?.trim() || 'دوست';
  const hasPetName = Boolean(myPet?.name && myPet.name !== 'پت من');
  const needsProfile = !isProfileComplete;

  const lead = needsProfile
    ? 'پروفایلت را کامل کن تا همبازی و خدمات نزدیک‌تر شوند.'
    : isPetOwner && hasPetName
      ? `همبازی برای ${myPet.name} — درخواست بفرست و مدیریت کن در همان فضای Pet Date.`
      : isPetOwner
        ? 'پت‌ات را ثبت کن و همبازی پیدا کن — همان حساب وب و تلگرام.'
        : 'از پروفایل، کلینیک، پت شاپ و مشاوره را در همین محیط ادامه بده.';

  const primaryTo = needsProfile
    ? '/onboarding/profile'
    : isPetOwner && !hasPetName
      ? '/add-pet'
      : isPetOwner
        ? '/explore'
        : '/profile';
  const primaryLabel = needsProfile
    ? 'تکمیل پروفایل'
    : isPetOwner && !hasPetName
      ? 'ثبت پت'
      : isPetOwner
        ? 'پیدا کردن همبازی'
        : 'پروفایل من';

  return (
    <div className="pepito-home">
      <section
        className="pepito-home-hero"
        style={{ backgroundImage: `url(${HERO_IMG})` }}
        aria-label="خوش‌آمد"
      >
        <div className="pepito-home-hero-wash" aria-hidden />
        <div className="pepito-home-hero-inner">
          <p className="pepito-kicker pepito-home-kicker">
            <span className="pepito-kicker-dot" aria-hidden>
              <PawPrint size={16} />
            </span>
            {BRAND.taglineFa}
          </p>
          <p className="pepito-home-brand">{BRAND.displayName}</p>
          <h1>سلام {displayName}</h1>
          <p className="pepito-home-lead">{lead}</p>
          <div className="pepito-home-cta">
            <Link to={primaryTo} className="pepito-btn button-1">
              <PawIcon />
              {primaryLabel}
            </Link>
            {isPetOwner && primaryTo !== '/explore' ? (
              <Link to="/explore" className="pepito-btn pepito-btn--ghost pepito-home-cta-ghost">
                همبازی
              </Link>
            ) : null}
            {primaryTo !== '/add-pet' && isPetOwner ? (
              <Link to="/add-pet" className="pepito-btn pepito-btn--ghost pepito-home-cta-ghost">
                پت‌های من
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="pepito-home-next" aria-label="قدم بعدی">
        <header className="pepito-home-section-head">
          <p className="pepito-eyebrow">همین حالا</p>
          <h2>قدم بعدی‌ات در Pet Date</h2>
          <p>همان زبان لندینگ — بدون پنل جدا.</p>
        </header>
        <div className="pepito-home-actions">
          {needsProfile ? (
            <Link to="/onboarding/profile" className="pepito-home-action">
              <strong>تکمیل پروفایل</strong>
              <span>نام، شهر و نقش را تمام کن</span>
            </Link>
          ) : null}
          {isPetOwner ? (
            <Link to="/add-pet" className="pepito-home-action">
              <strong>پت‌های من</strong>
              <span>ثبت یا ویرایش پت‌ها</span>
            </Link>
          ) : null}
          <Link to={isPetOwner ? '/explore' : '/profile'} className="pepito-home-action">
            <strong>{isPetOwner ? 'پیدا کردن همبازی' : 'پروفایل و خدمات'}</strong>
            <span>
              {isPetOwner
                ? 'ارسال و مدیریت درخواست‌های همبازی'
                : 'پت شاپ و مشاوره'}
            </span>
          </Link>
        </div>
      </section>

      {!isPetOwner ? (
        <section className="pepito-home-services" aria-label="خدمات">
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">خدمات</p>
            <h2>ادامه در همین فضا</h2>
            <p>پت شاپ و مشاوره — بدون ترک ظاهر لندینگ.</p>
          </header>
          <div className="pepito-home-actions">
            <Link to="/shop" className="pepito-home-action">
              <strong>پت شاپ</strong>
              <span>لوازم و محصولات پت</span>
            </Link>
            <Link to="/vet-consult" className="pepito-home-action">
              <strong>مشاوره دامپزشک</strong>
              <span>ارتباط سریع با پزشک</span>
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}

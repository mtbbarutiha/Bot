import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, PawPrint } from 'lucide-react';
import { BRAND, userHasRole } from '@petdate/shared';
import { PetGridCard } from '../components/PetGridCard';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';
import { listPets } from '../lib/api';
import { sendPlaymateRequestNow } from '../lib/playmateActions';
import type { Pet } from '../types';

const HERO_IMG = '/pepito/uploads/3.jpg';

function PawIcon({ size = 16 }: { size?: number }) {
  return (
    <span className="pepito-btn-icon" aria-hidden>
      <PawPrint size={size} />
    </span>
  );
}

export function HomePage() {
  const { myPet, getNearbyPets } = usePetStore();
  const { user } = useUserStore();
  const { user: authUser, isLoggedIn, isProfileComplete } = useAuthStore();
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [toastText, setToastText] = useState('درخواست همبازی ارسال شد');
  const [pendingCount, setPendingCount] = useState(0);

  const myUserId = authUser?.id;
  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');
  const nearby = isPetOwner ? getNearbyPets(myPet.id).slice(0, 6) : [];
  const displayName = authUser?.name?.trim() || 'دوست';
  const hasPetName = Boolean(myPet?.name && myPet.name !== 'پت من');
  const needsProfile = !isProfileComplete;

  const lead = needsProfile
    ? 'پروفایلت را کامل کن تا همبازی و خدمات نزدیک‌تر شوند.'
    : isPetOwner && hasPetName
      ? `همبازی برای ${myPet.name} — درخواست بفرست و مدیریت کن در همان فضای Pet Date.`
      : isPetOwner
        ? 'پت‌ات را ثبت کن و همبازی پیدا کن — همان حساب وب و تلگرام.'
        : 'از پروفایل، کلینیک، فروشگاه و مشاوره را در همین محیط ادامه بده.';

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

  const handleQuickAdd = async (pet: Pet) => {
    if (!isLoggedIn || !myUserId) {
      navigate('/auth/login');
      return;
    }
    try {
      const mine = await listPets({ ownerId: myUserId });
      if (mine.length === 0) {
        setToastText('اول یک پت ثبت کن');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
        return;
      }
      await sendPlaymateRequestNow({
        fromPetId: mine[0]!.id,
        toPetId: pet.id,
        fromUserId: myUserId,
      });
      setPendingCount((c) => c + 1);
      setToastText('درخواست همبازی ارسال شد');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (err) {
      setToastText(err instanceof Error ? err.message : 'ارسال ناموفق بود');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    }
  };

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
                ? pendingCount > 0
                  ? `درخواست‌های همبازی · ${pendingCount} جدید`
                  : 'ارسال و مدیریت درخواست‌های همبازی'
                : 'کلینیک، فروشگاه، مشاوره'}
            </span>
          </Link>
        </div>
      </section>

      {isPetOwner ? (
        <section className="pepito-home-nearby" aria-label="همبازی‌های نزدیک">
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">پیشنهادی</p>
            <h2>همبازی‌های نزدیک</h2>
            <p>
              <Link to="/explore" className="pepito-home-inline-link">
                پیدا کردن همبازی
              </Link>
            </p>
          </header>

          {nearby.length > 0 ? (
            <div className="pet-grid pepito-home-pet-grid">
              {nearby.map((pet, i) => (
                <PetGridCard key={pet.id} pet={pet} index={i} onQuickAdd={(p) => void handleQuickAdd(p)} />
              ))}
            </div>
          ) : (
            <div className="empty-state pepito-home-empty">
              <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
              <h3>هنوز پتی نزدیک نیست</h3>
              <p>از پیدا کردن همبازی شروع کن یا پت‌ات را ثبت کن.</p>
              <Link to="/explore" className="pepito-btn button-1">
                <PawIcon />
                پیدا کردن همبازی
              </Link>
            </div>
          )}
        </section>
      ) : (
        <section className="pepito-home-nearby pepito-home-nearby--role">
          <header className="pepito-home-section-head">
            <p className="pepito-eyebrow">خدمات</p>
            <h2>ادامه در همین فضا</h2>
            <p>کلینیک، فروشگاه و مشاوره — بدون ترک ظاهر لندینگ.</p>
          </header>
          <div className="pepito-home-actions">
            <Link to="/clinics" className="pepito-home-action">
              <strong>کلینیک‌ها</strong>
              <span>نزدیک‌ترین مراکز</span>
            </Link>
            <Link to="/shop" className="pepito-home-action">
              <strong>فروشگاه</strong>
              <span>لوازم و محصولات پت</span>
            </Link>
            <Link to="/vet-consult" className="pepito-home-action">
              <strong>مشاوره دامپزشک</strong>
              <span>ارتباط سریع با پزشک</span>
            </Link>
          </div>
        </section>
      )}

      {pendingCount > 0 && (
        <div className="pepito-home-toast-banner" role="status">
          <Mail size={16} strokeWidth={2} />
          <p>
            <strong>{pendingCount} درخواست</strong> ارسال شد
          </p>
          <Link to="/explore#requests">مشاهده</Link>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">
          {toastText}
        </div>
      )}
    </div>
  );
}

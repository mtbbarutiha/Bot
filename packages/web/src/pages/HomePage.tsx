import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, ChevronDown, Mail, MapPin, Search } from 'lucide-react';
import { userHasRole } from '@petdate/shared';
import { BrandMark } from '../components/BrandMark';
import { PetGridCard } from '../components/PetGridCard';
import { CategoryPetIcon } from '../components/PetAvatar';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { usePetStore } from '../hooks/usePetStore';
import { useUserStore } from '../hooks/useUserStore';
import type { PetType } from '../types';
import { PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird', 'rabbit'];

export function HomePage() {
  const { myPet, matches, getNearbyPets, sendPlaydateRequest } = usePetStore();
  const { user } = useUserStore();
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [showToast, setShowToast] = useState(false);

  const pendingCount = matches.filter((m) => m.status === 'pending').length;
  const firstPending = matches.find((m) => m.status === 'pending');
  const pets = activeCategory === ALL
    ? getNearbyPets(myPet.id)
    : getNearbyPets(myPet.id).filter((p) => p.type === activeCategory);

  const filtered = search
    ? pets.filter((p) =>
        p.name.includes(search) ||
        p.breed.includes(search) ||
        p.neighborhood.includes(search)
      )
    : pets;

  const handleQuickAdd = (pet: import('../types').Pet) => {
    sendPlaydateRequest({
      toPetId: pet.id,
      message: `سلام ${pet.name}! ${myPet.name} دنبال همبازیه 🐾`,
      location: pet.neighborhood,
    });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const isPetOwner = !user.role || userHasRole(user, 'pet_owner');

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="home-header-glow" aria-hidden />

        <div className="top-bar">
          <div className="location-picker">
            <div className="location-icon">
              <MapPin size={17} strokeWidth={2} />
            </div>
            <div className="location-text">
              <small>محله شما</small>
              <strong>
                {myPet.neighborhood}، {myPet.city}
                <ChevronDown size={14} strokeWidth={2} />
              </strong>
            </div>
          </div>
          <div className="top-actions">
            <Link to="/matches" className="icon-btn" aria-label="درخواست‌ها">
              <Mail size={18} strokeWidth={2} />
              {pendingCount > 0 && <span className="badge-dot" />}
            </Link>
            <button className="icon-btn" aria-label="اعلان‌ها">
              <Bell size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="greeting">
          <BrandMark className="greeting-brand" iconSize={24} />
          <h1>همبازی برای {myPet.name}</h1>
          <p>پت‌های نزدیک رو کشف کن و درخواست بده</p>
        </div>

        <div className="search-bar">
          <Search size={17} strokeWidth={2} className="search-icon" />
          <input
            type="search"
            placeholder="جستجوی نژاد، نام، محله..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="home-body">
        <div className="home-services">
          <Link to="/clinics" className="home-service-chip">🩺 کلینیک</Link>
          <Link to="/shop" className="home-service-chip">🛒 فروشگاه</Link>
          <Link to="/vet-consult" className="home-service-chip">💬 مشاوره</Link>
        </div>

        {isPetOwner ? (
          <>
        <div className="section-row">
          <div>
            <span className="section-label">فیلتر</span>
            <h2>دسته‌بندی</h2>
          </div>
          <Link to="/explore" className="link-arrow">مشاهده همه</Link>
        </div>

        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-item${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <div className="category-circle">
                <CategoryPetIcon type={cat} />
              </div>
              <span>{cat === ALL ? 'همه' : PET_TYPE_LABELS[cat]}</span>
            </button>
          ))}
        </div>

        <div className="section-row">
          <div>
            <span className="section-label">پیشنهادی</span>
            <h2>همبازی‌های نزدیک</h2>
          </div>
          <span className="count-badge">{filtered.length}</span>
        </div>

        {filtered.length > 0 ? (
          <div className="pet-grid">
            {filtered.map((pet, i) => (
              <PetGridCard key={pet.id} pet={pet} index={i} onQuickAdd={handleQuickAdd} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
            <h3>پتی پیدا نشد</h3>
            <p>فیلتر یا جستجو رو عوض کن</p>
          </div>
        )}
          </>
        ) : (
          <div className="empty-state empty-state--role">
            <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
            <h3>خوش اومدی به petdate!</h3>
            <p>از منوی پروفایل خدمات کلینیک، فروشگاه و مشاوره رو امتحان کن.</p>
            <Link to="/profile" className="cta-btn cta-btn--inline">پروفایل</Link>
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="promo-banner">
          {firstPending && (
            <img src={firstPending.fromPet.imageUrl} alt="" className="promo-banner-photo" />
          )}
          <div className="promo-banner-icon"><Mail size={16} strokeWidth={2} /></div>
          <p><strong>{pendingCount} درخواست جدید</strong> برای {myPet.name}</p>
          <Link to="/matches" className="promo-btn">مشاهده</Link>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد</div>
      )}
    </div>
  );
}

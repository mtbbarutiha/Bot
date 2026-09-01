import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PetGridCard } from '../components/PetGridCard';
import { MOCK_MATCHES, MY_PET, getNearbyPets } from '../data/mock';
import type { PetType } from '../types';
import { PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird'];

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');
  const [showToast, setShowToast] = useState(false);

  const pendingCount = MOCK_MATCHES.filter((m) => m.status === 'pending').length;
  const pets = activeCategory === ALL
    ? getNearbyPets(MY_PET.id)
    : getNearbyPets(MY_PET.id).filter((p) => p.type === activeCategory);

  const filtered = search
    ? pets.filter((p) =>
        p.name.includes(search) ||
        p.breed.includes(search) ||
        p.neighborhood.includes(search)
      )
    : pets;

  const handleQuickAdd = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <div className="home-page">
      <div className="home-header">
        <div className="top-bar">
          <div className="location-picker">
            <div className="location-icon">📍</div>
            <div className="location-text">
              <small>محله شما</small>
              <strong>{MY_PET.neighborhood}، {MY_PET.city} ▾</strong>
            </div>
          </div>
          <div className="top-actions">
            <Link to="/matches" className="icon-btn" aria-label="درخواست‌ها">
              💌
              {pendingCount > 0 && <span className="badge-dot" />}
            </Link>
            <button className="icon-btn" aria-label="اعلان‌ها">🔔</button>
          </div>
        </div>

        <div className="greeting">
          <h1>petdate · برای {MY_PET.name} 🐾</h1>
        </div>

        <div className="search-bar">
          <input
            type="search"
            placeholder="جستجوی نژاد، نام، محله..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>

      <div className="home-body">
        <div className="section-row">
          <h2>دسته‌بندی</h2>
          <Link to="/explore">مشاهده همه</Link>
        </div>

        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`category-item${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              <div className="category-circle">
                {cat === ALL ? '🐾' : PET_TYPE_EMOJI[cat]}
              </div>
              <span>{cat === ALL ? 'همه' : PET_TYPE_LABELS[cat]}</span>
            </button>
          ))}
        </div>

        <div className="section-row">
          <h2>همبازی‌های نزدیک</h2>
          <span className="muted">{filtered.length} پت</span>
        </div>

        {filtered.length > 0 ? (
          <div className="pet-grid">
            {filtered.map((pet, i) => (
              <PetGridCard key={pet.id} pet={pet} index={i} onQuickAdd={handleQuickAdd} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="icon">🔍</div>
            <h3>پتی پیدا نشد</h3>
            <p>فیلتر یا جستجو رو عوض کن</p>
          </div>
        )}
      </div>

      {pendingCount > 0 && (
        <div className="promo-banner">
          <p><strong>{pendingCount} درخواست همبازی</strong> جدید داری!</p>
          <Link to="/matches" className="promo-btn">ببین</Link>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">درخواست همبازی ارسال شد! (نمایشی)</div>
      )}
    </div>
  );
}

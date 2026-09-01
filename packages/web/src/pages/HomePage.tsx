import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PetCardLarge } from '../components/PetCardLarge';
import { CURRENT_OWNER, MOCK_MATCHES, MY_PET, getNearbyPets } from '../data/mock';
import type { PetType } from '../types';
import { PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird'];

export function HomePage() {
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');

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

  return (
    <>
      <div className="top-bar">
        <div className="greeting-block">
          <h1>سلام، {CURRENT_OWNER.name} 🐾</h1>
          <p>صبح بخیر — برای {MY_PET.name} همبازی پیدا کن</p>
        </div>
        <Link to="/matches" className="icon-btn" aria-label="اعلان‌ها">
          🔔
          {pendingCount > 0 && <span className="badge-dot" />}
        </Link>
      </div>

      <div className="search-row">
        <div className="search-bar">
          <input
            type="search"
            placeholder="جستجو بر اساس نژاد، سایز یا نام..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon">🔍</span>
        </div>
        <button className="filter-btn" aria-label="فیلتر">☰</button>
      </div>

      <div className="my-pet-chip">
        <div className="avatar">{MY_PET.emoji}</div>
        <div className="info">
          <h3>{MY_PET.name} — پت من</h3>
          <p>{MY_PET.breed} · {MY_PET.neighborhood}</p>
        </div>
        <Link to="/profile" style={{ marginRight: 'auto', fontSize: '0.8rem', fontWeight: 700, color: 'var(--orange)' }}>
          ویرایش
        </Link>
      </div>

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

      {pendingCount > 0 && (
        <div className="promo-banner">
          <p><strong>{pendingCount} درخواست همبازی</strong> جدید!</p>
          <Link to="/matches" className="promo-btn">ببین</Link>
        </div>
      )}

      <div className="section-row">
        <h2>همبازی‌های نزدیک</h2>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} پت</span>
      </div>

      {filtered.length > 0 ? (
        <div className="pet-list">
          {filtered.map((pet) => (
            <PetCardLarge key={pet.id} pet={pet} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">🔍</div>
          <h3>پتی پیدا نشد</h3>
          <p>فیلتر یا جستجو رو عوض کن</p>
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <Link
          to="/add-pet"
          className="welcome-cta"
          style={{ display: 'flex', textDecoration: 'none' }}
        >
          <span className="paw-icon">🐾</span>
          <span>ثبت پت جدید</span>
        </Link>
      </div>
    </>
  );
}

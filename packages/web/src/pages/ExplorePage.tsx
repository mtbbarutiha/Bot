import { useState } from 'react';
import { PetCardLarge } from '../components/PetCardLarge';
import { CURRENT_OWNER, MOCK_PETS, MY_PET } from '../data/mock';
import type { PetType } from '../types';
import { PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird', 'rabbit'];

export function ExplorePage() {
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');

  const filtered = MOCK_PETS
    .filter((p) => {
      if (p.id === MY_PET.id) return false;
      if (!p.lookingForPlaymate) return false;
      if (activeCategory !== ALL && p.type !== activeCategory) return false;
      if (search && !p.name.includes(search) && !p.breed.includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <>
      <div className="top-bar">
        <div className="greeting-block">
          <h1>جستجو 🔍</h1>
          <p>{filtered.length} پت نزدیک {CURRENT_OWNER.city}</p>
        </div>
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
        <button className="filter-btn">☰</button>
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

      {filtered.length > 0 ? (
        <div className="pet-list">
          {filtered.map((pet) => (
            <PetCardLarge key={pet.id} pet={pet} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="icon">😿</div>
          <h3>پتی پیدا نشد</h3>
          <p>دسته‌بندی دیگه‌ای امتحان کن</p>
        </div>
      )}
    </>
  );
}

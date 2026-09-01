import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { PetGridCard } from '../components/PetGridCard';
import { CategoryPetIcon } from '../components/PetAvatar';
import { EMPTY_STATE_PHOTO } from '../data/petImages';
import { usePetStore } from '../hooks/usePetStore';
import type { PetType } from '../types';
import { PET_TYPE_LABELS } from '../types';

const ALL = 'all' as const;
const CATEGORIES: (PetType | typeof ALL)[] = ['all', 'dog', 'cat', 'bird', 'rabbit'];

export function ExplorePage() {
  const { pets, myPet } = usePetStore();
  const [activeCategory, setActiveCategory] = useState<PetType | typeof ALL>(ALL);
  const [search, setSearch] = useState('');

  const filtered = pets
    .filter((p) => {
      if (p.id === myPet.id) return false;
      if (!p.lookingForPlaymate) return false;
      if (activeCategory !== ALL && p.type !== activeCategory) return false;
      if (search && !p.name.includes(search) && !p.breed.includes(search)) return false;
      return true;
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  return (
    <div className="home-page">
      <div className="home-header compact">
        <div className="greeting">
          <h1>جستجو</h1>
          <p>{filtered.length} پت نزدیک {myPet.city}</p>
        </div>
        <div className="search-row-inline">
          <div className="search-bar">
            <input
              type="search"
              placeholder="جستجوی نژاد، نام..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="search-icon">
              <Search size={18} strokeWidth={2} />
            </span>
          </div>
          <button className="filter-btn" aria-label="فیلتر">
            <SlidersHorizontal size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="home-body">
        <div className="categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
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

        {filtered.length > 0 ? (
          <div className="pet-grid">
            {filtered.map((pet, i) => (
              <PetGridCard key={pet.id} pet={pet} index={i} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <img src={EMPTY_STATE_PHOTO} alt="" className="empty-photo" />
            <h3>پتی پیدا نشد</h3>
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { usePetStore } from '../../hooks/usePetStore';
import { PET_TYPE_LABELS, type PetType } from '../../types';

export function AdminPetsPage() {
  const { pets, deletePet } = usePetStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<PetType | 'all'>('all');

  const filtered = useMemo(() => {
    return pets.filter((p) => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false;
      if (!search) return true;
      return (
        p.name.includes(search) ||
        p.breed.includes(search) ||
        p.neighborhood.includes(search) ||
        p.ownerName.includes(search)
      );
    });
  }, [pets, search, typeFilter]);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>مدیریت پت‌ها</h1>
          <p>{filtered.length} پت</p>
        </div>
        <Link to="/admin/pets/new" className="admin-btn admin-btn--primary">
          <Plus size={16} />
          افزودن پت
        </Link>
      </header>

      <div className="admin-toolbar">
        <div className="admin-search">
          <Search size={16} />
          <input
            placeholder="جستجو نام، نژاد، محله..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-select admin-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as PetType | 'all')}
        >
          <option value="all">همه انواع</option>
          {(Object.keys(PET_TYPE_LABELS) as PetType[]).map((t) => (
            <option key={t} value={t}>{PET_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      <div className="admin-grid">
        {filtered.map((pet) => (
          <article key={pet.id} className="admin-pet-card">
            <img src={pet.imageUrl} alt={pet.name} className="admin-pet-card-img" />
            <div className="admin-pet-card-body">
              <div className="admin-pet-card-top">
                <h3>{pet.name}</h3>
                <span className="admin-badge">{PET_TYPE_LABELS[pet.type]}</span>
              </div>
              <p>{pet.breed} · {pet.neighborhood}</p>
              <p className="muted">{pet.ownerName}</p>
              <div className="admin-pet-card-actions">
                <Link to={`/admin/pets/${pet.id}/edit`} className="admin-btn admin-btn--ghost">
                  ✏️ ویرایش
                </Link>
                <button
                  type="button"
                  className="admin-btn admin-btn--danger"
                  onClick={() => {
                    if (confirm(`🗑 حذف ${pet.name}؟`)) deletePet(pet.id);
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

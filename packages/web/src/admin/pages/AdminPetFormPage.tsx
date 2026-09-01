import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePetStore } from '../../hooks/usePetStore';
import { DEFAULT_IMAGES, DOG_PHOTOS, CAT_PHOTOS, imageForType, petImg } from '../../data/petImages';
import type { PetGender, PetSize, PetType } from '../../types';
import { PET_SIZE_LABELS, PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../../types';

const TYPES = Object.keys(PET_TYPE_LABELS) as PetType[];
const SIZES = Object.keys(PET_SIZE_LABELS) as PetSize[];

const GALLERY: Partial<Record<PetType, readonly string[]>> = {
  dog: DOG_PHOTOS,
  cat: CAT_PHOTOS,
};

export function AdminPetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pets, addPet, updatePet, getPetById } = usePetStore();
  const isEdit = Boolean(id);
  const existing = isEdit ? getPetById(Number(id)) : undefined;

  const [form, setForm] = useState(() => existing ?? {
    name: '',
    type: 'dog' as PetType,
    breed: '',
    age: 1,
    ageUnit: 'year' as 'month' | 'year',
    size: 'medium' as PetSize,
    gender: 'male' as PetGender,
    city: 'تهران',
    neighborhood: '',
    ownerName: '',
    ownerId: Math.max(0, ...pets.map((p) => p.ownerId)) + 1,
    imageUrl: DEFAULT_IMAGES.dog,
    emoji: '🐕',
    bio: '',
    traits: ['بازیگوش'],
    vaccinated: true,
    neutered: false,
    lookingForPlaymate: true,
    distanceKm: 1,
  });

  const gallery = useMemo(() => GALLERY[form.type] ?? [], [form.type]);

  const update = (field: string, value: string | number | boolean | string[]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && typeof value === 'string') {
        const t = value as PetType;
        next.imageUrl = imageForType(t, 0);
        next.emoji = PET_TYPE_EMOJI[t];
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEdit && existing) {
      updatePet(existing.id, form);
    } else {
      addPet(form);
    }
    navigate('/admin/pets');
  };

  if (isEdit && !existing) {
    return (
      <div className="admin-page">
        <p>پت پیدا نشد</p>
        <button className="admin-btn" onClick={() => navigate('/admin/pets')}>بازگشت</button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate(-1)}>
          <ArrowRight size={16} />
          بازگشت
        </button>
        <div>
          <h1>{isEdit ? `ویرایش ${existing?.name}` : 'پت جدید'}</h1>
          <p>اطلاعات و عکس پت</p>
        </div>
      </header>

      <form className="admin-form" onSubmit={handleSubmit}>
        <div className="admin-form-preview">
          <img src={form.imageUrl} alt={form.name || 'پت'} />
          <p>پیش‌نمایش عکس</p>
        </div>

        {gallery.length > 0 && (
          <div className="admin-gallery">
            <label className="form-label">انتخاب عکس {PET_TYPE_LABELS[form.type]}</label>
            <div className="admin-gallery-grid">
              {gallery.map((photoId) => (
                <button
                  key={photoId}
                  type="button"
                  className={`admin-gallery-item${form.imageUrl === petImg(photoId) ? ' active' : ''}`}
                  onClick={() => update('imageUrl', petImg(photoId))}
                >
                  <img src={petImg(photoId, 120, 120)} alt="" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="admin-form-grid">
          <div className="form-group">
            <label className="form-label">نام *</label>
            <input className="form-input" required value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">نوع</label>
            <select className="form-select" value={form.type} onChange={(e) => update('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{PET_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">نژاد *</label>
            <input className="form-input" required value={form.breed} onChange={(e) => update('breed', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">صاحب *</label>
            <input className="form-input" required value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">محله *</label>
            <input className="form-input" required value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">فاصله (km)</label>
            <input type="number" step="0.1" className="form-input" value={form.distanceKm} onChange={(e) => update('distanceKm', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">سن</label>
            <input type="number" min={1} className="form-input" value={form.age} onChange={(e) => update('age', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">سایز</label>
            <select className="form-select" value={form.size} onChange={(e) => update('size', e.target.value)}>
              {SIZES.map((s) => <option key={s} value={s}>{PET_SIZE_LABELS[s]}</option>)}
            </select>
          </div>
          <div className="form-group admin-form-full">
            <label className="form-label">درباره</label>
            <textarea className="form-textarea" value={form.bio} onChange={(e) => update('bio', e.target.value)} />
          </div>
          <div className="form-group admin-form-full">
            <label className="form-label">لینک عکس (دلخواه)</label>
            <input className="form-input" value={form.imageUrl} onChange={(e) => update('imageUrl', e.target.value)} />
          </div>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="cta-btn">{isEdit ? 'ذخیره تغییرات' : 'ثبت پت'}</button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => navigate('/admin/pets')}>انصراف</button>
        </div>
      </form>
    </div>
  );
}

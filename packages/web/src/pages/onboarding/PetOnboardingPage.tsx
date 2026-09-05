import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_IMAGES, DOG_PHOTOS, CAT_PHOTOS, imageForType, petLocal } from '../../data/petImages';
import { usePetStore } from '../../hooks/usePetStore';
import { useUserStore } from '../../hooks/useUserStore';
import type { PetGender, PetSize, PetType } from '../../types';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../../types';

const PET_TYPES = Object.keys(PET_TYPE_LABELS) as PetType[];
const PET_SIZES = Object.keys(PET_SIZE_LABELS) as PetSize[];
const PET_GENDERS = Object.keys(PET_GENDER_LABELS) as PetGender[];
const PERSONALITY_TRAITS = ['بازیگوش', 'آرام', 'اجتماعی', 'پرانرژی', 'مهربان', 'آموزش‌دیده', 'محافظ', 'خجالتی'];
const GALLERY: Partial<Record<PetType, readonly string[]>> = { dog: DOG_PHOTOS, cat: CAT_PHOTOS };

export function PetOnboardingPage() {
  const navigate = useNavigate();
  const { addPet, updatePet, myPet } = usePetStore();
  const { saveOnboardingToApi } = useUserStore();
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({
    name: myPet.name === 'رکس' ? '' : myPet.name,
    type: 'dog' as PetType,
    breed: '',
    age: '1',
    ageUnit: 'year' as 'month' | 'year',
    size: 'medium' as PetSize,
    gender: 'male' as PetGender,
    city: myPet.city,
    neighborhood: myPet.neighborhood === 'ونک' ? '' : myPet.neighborhood,
    bio: '',
    imageUrl: DEFAULT_IMAGES.dog,
    vaccinated: true,
    neutered: false,
    lookingForPlaymate: true,
    traits: ['بازیگوش'] as string[],
    healthNotes: '',
  });

  const gallery = GALLERY[form.type] ?? [];

  const update = (field: string, value: string | boolean | string[]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'type' && typeof value === 'string') {
        next.imageUrl = imageForType(value as PetType, 0);
      }
      return next;
    });
  };

  const toggleTrait = (trait: string) => {
    setForm((prev) => ({
      ...prev,
      traits: prev.traits.includes(trait)
        ? prev.traits.filter((t) => t !== trait)
        : [...prev.traits, trait],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const petData = {
      name: form.name,
      type: form.type,
      breed: form.breed,
      age: Number(form.age) || 1,
      ageUnit: form.ageUnit,
      size: form.size,
      gender: form.gender,
      city: form.city,
      neighborhood: form.neighborhood,
      ownerName: myPet.ownerName,
      ownerId: myPet.ownerId,
      imageUrl: form.imageUrl,
      emoji: PET_TYPE_EMOJI[form.type],
      bio: form.bio,
      traits: form.traits,
      vaccinated: form.vaccinated,
      neutered: form.neutered,
      lookingForPlaymate: form.lookingForPlaymate,
      healthNotes: form.healthNotes,
      distanceKm: 0,
    };

    if (myPet.name === 'رکس' && myPet.id === 101) {
      updatePet(myPet.id, petData);
    } else {
      addPet(petData);
    }

    await saveOnboardingToApi('profile_complete');
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate('/home', { replace: true });
    }, 1500);
  };

  const isValid = form.name && form.breed && form.neighborhood;

  return (
    <div className="form-page onboarding-pet-page">
      <button
        type="button"
        className="icon-btn icon-btn--spaced"
        onClick={() => navigate(-1)}
        aria-label="بازگشت"
      >
        <ArrowRight size={20} strokeWidth={2} />
      </button>

      <h1>پروفایل پت‌ات</h1>
      <p className="subtitle">برای پیدا کردن همبازی، اطلاعات پت رو کامل کن</p>

      <div className="add-pet-preview">
        <img src={form.imageUrl} alt={form.name || 'پت'} />
      </div>

      {gallery.length > 0 && (
        <div className="add-pet-gallery">
          <label className="form-label">انتخاب عکس</label>
          <div className="pet-gallery-grid">
            {gallery.slice(0, 6).map((photoId) => (
              <button
                key={photoId}
                type="button"
                className={`pet-gallery-item${form.imageUrl === petLocal(photoId) ? ' active' : ''}`}
                onClick={() => update('imageUrl', petLocal(photoId))}
              >
                <img src={petLocal(photoId)} alt="" />
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">نام پت *</label>
          <input className="form-input" placeholder="مثلاً: رکس" value={form.name} onChange={(e) => update('name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">نوع حیوان</label>
          <select className="form-select" value={form.type} onChange={(e) => update('type', e.target.value)}>
            {PET_TYPES.map((t) => (
              <option key={t} value={t}>{PET_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">نژاد *</label>
          <input className="form-input" placeholder="مثلاً: گلدن رتریور" value={form.breed} onChange={(e) => update('breed', e.target.value)} />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">سن</label>
            <input type="number" min="1" className="form-input" value={form.age} onChange={(e) => update('age', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">واحد</label>
            <select className="form-select" value={form.ageUnit} onChange={(e) => update('ageUnit', e.target.value)}>
              <option value="year">سال</option>
              <option value="month">ماه</option>
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">سایز</label>
            <select className="form-select" value={form.size} onChange={(e) => update('size', e.target.value)}>
              {PET_SIZES.map((s) => (
                <option key={s} value={s}>{PET_SIZE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">جنسیت</label>
            <select className="form-select" value={form.gender} onChange={(e) => update('gender', e.target.value)}>
              {PET_GENDERS.map((g) => (
                <option key={g} value={g}>{PET_GENDER_LABELS[g]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">محله *</label>
          <input className="form-input" placeholder="مثلاً: ونک" value={form.neighborhood} onChange={(e) => update('neighborhood', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">شخصیت و ویژگی‌ها</label>
          <div className="trait-chips">
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                type="button"
                className={`trait-chip${form.traits.includes(trait) ? ' active' : ''}`}
                onClick={() => toggleTrait(trait)}
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">سلامت و یادداشت پزشکی</label>
          <textarea
            className="form-textarea"
            placeholder="آلرژی، دارو، بیماری خاص..."
            value={form.healthNotes}
            onChange={(e) => update('healthNotes', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">درباره پت</label>
          <textarea className="form-textarea" placeholder="شخصیت، علاقه‌ها..." value={form.bio} onChange={(e) => update('bio', e.target.value)} />
        </div>

        <div className="form-check-group">
          <label className="form-check">
            <input type="checkbox" checked={form.vaccinated} onChange={(e) => update('vaccinated', e.target.checked)} />
            <span>واکسینه شده</span>
          </label>
          <label className="form-check">
            <input type="checkbox" checked={form.neutered} onChange={(e) => update('neutered', e.target.checked)} />
            <span>عقیم‌شده</span>
          </label>
          <label className="form-check">
            <input type="checkbox" checked={form.lookingForPlaymate} onChange={(e) => update('lookingForPlaymate', e.target.checked)} />
            <span>دنبال همبازی هستم</span>
          </label>
        </div>

        <button type="submit" className="cta-btn" disabled={!isValid}>
          ✨ تکمیل پروفایل
        </button>
      </form>

      {showToast && <div className="toast" role="status">پروفایل تکمیل شد!</div>}
    </div>
  );
}

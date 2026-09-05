import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PetPhotoUpload } from '../components/PetPhotoUpload';
import { DEFAULT_IMAGES, imageForType } from '../data/petImages';
import { useAuthStore } from '../hooks/useAuthStore';
import { usePetStore } from '../hooks/usePetStore';
import { createPet } from '../lib/api';
import type { PetGender, PetSize, PetType } from '../types';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, PET_TYPE_EMOJI, PET_TYPE_LABELS } from '../types';

const PET_TYPES = Object.keys(PET_TYPE_LABELS) as PetType[];
const PET_SIZES = Object.keys(PET_SIZE_LABELS) as PetSize[];
const PET_GENDERS = Object.keys(PET_GENDER_LABELS) as PetGender[];

const PERSONALITY_TRAITS = ['بازیگوش', 'آرام', 'اجتماعی', 'پرانرژی', 'مهربان', 'آموزش‌دیده'];

export function AddPetPage() {
  const navigate = useNavigate();
  const { addPet, myPet } = usePetStore();
  const { user: authUser, isLoggedIn } = useAuthStore();
  const [showToast, setShowToast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: 'dog' as PetType,
    breed: '',
    age: '1',
    ageUnit: 'year' as 'month' | 'year',
    size: 'medium' as PetSize,
    gender: 'male' as PetGender,
    city: myPet.city || authUser?.city || '',
    neighborhood: '',
    bio: '',
    imageUrl: '',
    vaccinated: true,
    neutered: false,
    lookingForPlaymate: true,
    healthNotes: '',
    traits: ['بازیگوش'] as string[],
  });

  const ownerId = authUser?.id;
  const previewFallback = useMemo(
    () => imageForType(form.type, 0) || DEFAULT_IMAGES.dog,
    [form.type]
  );

  const update = (field: string, value: string | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.imageUrl) {
      setSubmitError('لطفاً یک عکس واقعی از پت آپلود کن');
      return;
    }
    setSaving(true);
    setSubmitError('');

    const ageNum = Number(form.age) || 1;
    const ageMonths = form.ageUnit === 'year' ? ageNum * 12 : ageNum;

    try {
      if (isLoggedIn && ownerId) {
        await createPet({
          ownerId,
          name: form.name.trim(),
          species: form.type,
          breed: form.breed.trim(),
          gender: form.gender,
          ageMonths,
          size: form.size,
          bio: form.bio.trim() || undefined,
          vaccinated: form.vaccinated,
          neutered: form.neutered,
          lookingForPlaymate: form.lookingForPlaymate,
          diseases: form.healthNotes.trim() || undefined,
          personality: form.traits.length ? { traits: form.traits } : undefined,
          imageUrl: form.imageUrl,
          city: form.city.trim() || authUser?.city,
          neighborhood: form.neighborhood.trim(),
        });
      }

      addPet({
        name: form.name,
        type: form.type,
        breed: form.breed,
        age: ageNum,
        ageUnit: form.ageUnit,
        size: form.size,
        gender: form.gender,
        city: form.city,
        neighborhood: form.neighborhood,
        ownerName: authUser?.name || myPet.ownerName,
        ownerId: ownerId ?? myPet.ownerId,
        imageUrl: form.imageUrl,
        emoji: PET_TYPE_EMOJI[form.type],
        bio: form.bio,
        traits: form.traits,
        vaccinated: form.vaccinated,
        neutered: form.neutered,
        lookingForPlaymate: form.lookingForPlaymate,
        healthNotes: form.healthNotes,
        distanceKm: 0.5,
      });
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/profile');
      }, 2000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'ثبت پت ناموفق بود');
    } finally {
      setSaving(false);
    }
  };

  const isValid = Boolean(form.name && form.breed && form.neighborhood && form.imageUrl);

  return (
    <div className="form-page">
      <button
        onClick={() => navigate(-1)}
        className="icon-btn icon-btn--spaced"
        aria-label="بازگشت"
      >
        <ArrowRight size={20} strokeWidth={2} />
      </button>

      <h1>ثبت پت جدید</h1>
      <p className="subtitle">عکس واقعی و اطلاعات پت‌ات رو وارد کن</p>

      <PetPhotoUpload
        ownerId={ownerId}
        imageUrl={form.imageUrl}
        placeholderSrc={previewFallback}
        onChange={(url) => update('imageUrl', url)}
        label="عکس پت *"
      />

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="form-group">
          <label className="form-label">نام پت *</label>
          <input
            className="form-input"
            placeholder="مثلاً: رکس"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
          />
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
          <input
            className="form-input"
            placeholder="مثلاً: گلدن رتریور"
            value={form.breed}
            onChange={(e) => update('breed', e.target.value)}
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">سن</label>
            <input
              type="number"
              min="1"
              className="form-input"
              value={form.age}
              onChange={(e) => update('age', e.target.value)}
            />
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

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label">شهر</label>
            <input className="form-input" value={form.city} onChange={(e) => update('city', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">محله *</label>
            <input
              className="form-input"
              placeholder="مثلاً: ونک"
              value={form.neighborhood}
              onChange={(e) => update('neighborhood', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">درباره پت</label>
          <textarea
            className="form-textarea"
            placeholder="شخصیت، علاقه‌ها..."
            value={form.bio}
            onChange={(e) => update('bio', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">شخصیت</label>
          <div className="trait-chips">
            {PERSONALITY_TRAITS.map((trait) => (
              <button
                key={trait}
                type="button"
                className={`trait-chip${form.traits.includes(trait) ? ' active' : ''}`}
                onClick={() =>
                  update(
                    'traits',
                    form.traits.includes(trait)
                      ? form.traits.filter((t) => t !== trait)
                      : [...form.traits, trait]
                  )
                }
              >
                {trait}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">سلامت</label>
          <textarea
            className="form-textarea"
            placeholder="آلرژی، دارو..."
            value={form.healthNotes}
            onChange={(e) => update('healthNotes', e.target.value)}
          />
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
            <span>دنبال همبازی</span>
          </label>
        </div>

        {submitError && (
          <p className="pet-photo-error" role="alert">
            {submitError}
          </p>
        )}

        <button type="submit" className="cta-btn" disabled={!isValid || saving}>
          {saving ? 'در حال ذخیره…' : '➕ ثبت پت'}
        </button>
      </form>

      {showToast && (
        <div className="toast" role="status">پت ثبت شد!</div>
      )}
    </div>
  );
}

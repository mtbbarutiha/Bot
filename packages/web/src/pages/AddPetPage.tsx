import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PetGender, PetSize, PetType } from '../types';
import { PET_GENDER_LABELS, PET_SIZE_LABELS, PET_TYPE_LABELS } from '../types';

const PET_TYPES = Object.keys(PET_TYPE_LABELS) as PetType[];
const PET_SIZES = Object.keys(PET_SIZE_LABELS) as PetSize[];
const PET_GENDERS = Object.keys(PET_GENDER_LABELS) as PetGender[];

export function AddPetPage() {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'dog' as PetType,
    breed: '',
    age: '',
    ageUnit: 'year' as 'month' | 'year',
    size: 'medium' as PetSize,
    gender: 'male' as PetGender,
    city: 'تهران',
    neighborhood: '',
    bio: '',
    vaccinated: true,
    neutered: false,
  });

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate('/profile');
    }, 2000);
  };

  const isValid = form.name && form.breed && form.neighborhood;

  return (
    <div className="form-page">
      <button
        onClick={() => navigate(-1)}
        className="icon-btn"
        style={{ marginBottom: 16 }}
        aria-label="بازگشت"
      >
        →
      </button>

      <h1>ثبت پت جدید</h1>
      <p className="subtitle">مثل ربات تلگرام — اطلاعات پت‌ات رو وارد کن</p>

      <form onSubmit={handleSubmit}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

        <div style={{ background: 'var(--blue-50)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <input type="checkbox" checked={form.vaccinated} onChange={(e) => update('vaccinated', e.target.checked)} />
            <span>واکسینه شده 💉</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={form.neutered} onChange={(e) => update('neutered', e.target.checked)} />
            <span>عقیم‌شده ✂️</span>
          </label>
        </div>

        <button type="submit" className="cta-btn" disabled={!isValid}>
          ثبت پت
        </button>
      </form>

      {showToast && (
        <div className="toast" role="status">پت ثبت شد! (نمایشی)</div>
      )}
    </div>
  );
}

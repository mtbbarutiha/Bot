import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CURRENT_USER, MOCK_SECTIONS } from '../data/mock';
import type { GameType } from '../types';
import { GAME_TYPE_LABELS } from '../types';

const GAME_TYPES = Object.keys(GAME_TYPE_LABELS) as GameType[];

export function CreateGamePage() {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [form, setForm] = useState({
    title: '',
    gameType: 'football' as GameType,
    sectionId: String(CURRENT_USER.sectionId),
    location: '',
    date: '',
    time: '18:00',
    maxPlayers: '10',
    description: '',
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate('/');
    }, 2000);
  };

  const isValid = form.title && form.location && form.date;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">ساخت بازی جدید</h1>
        <p className="page-subtitle">بازی جدید برای سکشن‌ت بساز و بازیکن پیدا کن</p>
      </header>

      <form onSubmit={handleSubmit} className="stack-lg">
        <div className="form-group">
          <label className="form-label" htmlFor="title">عنوان بازی *</label>
          <input
            id="title"
            className="form-input"
            placeholder="مثلاً: فوتبال پنجشنبه شب"
            value={form.title}
            onChange={(e) => update('title', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="gameType">نوع بازی</label>
          <select
            id="gameType"
            className="form-select"
            value={form.gameType}
            onChange={(e) => update('gameType', e.target.value)}
          >
            {GAME_TYPES.map((type) => (
              <option key={type} value={type}>
                {GAME_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sectionId">سکشن</label>
          <select
            id="sectionId"
            className="form-select"
            value={form.sectionId}
            onChange={(e) => update('sectionId', e.target.value)}
          >
            {MOCK_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="location">مکان *</label>
          <input
            id="location"
            className="form-input"
            placeholder="آدرس یا نام زمین/سالن"
            value={form.location}
            onChange={(e) => update('location', e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="date">تاریخ *</label>
            <input
              id="date"
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => update('date', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="time">ساعت</label>
            <input
              id="time"
              type="time"
              className="form-input"
              value={form.time}
              onChange={(e) => update('time', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="maxPlayers">حداکثر بازیکن</label>
          <input
            id="maxPlayers"
            type="number"
            min="2"
            max="50"
            className="form-input"
            value={form.maxPlayers}
            onChange={(e) => update('maxPlayers', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">توضیحات</label>
          <textarea
            id="description"
            className="form-textarea"
            placeholder="قوانین، سطح بازی، تجهیزات لازم..."
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={!isValid}>
          ساخت بازی
        </button>
      </form>

      {showToast && (
        <div className="toast" role="status">
          بازی ساخته شد! (نمایشی — فاز ۲ به API وصل می‌شود)
        </div>
      )}
    </div>
  );
}

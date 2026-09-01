import { useState } from 'react';
import { SectionCard } from '../components/SectionCard';
import { MOCK_SECTIONS, getGamesForSection } from '../data/mock';

export function SectionsPage() {
  const [cityFilter, setCityFilter] = useState<string>('all');
  const cities = ['all', ...new Set(MOCK_SECTIONS.map((s) => s.city).filter((c): c is string => Boolean(c)))];

  const filtered = cityFilter === 'all'
    ? MOCK_SECTIONS
    : MOCK_SECTIONS.filter((s) => s.city === cityFilter);

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">سکشن‌ها</h1>
        <p className="page-subtitle">سکشن خودت را پیدا کن یا به یکی بپیوند</p>
      </header>

      <div className="chip-group" style={{ marginBottom: 20 }}>
        {cities.map((city) => (
          <button
            key={city}
            className={`chip${cityFilter === city ? ' active' : ''}`}
            onClick={() => setCityFilter(city)}
          >
            {city === 'all' ? 'همه شهرها' : city}
          </button>
        ))}
      </div>

      <div className="stack">
        {filtered.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            gameCount={getGamesForSection(section.id).length}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-title">سکشنی پیدا نشد</p>
          <p>فیلتر دیگری امتحان کن</p>
        </div>
      )}
    </div>
  );
}

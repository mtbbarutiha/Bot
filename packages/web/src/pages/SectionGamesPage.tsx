import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { GameCard } from '../components/GameCard';
import { getGamesForSection, getSectionById } from '../data/mock';
import type { GameType } from '../types';
import { GAME_TYPE_LABELS } from '../types';

const ALL_TYPES = 'all' as const;

export function SectionGamesPage() {
  const { id } = useParams<{ id: string }>();
  const sectionId = Number(id);
  const section = getSectionById(sectionId);
  const [typeFilter, setTypeFilter] = useState<GameType | typeof ALL_TYPES>(ALL_TYPES);

  if (!section) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <p className="empty-state-title">سکشن پیدا نشد</p>
          <Link to="/sections" className="btn btn-primary" style={{ marginTop: 16 }}>
            بازگشت به سکشن‌ها
          </Link>
        </div>
      </div>
    );
  }

  const allGames = getGamesForSection(sectionId);
  const games = typeFilter === ALL_TYPES
    ? allGames
    : allGames.filter((g) => g.gameType === typeFilter);

  const gameTypes = [...new Set(allGames.map((g) => g.gameType))];

  return (
    <div className="page">
      <Link to="/sections" className="back-link">← بازگشت</Link>

      <header className="page-header">
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{section.emoji}</div>
        <h1 className="page-title">{section.name}</h1>
        <p className="page-subtitle">
          {section.city} · {section.memberCount} عضو · {allGames.length} بازی باز
        </p>
        {section.description && (
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginTop: 8 }}>
            {section.description}
          </p>
        )}
      </header>

      {gameTypes.length > 1 && (
        <div className="chip-group" style={{ marginBottom: 20 }}>
          <button
            className={`chip${typeFilter === ALL_TYPES ? ' active' : ''}`}
            onClick={() => setTypeFilter(ALL_TYPES)}
          >
            همه
          </button>
          {gameTypes.map((type) => (
            <button
              key={type}
              className={`chip${typeFilter === type ? ' active' : ''}`}
              onClick={() => setTypeFilter(type)}
            >
              {GAME_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      )}

      {games.length > 0 ? (
        <div className="stack">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🎯</div>
          <p className="empty-state-title">بازی بازی برای این سکشن نیست</p>
          <p>اولین نفری باش که بازی می‌سازه!</p>
          <Link to="/create" className="btn btn-primary" style={{ marginTop: 16 }}>
            ساخت بازی
          </Link>
        </div>
      )}
    </div>
  );
}

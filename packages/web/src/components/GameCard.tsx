import { Link } from 'react-router-dom';
import type { Game } from '../types';
import { GAME_TYPE_EMOJI, GAME_TYPE_LABELS, GAME_STATUS_LABELS } from '../types';
import { formatPersianDate, spotsLeft } from '../data/mock';
import './GameCard.css';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const spots = spotsLeft(game);
  const fillPercent = (game.currentPlayers / game.maxPlayers) * 100;

  return (
    <Link to={`/games/${game.id}`} className="game-card card card-clickable">
      <div className="game-card-header">
        <span className="game-card-emoji" aria-hidden>
          {GAME_TYPE_EMOJI[game.gameType]}
        </span>
        <div className="game-card-titles">
          <h3 className="game-card-title">{game.title}</h3>
          <p className="game-card-section">{game.sectionName}</p>
        </div>
        <span className={`badge ${game.status === 'open' ? 'badge-open' : 'badge-full'}`}>
          {GAME_STATUS_LABELS[game.status]}
        </span>
      </div>

      <div className="game-card-meta">
        <span className="game-card-meta-item">📍 {game.location}</span>
        <span className="game-card-meta-item">🕐 {formatPersianDate(game.scheduledAt)}</span>
      </div>

      <div className="game-card-footer">
        <div className="game-card-players">
          <div className="game-card-players-text">
            <span className="badge badge-type">{GAME_TYPE_LABELS[game.gameType]}</span>
            <span className="game-card-spots">
              {game.status === 'open'
                ? `${spots} جای خالی`
                : 'ظرفیت تکمیل'}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${fillPercent}%` }} />
          </div>
          <span className="game-card-count">
            {game.currentPlayers}/{game.maxPlayers} نفر
          </span>
        </div>
      </div>
    </Link>
  );
}

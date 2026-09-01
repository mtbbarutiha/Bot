import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatPersianDate,
  getGameById,
  spotsLeft,
} from '../data/mock';
import {
  GAME_TYPE_EMOJI,
  GAME_TYPE_LABELS,
  GAME_STATUS_LABELS,
} from '../types';

export function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const game = getGameById(Number(id));
  const [joined, setJoined] = useState(false);
  const [showToast, setShowToast] = useState(false);

  if (!game) {
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <p className="empty-state-title">بازی پیدا نشد</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
            بازگشت به خانه
          </Link>
        </div>
      </div>
    );
  }

  const spots = spotsLeft(game);
  const canJoin = game.status === 'open' && spots > 0 && !joined;

  const handleJoin = () => {
    setJoined(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  return (
    <>
      <div className="page" style={{ paddingBottom: 100 }}>
        <Link to={`/sections/${game.sectionId}`} className="back-link">← بازگشت</Link>

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 8 }}>{GAME_TYPE_EMOJI[game.gameType]}</div>
          <h1 className="page-title">{game.title}</h1>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12 }}>
            <span className={`badge ${game.status === 'open' ? 'badge-open' : 'badge-full'}`}>
              {GAME_STATUS_LABELS[game.status]}
            </span>
            <span className="badge badge-type">{GAME_TYPE_LABELS[game.gameType]}</span>
          </div>
        </div>

        <div className="meta-grid" style={{ marginBottom: 20 }}>
          <div className="meta-item">
            <div className="meta-label">📍 مکان</div>
            <div className="meta-value">{game.location}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">🕐 زمان</div>
            <div className="meta-value">{formatPersianDate(game.scheduledAt)}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">👥 سکشن</div>
            <div className="meta-value">{game.sectionName}</div>
          </div>
          <div className="meta-item">
            <div className="meta-label">🎯 میزبان</div>
            <div className="meta-value">{game.hostName}</div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 600 }}>ظرفیت</span>
            <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>
              {joined ? game.currentPlayers + 1 : game.currentPlayers}/{game.maxPlayers} نفر
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${((joined ? game.currentPlayers + 1 : game.currentPlayers) / game.maxPlayers) * 100}%`,
              }}
            />
          </div>
          {game.status === 'open' && !joined && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-primary)', marginTop: 8, fontWeight: 600 }}>
              {spots} جای خالی باقی‌مانده
            </p>
          )}
          {joined && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-success)', marginTop: 8, fontWeight: 600 }}>
              ✓ شما عضو این بازی هستید
            </p>
          )}
        </div>

        {game.description && (
          <div className="card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 8 }}>توضیحات</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
              {game.description}
            </p>
          </div>
        )}
      </div>

      {canJoin && (
        <div className="sticky-cta">
          <button className="btn btn-primary btn-block" onClick={handleJoin}>
            پیوستن به بازی
          </button>
        </div>
      )}

      {joined && (
        <div className="sticky-cta">
          <button className="btn btn-secondary btn-block" disabled>
            ✓ عضو شدی
          </button>
        </div>
      )}

      {showToast && (
        <div className="toast" role="status">
          با موفقیت به بازی پیوستی! (نمایشی)
        </div>
      )}
    </>
  );
}

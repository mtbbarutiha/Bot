import { Link } from 'react-router-dom';
import type { Section } from '../types';
import './SectionCard.css';

interface SectionCardProps {
  section: Section;
  gameCount?: number;
}

export function SectionCard({ section, gameCount = 0 }: SectionCardProps) {
  return (
    <Link to={`/sections/${section.id}`} className="section-card card card-clickable">
      <div className="section-card-emoji" aria-hidden>{section.emoji}</div>
      <div className="section-card-body">
        <h3 className="section-card-title">{section.name}</h3>
        {section.description && (
          <p className="section-card-desc">{section.description}</p>
        )}
        <div className="section-card-stats">
          <span>📍 {section.city}</span>
          <span>👥 {section.memberCount} عضو</span>
          {gameCount > 0 && <span>🎮 {gameCount} بازی باز</span>}
        </div>
      </div>
      <span className="section-card-arrow" aria-hidden>‹</span>
    </Link>
  );
}

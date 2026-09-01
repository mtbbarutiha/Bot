import { Link } from 'react-router-dom';
import type { Pet } from '../types';
import { formatAge, formatDistance } from '../data/mock';

const CARD_COLORS = ['lavender', 'pink'] as const;

interface PetGridCardProps {
  pet: Pet;
  index: number;
  onQuickAdd?: (pet: Pet) => void;
}

export function PetGridCard({ pet, index, onQuickAdd }: PetGridCardProps) {
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <Link to={`/pets/${pet.id}`} className={`pet-grid-card ${color}`}>
      {onQuickAdd && (
        <button
          className="add-btn"
          onClick={(e) => {
            e.preventDefault();
            onQuickAdd(pet);
          }}
          aria-label={`درخواست همبازی ${pet.name}`}
        >
          +
        </button>
      )}
      <div className="pet-img">{pet.emoji}</div>
      <div className="pet-name">{pet.name}</div>
      <div className="pet-rating">
        <span>⭐</span>
        <span>{pet.traits[0] || 'بازیگوش'}</span>
      </div>
      <div className="pet-distance">{formatDistance(pet.distanceKm)} · {formatAge(pet)}</div>
    </Link>
  );
}

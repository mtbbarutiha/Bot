import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import type { Pet } from '../types';
import { PetAvatar } from './PetAvatar';
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
          <Plus size={16} strokeWidth={2.5} />
        </button>
      )}
      <div className="pet-img">
        <PetAvatar type={pet.type} size="lg" />
      </div>
      <div className="pet-name">{pet.name}</div>
      <div className="pet-rating">
        <Star size={12} fill="currentColor" strokeWidth={0} />
        <span>{pet.traits[0] || 'بازیگوش'}</span>
      </div>
      <div className="pet-distance">{formatDistance(pet.distanceKm)} · {formatAge(pet)}</div>
    </Link>
  );
}

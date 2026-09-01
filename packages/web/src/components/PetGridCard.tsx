import { Link } from 'react-router-dom';
import { Plus, Star } from 'lucide-react';
import type { Pet } from '../types';
import { PetAvatar } from './PetAvatar';
import { formatAge, formatDistance } from '../data/mock';

interface PetGridCardProps {
  pet: Pet;
  index: number;
  onQuickAdd?: (pet: Pet) => void;
}

export function PetGridCard({ pet, index, onQuickAdd }: PetGridCardProps) {
  return (
    <Link to={`/pets/${pet.id}`} className="pet-grid-card" style={{ animationDelay: `${index * 40}ms` }}>
      {onQuickAdd && (
        <button
          className="add-btn"
          onClick={(e) => {
            e.preventDefault();
            onQuickAdd(pet);
          }}
          aria-label={`درخواست همبازی ${pet.name}`}
        >
          <Plus size={15} strokeWidth={2.5} />
        </button>
      )}
      <div className="pet-img">
        <PetAvatar type={pet.type} size="lg" />
      </div>
      <div className="pet-card-body">
        <div className="pet-name">{pet.name}</div>
        <div className="pet-breed">{pet.breed}</div>
        <div className="pet-rating">
          <Star size={11} fill="currentColor" strokeWidth={0} />
          <span>{pet.traits[0] || 'بازیگوش'}</span>
        </div>
        <div className="pet-distance">{formatDistance(pet.distanceKm)} · {formatAge(pet)}</div>
      </div>
    </Link>
  );
}

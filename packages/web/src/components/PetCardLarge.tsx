import { Link } from 'react-router-dom';
import type { Pet } from '../types';
import { PET_GENDER_LABELS, PET_TYPE_LABELS } from '../types';
import { formatAge, formatDistance } from '../data/mock';

interface PetCardLargeProps {
  pet: Pet;
}

export function PetCardLarge({ pet }: PetCardLargeProps) {
  return (
    <Link to={`/pets/${pet.id}`} className="pet-card-large">
      <div className="pet-card-top">
        <span className="pet-distance-badge">{formatDistance(pet.distanceKm)}</span>
        <div className="pet-tags">
          {pet.traits.slice(0, 3).map((t) => (
            <span key={t} className="pet-tag">{t}</span>
          ))}
        </div>
      </div>

      <div className="pet-card-visual">
        <div className="pet-photo-circle">{pet.emoji}</div>
      </div>

      <div className="pet-card-footer">
        <div>
          <div className="name">{pet.name}</div>
          <div className="meta">
            {pet.breed} · {PET_TYPE_LABELS[pet.type]} · {PET_GENDER_LABELS[pet.gender]}
          </div>
        </div>
        <div className="distance-price">{formatAge(pet)}</div>
      </div>
    </Link>
  );
}

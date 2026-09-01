import { Bird, Cat, Dog, PawPrint, Rabbit } from 'lucide-react';
import type { PetType } from '../types';

const PET_ICON_MAP: Record<PetType, typeof Dog> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  other: PawPrint,
};

interface PetAvatarProps {
  type: PetType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  imageUrl?: string;
  name?: string;
  variant?: 'circle' | 'cover';
  className?: string;
}

const SIZE_CLASS = {
  sm: 'pet-avatar--sm',
  md: 'pet-avatar--md',
  lg: 'pet-avatar--lg',
  xl: 'pet-avatar--xl',
};

export function PetAvatar({
  type,
  size = 'md',
  imageUrl,
  name = '',
  variant = 'circle',
  className = '',
}: PetAvatarProps) {
  const PetIcon = PET_ICON_MAP[type];
  const sizeClass = SIZE_CLASS[size];
  const variantClass = variant === 'cover' ? 'pet-avatar--cover' : '';

  if (imageUrl) {
    return (
      <div className={`pet-avatar pet-avatar--photo ${sizeClass} ${variantClass} ${className}`}>
        <img src={imageUrl} alt={name || 'پت'} loading="lazy" decoding="async" />
      </div>
    );
  }

  return (
    <div className={`pet-avatar pet-avatar--${type} ${sizeClass} ${variantClass} ${className}`}>
      <PetIcon strokeWidth={1.75} />
    </div>
  );
}

export function CategoryPetIcon({ type }: { type: PetType | 'all' }) {
  if (type === 'all') return <PawPrint size={22} strokeWidth={2} />;
  const PetIcon = PET_ICON_MAP[type];
  return <PetIcon size={22} strokeWidth={2} />;
}

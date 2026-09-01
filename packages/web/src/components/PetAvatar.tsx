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
  className?: string;
}

const SIZE_CLASS = {
  sm: 'pet-avatar--sm',
  md: 'pet-avatar--md',
  lg: 'pet-avatar--lg',
  xl: 'pet-avatar--xl',
};

export function PetAvatar({ type, size = 'md', className = '' }: PetAvatarProps) {
  const PetIcon = PET_ICON_MAP[type];
  const sizeClass = SIZE_CLASS[size];

  return (
    <div className={`pet-avatar pet-avatar--${type} ${sizeClass} ${className}`}>
      <PetIcon strokeWidth={1.75} />
    </div>
  );
}

export function CategoryPetIcon({ type }: { type: PetType | 'all' }) {
  if (type === 'all') return <PawPrint size={22} strokeWidth={2} />;
  const PetIcon = PET_ICON_MAP[type];
  return <PetIcon size={22} strokeWidth={2} />;
}

import { DEFAULT_IMAGES } from '../data/petImages';
import type { PetType } from '../types';

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
  const sizeClass = SIZE_CLASS[size];
  const variantClass = variant === 'cover' ? 'pet-avatar--cover' : '';
  const src = imageUrl || DEFAULT_IMAGES[type];

  return (
    <div className={`pet-avatar pet-avatar--photo ${sizeClass} ${variantClass} ${className}`}>
      <img
        src={src}
        alt={name || 'پت'}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          const img = e.currentTarget;
          if (img.src !== DEFAULT_IMAGES[type]) img.src = DEFAULT_IMAGES[type];
        }}
      />
    </div>
  );
}

export function CategoryPetIcon({ type }: { type: PetType | 'all' }) {
  const src = type === 'all' ? DEFAULT_IMAGES.dog : DEFAULT_IMAGES[type];
  return <img src={src} alt="" className="category-photo" />;
}

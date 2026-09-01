import { Bird, Cat, Dog, PawPrint, Rabbit } from 'lucide-react';
import type { PetType } from '../types';

const PET_ICON_MAP: Record<PetType, typeof Dog> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  other: PawPrint,
};

const PET_COLOR_MAP: Record<PetType, string> = {
  dog: '#fb923c',
  cat: '#a78bfa',
  bird: '#38bdf8',
  rabbit: '#f472b6',
  other: '#94a3b8',
};

interface PetAvatarProps {
  type: PetType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: { box: 40, icon: 20 },
  md: { box: 56, icon: 28 },
  lg: { box: 80, icon: 40 },
  xl: { box: 120, icon: 56 },
};

export function PetAvatar({ type, size = 'md', className = '' }: PetAvatarProps) {
  const PetIcon = PET_ICON_MAP[type];
  const color = PET_COLOR_MAP[type];
  const dim = SIZES[size];

  return (
    <div
      className={`pet-avatar ${className}`}
      style={{
        width: dim.box,
        height: dim.box,
        borderRadius: '50%',
        background: `linear-gradient(145deg, ${color}22, ${color}44)`,
        border: `2px solid ${color}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color,
        flexShrink: 0,
      }}
    >
      <PetIcon size={dim.icon} strokeWidth={1.75} />
    </div>
  );
}

export function CategoryPetIcon({ type }: { type: PetType | 'all' }) {
  if (type === 'all') return <PawPrint size={26} strokeWidth={1.75} />;
  const PetIcon = PET_ICON_MAP[type];
  return <PetIcon size={26} strokeWidth={1.75} />;
}

import { PawPrint } from 'lucide-react';

interface PetDuoShowcaseProps {
  leftSrc: string;
  rightSrc: string;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

/** Two pets overlapping — playmate / match composition */
export function PetDuoShowcase({
  leftSrc,
  rightSrc,
  leftLabel = 'پت',
  rightLabel = 'همبازی',
  className = '',
}: PetDuoShowcaseProps) {
  return (
    <div className={`pet-duo ${className}`}>
      <img src={leftSrc} alt={leftLabel} className="pet-duo__photo pet-duo__photo--left" />
      <img src={rightSrc} alt={rightLabel} className="pet-duo__photo pet-duo__photo--right" />
      <span className="pet-duo__badge" aria-hidden>
        <PawPrint size={17} strokeWidth={2.2} />
      </span>
      <span className="pet-duo__ring" aria-hidden />
    </div>
  );
}

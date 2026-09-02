import { LogoIcon } from './LogoIcon';

interface BrandMarkProps {
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
  variant?: 'dark' | 'light';
}

export function BrandMark({
  className = '',
  iconSize = 28,
  showIcon = true,
  variant = 'dark',
}: BrandMarkProps) {
  return (
    <span className={`brand-mark brand-mark--${variant} ${className}`}>
      {showIcon && (
        <LogoIcon size={iconSize} variant={variant} className="brand-mark-icon" />
      )}
      <span className="brand-mark-word" aria-label="petdate">
        <span className="brand-mark-pet">pet</span>
        <span className="brand-mark-date">date</span>
      </span>
    </span>
  );
}

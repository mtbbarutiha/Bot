import { LogoIcon } from './LogoIcon';

interface BrandMarkProps {
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
  variant?: 'dark' | 'light';
  size?: 'md' | 'lg' | 'hero';
}

export function BrandMark({
  className = '',
  iconSize = 28,
  showIcon = true,
  variant = 'dark',
  size = 'md',
}: BrandMarkProps) {
  return (
    <span className={`brand-mark brand-mark--${variant} brand-mark--${size} ${className}`}>
      {showIcon && (
        <LogoIcon size={iconSize} variant={variant} className="brand-mark-icon" />
      )}
      <span className="brand-mark-word" aria-label="petdate" title="petdate">
        <span className="brand-mark-pet">pet</span><span className="brand-mark-date">date</span>
      </span>
    </span>
  );
}

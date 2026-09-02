import { LogoIcon } from './LogoIcon';
import { Logotype } from './Logotype';

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
      <Logotype variant={variant} className="brand-mark-word" />
    </span>
  );
}

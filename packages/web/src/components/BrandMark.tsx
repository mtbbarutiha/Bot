import { LogoIcon } from './LogoIcon';
import { Logotype } from './Logotype';

const BRAND_MARK_SRC = '/brand/petdate-mark.png';

interface BrandMarkProps {
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
  variant?: 'dark' | 'light';
  size?: 'md' | 'lg' | 'hero';
  /** Use neon logo image (default) or legacy SVG */
  mark?: 'neon' | 'svg';
}

export function BrandMark({
  className = '',
  iconSize = 28,
  showIcon = true,
  variant = 'dark',
  size = 'md',
  mark = 'neon',
}: BrandMarkProps) {
  return (
    <span className={`brand-mark brand-mark--${variant} brand-mark--${size} ${className}`}>
      {showIcon &&
        (mark === 'neon' ? (
          <img
            src={BRAND_MARK_SRC}
            alt=""
            width={iconSize}
            height={iconSize}
            className="brand-mark-icon brand-mark-icon--neon"
            draggable={false}
          />
        ) : (
          <LogoIcon size={iconSize} variant={variant} className="brand-mark-icon" />
        ))}
      <Logotype variant={variant} className="brand-mark-word" />
    </span>
  );
}

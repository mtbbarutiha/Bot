import { BRAND } from '@petdate/shared';
import { SITE_LOGO_SRC } from './SiteLogo';

/**
 * Brand lockup for in-app chrome.
 * Always uses لوگو مادر (`/pepito/img/logo.png`) — same as header SiteLogo.
 * Square PWA/schema assets live at `/brand/petdate-mark.png` (also derived from mother).
 */
interface BrandMarkProps {
  className?: string;
  /** Visual height in px (width scales). `iconSize` kept as alias for callers. */
  iconSize?: number;
  height?: number;
  showIcon?: boolean;
  variant?: 'dark' | 'light';
  size?: 'md' | 'lg' | 'hero';
  /** @deprecated Ignored — always لوگو مادر image (no neon/svg fork). */
  mark?: 'neon' | 'svg' | 'mother';
  alt?: string;
}

export function BrandMark({
  className = '',
  iconSize,
  height,
  showIcon = true,
  variant = 'dark',
  size = 'md',
  alt = BRAND.displayNameFa,
}: BrandMarkProps) {
  const h = height ?? iconSize ?? (size === 'hero' ? 48 : size === 'lg' ? 36 : 28);
  if (!showIcon) return null;
  return (
    <span className={`brand-mark brand-mark--${variant} brand-mark--${size} ${className}`}>
      <img
        src={SITE_LOGO_SRC}
        alt={alt}
        height={h}
        className="brand-mark-icon brand-mark-icon--mother site-logo"
        style={{ height: h, width: 'auto', display: 'block' }}
        draggable={false}
      />
    </span>
  );
}

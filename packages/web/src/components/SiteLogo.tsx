import { BRAND } from '@petdate/shared';

/** لوگو مادر — canonical header / chrome logo (pepito/img/logo.png). */
export const SITE_LOGO_SRC = '/pepito/img/logo.png';

type SiteLogoProps = {
  className?: string;
  /** Visual height in px (width scales with the asset). */
  height?: number;
  alt?: string;
};

/** Site header logo — use instead of BrandMark in chat chrome. */
export function SiteLogo({
  className = '',
  height = 32,
  alt = BRAND.displayNameFa,
}: SiteLogoProps) {
  return (
    <img
      src={SITE_LOGO_SRC}
      alt={alt}
      height={height}
      className={`site-logo ${className}`.trim()}
      style={{ height, width: 'auto', display: 'block' }}
      draggable={false}
    />
  );
}

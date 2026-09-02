import { LogoIcon } from './LogoIcon';

interface BrandMarkProps {
  className?: string;
  iconSize?: number;
  showIcon?: boolean;
}

export function BrandMark({ className = '', iconSize = 26, showIcon = true }: BrandMarkProps) {
  return (
    <span className={`brand-mark ${className}`}>
      {showIcon && <LogoIcon size={iconSize} className="brand-mark-icon" />}
      <span className="brand-mark-text">
        pet<span className="brand-mark-accent">date</span>
      </span>
    </span>
  );
}

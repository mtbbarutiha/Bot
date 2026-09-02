import { useId } from 'react';

interface LogoIconProps {
  size?: number;
  className?: string;
  variant?: 'dark' | 'light';
}

export function LogoIcon({ size = 32, className = '', variant = 'dark' }: LogoIconProps) {
  const gid = useId().replace(/:/g, '');
  const isDark = variant === 'dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={`${gid}-surface`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor={isDark ? '#0f172a' : '#ffffff'} />
          <stop offset="1" stopColor={isDark ? '#1e293b' : '#f8fafc'} />
        </linearGradient>
      </defs>

      <rect
        width="48"
        height="48"
        rx="13"
        fill={`url(#${gid}-surface)`}
        stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)'}
        strokeWidth="1"
      />

      <g fill={isDark ? '#ffffff' : '#0f172a'}>
        <circle cx="14.5" cy="16.5" r="3.15" />
        <circle cx="20.25" cy="13.25" r="3.45" />
        <circle cx="26.25" cy="13.25" r="3.45" />
        <circle cx="32" cy="16.5" r="3.15" />
        <ellipse cx="23.25" cy="27.5" rx="10.25" ry="8.75" />
      </g>
    </svg>
  );
}

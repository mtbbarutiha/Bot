import { useId } from 'react';

interface LogoIconProps {
  size?: number;
  className?: string;
  variant?: 'dark' | 'light';
}

function MiniPaw({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <circle cx="-5.4" cy="-6.2" r="2.35" />
      <circle cx="-1.7" cy="-8.6" r="2.55" />
      <circle cx="1.7" cy="-8.6" r="2.55" />
      <circle cx="5.4" cy="-6.2" r="2.35" />
      <ellipse cx="0" cy="1.8" rx="7" ry="6" />
    </g>
  );
}

export function LogoIcon({ size = 32, className = '', variant = 'dark' }: LogoIconProps) {
  const gid = useId().replace(/:/g, '');
  const isDark = variant === 'dark';
  const pawFill = isDark ? '#ffffff' : '#0f172a';
  const linkFill = isDark ? '#60a5fa' : '#2563eb';

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

      {/* connection glow */}
      <circle cx="24" cy="24" r="9" fill={linkFill} opacity="0.14" />

      {/* left paw */}
      <g transform="translate(15 28) rotate(-22)">
        <MiniPaw fill={pawFill} />
      </g>

      {/* right paw — mirrored */}
      <g transform="translate(33 28) rotate(22) scale(-1 1)">
        <MiniPaw fill={pawFill} />
      </g>

      {/* link node */}
      <circle cx="24" cy="23.5" r="2.6" fill={linkFill} />
      <circle cx="24" cy="23.5" r="1" fill={isDark ? '#0f172a' : '#ffffff'} opacity="0.35" />
    </svg>
  );
}

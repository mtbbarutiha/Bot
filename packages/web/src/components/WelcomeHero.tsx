import { PawPrint } from 'lucide-react';

interface WelcomeHeroProps {
  mainSrc: string;
  accentSrc: string;
  className?: string;
}

export function WelcomeHero({ mainSrc, accentSrc, className = '' }: WelcomeHeroProps) {
  return (
    <div className={`welcome-hero ${className}`}>
      <img className="welcome-hero__main" src={mainSrc} alt="سگ" />
      <div className="welcome-hero__overlay" aria-hidden />
      <div className="welcome-hero__accent-wrap">
        <img className="welcome-hero__accent" src={accentSrc} alt="گربه" />
      </div>
      <div className="welcome-hero__chip">
        <PawPrint size={13} strokeWidth={2.5} />
        <span>همبازی نزدیکت</span>
      </div>
    </div>
  );
}

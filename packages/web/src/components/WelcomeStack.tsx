import type { CSSProperties } from 'react';
import { Heart } from 'lucide-react';

export interface WelcomeStackPet {
  src: string;
  name: string;
  meta: string;
}

interface WelcomeStackProps {
  pets: readonly WelcomeStackPet[];
  className?: string;
}

const STACK_STYLE = [
  { rotate: -7, y: 18, scale: 0.9, opacity: 0.55 },
  { rotate: 5, y: 9, scale: 0.95, opacity: 0.78 },
  { rotate: 0, y: 0, scale: 1, opacity: 1 },
] as const;

export function WelcomeStack({ pets, className = '' }: WelcomeStackProps) {
  const stack = pets.slice(0, 3);

  return (
    <div className={`welcome-stack ${className}`}>
      {stack.map((pet, index) => {
        const style = STACK_STYLE[index] ?? STACK_STYLE[2];
        return (
          <article
            key={pet.src}
            className={`welcome-stack__card welcome-stack__card--${index}`}
            style={{
              '--stack-rotate': `${style.rotate}deg`,
              '--stack-y': `${style.y}px`,
              '--stack-scale': style.scale,
              '--stack-opacity': style.opacity,
            } as CSSProperties}
          >
            <img src={pet.src} alt={pet.name} />
            {index === stack.length - 1 && (
              <div className="welcome-stack__info">
                <strong>{pet.name}</strong>
                <span>{pet.meta}</span>
              </div>
            )}
          </article>
        );
      })}

      <div className="welcome-stack__match" aria-hidden>
        <Heart size={18} strokeWidth={2.5} fill="currentColor" />
      </div>
    </div>
  );
}

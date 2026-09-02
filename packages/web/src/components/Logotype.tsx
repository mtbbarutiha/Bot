interface LogotypeProps {
  className?: string;
  variant?: 'dark' | 'light';
}

/** Wordmark — always renders as one word: petdate */
export function Logotype({ className = '', variant = 'dark' }: LogotypeProps) {
  return (
    <span
      className={`logotype logotype--${variant} ${className}`}
      aria-label="petdate"
      title="petdate"
    >
      petdate
    </span>
  );
}

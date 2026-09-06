interface AdminWordmarkProps {
  className?: string;
  size?: 'md' | 'lg';
}

export function AdminWordmark({ className = '', size = 'md' }: AdminWordmarkProps) {
  return (
    <div className={`admin-wordmark admin-wordmark--${size} ${className}`.trim()}>
      <span className="admin-wordmark-badge" aria-hidden>PD</span>
      <div className="admin-wordmark-copy">
        <strong className="admin-wordmark-title">PetDate Admin</strong>
      </div>
    </div>
  );
}

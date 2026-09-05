interface AdminWordmarkProps {
  className?: string;
  /** Compact for sidebar; default for login */
  size?: 'md' | 'lg';
}

/** Ops console wordmark — intentionally distinct from consumer Pet Date marketing brand. */
export function AdminWordmark({ className = '', size = 'md' }: AdminWordmarkProps) {
  return (
    <div className={`admin-wordmark admin-wordmark--${size} ${className}`.trim()}>
      <span className="admin-wordmark-badge" aria-hidden>
        OPS
      </span>
      <div className="admin-wordmark-copy">
        <strong className="admin-wordmark-title">کنسول عملیات</strong>
        <span className="admin-wordmark-sub">internal admin</span>
      </div>
    </div>
  );
}

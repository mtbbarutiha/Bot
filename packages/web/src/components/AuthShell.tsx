import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '@petdate/shared';

interface AuthShellProps {
  children: ReactNode;
  /** Wider card for multi-step wizards */
  wide?: boolean;
  /** Optional back link label (default: بازگشت به صفحه اصلی) */
  backLabel?: string;
  backTo?: string;
}

/** Shared Pepito-styled shell for login / OTP / onboarding — matches landing brand. */
export function AuthShell({
  children,
  wide = false,
  backLabel = 'بازگشت به صفحه اصلی',
  backTo = '/',
}: AuthShellProps) {
  return (
    <div className="pepito-auth">
      <header className="pepito-auth-nav">
        <Link to="/" className="pepito-nav-logo" aria-label={BRAND.displayName}>
          <img src="/pepito/img/logo.png" alt={BRAND.displayName} />
        </Link>
        <Link to={backTo} className="pepito-auth-nav-link">
          {backLabel}
        </Link>
      </header>
      <div className="pepito-auth-body">
        <div className={`pepito-auth-card${wide ? ' pepito-auth-card--wide' : ''}`}>
          {children}
        </div>
      </div>
    </div>
  );
}

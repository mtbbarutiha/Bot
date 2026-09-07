import type { ReactNode } from 'react';
import { LandingChrome } from './LandingChrome';

interface AuthShellProps {
  children: ReactNode;
  /** Wider panel for multi-step wizards */
  wide?: boolean;
  /** Optional back link label (default: short «خانه» — fits mobile header) */
  backLabel?: string;
  backTo?: string;
  /** Continuity banner copy — defaults keep brand first */
  bannerTitle?: string;
  bannerLead?: string;
  bannerImage?: string;
  /** Hide site footer (e.g. role select with fixed bottom CTA) */
  footer?: boolean;
}

/** Auth / onboarding shell — same Pepito landing chrome as Welcome, not a detached auth app. */
export function AuthShell({
  children,
  wide = false,
  backLabel = 'خانه',
  backTo = '/',
  bannerTitle = 'همراه پت‌های خاص شما',
  bannerLead = 'همان حساب وب و تلگرام — ورود و تکمیل پروفایل در همین محیط',
  bannerImage,
  footer = true,
}: AuthShellProps) {
  return (
    <LandingChrome
      bannerTitle={bannerTitle}
      bannerLead={bannerLead}
      bannerImage={bannerImage}
      actionLabel={backLabel}
      actionTo={backTo}
      className="pepito-auth-flow"
      footer={footer}
    >
      <section className={`pepito-flow-panel${wide ? ' pepito-flow-panel--wide' : ''}`}>
        <div className="pepito-flow-panel-inner">{children}</div>
      </section>
    </LandingChrome>
  );
}

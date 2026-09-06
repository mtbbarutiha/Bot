import type { UserPresence } from '@petdate/shared';
import { formatPresenceLabel } from '../hooks/usePresence';

type PresenceBadgeProps = {
  presence: UserPresence | null | undefined;
  className?: string;
};

/** Compact online/offline badge for chat headers. */
export function PresenceBadge({ presence, className = '' }: PresenceBadgeProps) {
  if (!presence) return null;
  const label = formatPresenceLabel(presence);
  if (!label) return null;
  return (
    <span
      className={`tg-presence${presence.online ? ' is-online' : ' is-offline'}${className ? ` ${className}` : ''}`}
      title={label}
    >
      <i className="tg-presence-dot" aria-hidden />
      {label}
    </span>
  );
}

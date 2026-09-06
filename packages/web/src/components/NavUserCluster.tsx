import { ProfileMenu } from './ProfileMenu';
import { WalletChip } from './WalletChip';
import { useAuthStore } from '../hooks/useAuthStore';

/**
 * Logged-in profile + wallet pinned to the physical top-left of the Pepito nav.
 * Order is LTR (avatar, then wallet to its right) regardless of page dir="rtl".
 */
export function NavUserCluster() {
  const { isLoggedIn } = useAuthStore();
  if (!isLoggedIn) return null;

  return (
    <div className="pepito-nav-user-cluster" aria-label="حساب کاربری">
      <ProfileMenu />
      <WalletChip />
    </div>
  );
}

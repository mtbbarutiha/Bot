import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';
import { WalletChip } from './WalletChip';
import { useAuthStore } from '../hooks/useAuthStore';
import { useShopCart } from '../hooks/useShopCart';

/**
 * Top-bar account tools pinned to physical CSS left (LTR cluster):
 * circular profile avatar → wallet chip → cart.
 * Mobile CSS hides avatar/wallet (dock covers them); desktop keeps them.
 */
export function NavUserCluster({ showCart = true }: { showCart?: boolean } = {}) {
  const { isLoggedIn } = useAuthStore();
  const { itemCount } = useShopCart();

  if (!isLoggedIn && !showCart) return null;

  return (
    <div className="pepito-nav-user-cluster" aria-label="حساب و خرید">
      {isLoggedIn ? (
        <>
          <ProfileMenu />
          <WalletChip />
        </>
      ) : null}
      {showCart ? (
        <Link
          to="/shop/cart"
          className="pepito-nav-cart-link pd-shop-cart-link"
          data-shop-cart-target
          aria-label={itemCount > 0 ? `سبد خرید (${itemCount})` : 'سبد خرید'}
        >
          <ShoppingBag size={18} strokeWidth={2.2} aria-hidden />
          {itemCount > 0 ? (
            <span className="pepito-nav-cart-count">{itemCount.toLocaleString('fa-IR')}</span>
          ) : null}
        </Link>
      ) : null}
    </div>
  );
}

import { Navigate } from 'react-router-dom';

/** Legacy stub — full shop lives under public /shop routes */
export function ShopPage() {
  return <Navigate to="/shop" replace />;
}

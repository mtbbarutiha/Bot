import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getProduct, type ShopProduct } from '../data/shopCatalog';

const STORAGE_KEY = 'petdate.shop.cart.v1';
const ORDERS_KEY = 'petdate.shop.orders.v1';

export interface CartLine {
  productId: string;
  qty: number;
}

export interface CartLineView extends CartLine {
  product: ShopProduct;
  lineTotal: number;
}

export interface ShopOrderStub {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  address: string;
  note?: string;
  items: CartLine[];
  totalToman: number;
  status: 'pending';
}

function readLines(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l.productId === 'string' && l.qty > 0);
  } catch {
    return [];
  }
}

function writeLines(lines: CartLine[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
}

function readOrders(): ShopOrderStub[] {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ShopOrderStub[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface ShopCartContextValue {
  lines: CartLineView[];
  itemCount: number;
  totalToman: number;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  placeOrderStub: (form: {
    name: string;
    phone: string;
    address: string;
    note?: string;
  }) => ShopOrderStub;
}

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() =>
    typeof window === 'undefined' ? [] : readLines()
  );

  useEffect(() => {
    writeLines(lines);
  }, [lines]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLines(readLines());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const views: CartLineView[] = useMemo(() => {
    return lines
      .map((l) => {
        const product = getProduct(l.productId);
        if (!product) return null;
        return {
          ...l,
          product,
          lineTotal: product.priceToman * l.qty,
        };
      })
      .filter(Boolean) as CartLineView[];
  }, [lines]);

  const itemCount = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const totalToman = useMemo(() => views.reduce((s, l) => s + l.lineTotal, 0), [views]);

  const add = useCallback((productId: string, qty = 1) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i]!, qty: next[i]!.qty + qty };
        return next;
      }
      return [...prev, { productId, qty }];
    });
  }, []);

  const setQty = useCallback((productId: string, qty: number) => {
    setLines((prev) => {
      if (qty <= 0) return prev.filter((l) => l.productId !== productId);
      return prev.map((l) => (l.productId === productId ? { ...l, qty } : l));
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const placeOrderStub = useCallback(
    (form: { name: string; phone: string; address: string; note?: string }) => {
      const order: ShopOrderStub = {
        id: `ORD-${Date.now()}`,
        createdAt: new Date().toISOString(),
        name: form.name,
        phone: form.phone,
        address: form.address,
        note: form.note,
        items: lines,
        totalToman,
        status: 'pending',
      };
      localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...readOrders()]));
      clear();
      return order;
    },
    [lines, totalToman, clear]
  );

  const value = useMemo(
    () => ({
      lines: views,
      itemCount,
      totalToman,
      add,
      setQty,
      remove,
      clear,
      placeOrderStub,
    }),
    [views, itemCount, totalToman, add, setQty, remove, clear, placeOrderStub]
  );

  return <ShopCartContext.Provider value={value}>{children}</ShopCartContext.Provider>;
}

export function useShopCart() {
  const ctx = useContext(ShopCartContext);
  if (!ctx) {
    throw new Error('useShopCart must be used within ShopCartProvider');
  }
  return ctx;
}

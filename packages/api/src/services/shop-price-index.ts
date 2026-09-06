/**
 * Server-side shop price index — mirrors web shopCatalog for coin checkout pricing.
 * Prefer live shop_products rows when present; fall back to this index.
 */
import priceIndexJson from '../data/shop-price-index.json';

export type ShopPriceEntry = {
  id: string;
  slug: string;
  title: string;
  brandId: string;
  categorySlug: string;
  priceToman: number;
};

const entries = priceIndexJson as ShopPriceEntry[];

const byId = new Map<string, ShopPriceEntry>();
const bySlug = new Map<string, ShopPriceEntry>();
for (const e of entries) {
  byId.set(e.id, e);
  bySlug.set(e.slug, e);
}

export function lookupShopPrice(idOrSlug: string): ShopPriceEntry | null {
  return byId.get(idOrSlug) ?? bySlug.get(idOrSlug) ?? null;
}

export function shopPriceIndexSize(): number {
  return entries.length;
}

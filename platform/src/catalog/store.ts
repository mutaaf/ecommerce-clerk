/* The catalog we hold for retrieval.

   This is a cache, and it is treated like one. A synced product is good
   enough to decide WHICH products are worth putting in front of someone.
   It is never good enough to tell them a price or say a size is in stock:
   those are transactional facts, and the tool layer re-reads them from
   the commerce API at request time before anything reaches the model.

   The split is structural rather than a rule someone has to remember.
   Search returns candidate ids, not products, so a stale price has no
   route to a customer. */

import type { Product } from '../contract/adapter.ts';
import type { MerchantId, ProductId } from '../contract/ids.ts';

export interface CatalogEntry {
  readonly product: Product;
  readonly syncedAt: Date;
}

export interface CatalogStore {
  upsert(merchantId: MerchantId, products: readonly Product[], at?: Date): Promise<number>;
  entries(merchantId: MerchantId): Promise<readonly CatalogEntry[]>;
  get(merchantId: MerchantId, productId: ProductId): Promise<CatalogEntry | null>;
  size(merchantId: MerchantId): Promise<number>;
}

export function inMemoryCatalog(): CatalogStore {
  const byMerchant = new Map<string, Map<string, CatalogEntry>>();
  const shelf = (m: MerchantId) => {
    if (!byMerchant.has(m)) byMerchant.set(m, new Map());
    return byMerchant.get(m)!;
  };

  return {
    async upsert(merchantId, products, at = new Date()) {
      const s = shelf(merchantId);
      for (const product of products) s.set(product.id, { product, syncedAt: at });
      return products.length;
    },
    async entries(merchantId) { return [...shelf(merchantId).values()]; },
    async get(merchantId, productId) { return shelf(merchantId).get(productId) ?? null; },
    async size(merchantId) { return shelf(merchantId).size; }
  };
}

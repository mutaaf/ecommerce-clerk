/* Filling the retrieval copy from a store.

   The adapter normalizes, this puts the result on the shelf. Nothing
   platform specific reaches this file, which is the point: the same
   function fills the catalog from WooCommerce, from Shopify, or from a
   scheduled feed on somebody's custom stack. */

import type { CommerceAdapter } from '../contract/adapter.ts';
import type { MerchantId } from '../contract/ids.ts';
import type { CatalogStore } from './store.ts';

export interface SyncReport {
  readonly merchantId: MerchantId;
  readonly products: number;
  readonly variations: number;
  readonly tookMs: number;
}

export async function syncCatalog(
  adapter: CommerceAdapter,
  catalog: CatalogStore,
  merchantId: MerchantId
): Promise<SyncReport> {
  const result = await adapter.syncCatalog();
  await catalog.upsert(merchantId, result.items, result.finishedAt);
  return {
    merchantId,
    products: result.products,
    variations: result.variations,
    tookMs: result.finishedAt.getTime() - result.startedAt.getTime()
  };
}

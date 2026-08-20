/* THE ADAPTER CONTRACT

   Every commerce adapter owns exactly three concerns and nothing else:

     1. authentication and credential scoping
     2. catalog normalization into the common product shape below
     3. how attribution is persisted on that platform

   Retrieval, ranking, conversation, tool selection, permissions,
   reconciliation and analytics are written once, above this line, and are
   the same whatever store is underneath. If platform specific logic
   appears above an adapter, that is the bug to fix.

   Nothing in this file imports an adapter, and no adapter decides
   anything about attribution beyond where the bytes are written. */

import type { Money } from './money.ts';
import type {
  MerchantId, SessionId, RecommendationId, CartId, OrderId, ProductId, VariationId
} from './ids.ts';

/* ---------- the common shapes every platform is normalized into ---------- */

export interface Product {
  readonly id: ProductId;
  readonly sku: string | null;
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly price: Money;
  readonly inStock: boolean;
  readonly categories: readonly string[];
  readonly attributes: Readonly<Record<string, readonly string[]>>;  /* size, colour, fitment */
  readonly hasVariations: boolean;
  readonly imageUrl: string | null;
}

export interface Variation {
  readonly id: VariationId;
  readonly productId: ProductId;
  readonly sku: string | null;
  readonly title: string;
  readonly price: Money;
  readonly inStock: boolean;
  readonly stockQuantity: number | null;
  readonly attributes: Readonly<Record<string, string>>;
}

export interface Inventory {
  readonly productId: ProductId;
  readonly variationId: VariationId | null;
  readonly inStock: boolean;
  readonly quantity: number | null;
  readonly checkedAt: Date;                 /* transactional facts are read, never recalled */
}

export interface CartLine {
  readonly productId: ProductId;
  readonly variationId: VariationId | null;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
}

export interface Cart {
  readonly id: CartId;
  readonly lines: readonly CartLine[];
  readonly subtotal: Money;
  readonly currency: string;
}

export interface Checkout {
  readonly cartId: CartId;
  readonly url: string;                     /* the merchant's own checkout */
}

export interface OrderLine {
  readonly productId: ProductId;
  readonly variationId: VariationId | null;
  readonly quantity: number;
  readonly lineTotal: Money;
}

export interface Order {
  readonly id: OrderId;
  readonly merchantId: MerchantId;
  readonly cartId: CartId | null;
  readonly customerRef: string | null;      /* however the platform identifies the buyer */
  readonly placedAt: Date;
  readonly total: Money;
  readonly currency: string;
  readonly lines: readonly OrderLine[];
  /* Whatever attribution survived on the record. Never trusted on its own:
     see attribution/reconcile.ts. */
  readonly attribution: PersistedAttribution | null;
}

/* What an adapter writes onto an order, and reads back off it. This is the
   only attribution concept an adapter knows about: it persists and returns
   these fields, and forms no opinion about what they mean. */
export interface PersistedAttribution {
  readonly sessionId: SessionId;
  readonly cartId: CartId | null;
  readonly recommendationId: RecommendationId | null;
  readonly writtenAt: Date;
}

export interface SearchQuery {
  readonly text: string;
  readonly categories?: readonly string[];
  readonly maxPrice?: Money;
  readonly minPrice?: Money;
  readonly inStockOnly?: boolean;
  readonly limit?: number;
}

export interface CatalogSyncResult {
  readonly merchantId: MerchantId;
  /* Normalizing the catalog is the adapter's job, so a sync hands back the
     normalized products rather than a count of them. Retrieval keeps its
     own copy; see catalog/store.ts for why that copy is never quoted at a
     customer. A catalog too large to hold gets a streaming sync, which is
     a V2 problem and not one V1 has. */
  readonly items: readonly Product[];
  readonly products: number;
  readonly variations: number;
  readonly startedAt: Date;
  readonly finishedAt: Date;
}

export interface Credentials {
  readonly merchantId: MerchantId;
  readonly storeUrl: string;
  readonly secrets: Readonly<Record<string, string>>;   /* whatever the platform needs */
}

export interface AuthResult {
  readonly merchantId: MerchantId;
  readonly ok: boolean;
  readonly scopes: readonly string[];
  /* Reads we were granted but should not have, and writes we were granted
     but will never make. Surfaced at install so a merchant can narrow them. */
  readonly excessiveScopes: readonly string[];
}

/* ---------- the interface itself ---------- */

export interface CommerceAdapter {
  readonly platform: string;

  /* 1. authentication */
  authenticate(credentials: Credentials): Promise<AuthResult>;

  /* 2. catalog normalization */
  syncCatalog(): Promise<CatalogSyncResult>;
  searchProducts(query: SearchQuery): Promise<readonly Product[]>;
  getProduct(id: ProductId): Promise<Product | null>;
  getVariations(id: ProductId): Promise<readonly Variation[]>;
  checkInventory(id: ProductId, variationId?: VariationId | null): Promise<Inventory>;
  getPrice(id: ProductId, variationId?: VariationId | null): Promise<Money>;

  /* carts are the only writes the platform ever makes to a store */
  createCart(): Promise<Cart>;
  addToCart(cartId: CartId, productId: ProductId, variationId: VariationId | null, quantity: number): Promise<Cart>;
  createCheckout(cartId: CartId): Promise<Checkout>;

  /* 3. how attribution is persisted here */
  writeAttribution(orderId: OrderId, attribution: PersistedAttribution): Promise<void>;
  readOrder(orderId: OrderId): Promise<Order | null>;
}

/* The contract as data, so a conformance test can assert an implementation
   covers it rather than a reviewer reading down two lists. */
export const ADAPTER_METHODS = [
  'authenticate', 'syncCatalog', 'searchProducts', 'getProduct', 'getVariations',
  'checkInventory', 'getPrice', 'createCart', 'addToCart', 'createCheckout',
  'writeAttribution', 'readOrder'
] as const;

export type AdapterMethod = typeof ADAPTER_METHODS[number];

/* The operations that are absent from the tool schema on purpose. Listed
   here so the absence is testable: an adapter that grows one of these has
   broken the security model, not extended it. */
export const FORBIDDEN_OPERATIONS = [
  'updatePrice', 'deleteProduct', 'updateInventory', 'exportCustomers',
  'updatePaymentSettings', 'refundOrder', 'createOrder', 'updateOrder'
] as const;

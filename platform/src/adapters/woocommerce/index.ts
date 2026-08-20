/* WooCommerce adapter.

   Implements CommerceAdapter and owns three concerns: authentication
   (client.ts), catalog normalization (normalize.ts) and how attribution is
   persisted (attribution.ts). It ranks nothing, decides nothing about
   billing, and knows nothing about a conversation. */

import type {
  CommerceAdapter, Credentials, AuthResult, CatalogSyncResult, SearchQuery,
  Product, Variation, Inventory, Cart, Checkout, Order, PersistedAttribution
} from '../../contract/adapter.ts';
import type { Money } from '../../contract/money.ts';
import { fromDecimalString } from '../../contract/money.ts';
import {
  asMerchantId, asCartId, type MerchantId, type ProductId, type VariationId,
  type CartId, type OrderId
} from '../../contract/ids.ts';
import { WooClient, authenticate, type Fetch } from './client.ts';
import { toProduct, toVariation, toOrder, type WooProduct, type WooVariation, type WooOrder } from './normalize.ts';
import { toMeta } from './attribution.ts';

const V3 = '/wp-json/wc/v3';
const STORE = '/wp-json/wc/store/v1';
const PAGE = 100;

interface WooCart {
  items?: { id: number; variation?: { id?: number }[]; quantity: number; prices?: { price: string } ; totals?: { line_total: string } }[];
  totals?: { total_items: string; currency_code: string };
}

export class WooCommerceAdapter implements CommerceAdapter {
  readonly platform = 'woocommerce';

  readonly #client: WooClient;
  readonly #credentials: Credentials;
  readonly #merchantId: MerchantId;
  readonly #currency: string;
  #cartTokens = new Map<string, string>();

  constructor(credentials: Credentials, fetchImpl: Fetch = fetch, currency = 'USD') {
    this.#credentials = credentials;
    this.#client = new WooClient(credentials, fetchImpl);
    this.#merchantId = asMerchantId(credentials.merchantId);
    this.#currency = currency;
  }

  /* ---------- 1. authentication ---------- */

  authenticate(credentials: Credentials = this.#credentials): Promise<AuthResult> {
    return authenticate(this.#client, credentials);
  }

  /* ---------- 2. catalog ---------- */

  async syncCatalog(): Promise<CatalogSyncResult> {
    const startedAt = new Date();
    const items: Product[] = [];
    let page = 1, variations = 0;

    for (;;) {
      const batch = await this.#client.get<WooProduct[]>(`${V3}/products`, { per_page: PAGE, page });
      if (!batch.length) break;
      for (const raw of batch) {
        items.push(toProduct(raw, this.#currency));
        if (raw.type === 'variable') {
          const vs = await this.#client.get<WooVariation[]>(`${V3}/products/${raw.id}/variations`, { per_page: PAGE });
          variations += vs.length;
        }
      }
      if (batch.length < PAGE) break;
      page += 1;
    }
    return { merchantId: this.#merchantId, items, products: items.length, variations, startedAt, finishedAt: new Date() };
  }

  async searchProducts(query: SearchQuery): Promise<readonly Product[]> {
    const raw = await this.#client.get<WooProduct[]>(`${V3}/products`, {
      search: query.text,
      per_page: query.limit ?? 20,
      stock_status: query.inStockOnly ? 'instock' : undefined,
      min_price: query.minPrice ? (query.minPrice.amount / 100).toFixed(2) : undefined,
      max_price: query.maxPrice ? (query.maxPrice.amount / 100).toFixed(2) : undefined
    });
    return raw.map(p => toProduct(p, this.#currency));
  }

  async getProduct(id: ProductId): Promise<Product | null> {
    const raw = await this.#client.get<WooProduct | null>(`${V3}/products/${id}`);
    return raw ? toProduct(raw, this.#currency) : null;
  }

  async getVariations(id: ProductId): Promise<readonly Variation[]> {
    const raw = await this.#client.get<WooVariation[]>(`${V3}/products/${id}/variations`, { per_page: PAGE });
    return raw.map(v => toVariation(v, id, this.#currency));
  }

  /* Stock and price are read at request time, every time. The model is
     never asked to remember either. */
  async checkInventory(id: ProductId, variationId: VariationId | null = null): Promise<Inventory> {
    if (variationId) {
      const v = await this.#client.get<WooVariation>(`${V3}/products/${id}/variations/${variationId}`);
      return { productId: id, variationId, inStock: v.stock_status === 'instock',
               quantity: v.stock_quantity ?? null, checkedAt: new Date() };
    }
    const p = await this.#client.get<WooProduct>(`${V3}/products/${id}`);
    return { productId: id, variationId: null, inStock: p.stock_status === 'instock',
             quantity: null, checkedAt: new Date() };
  }

  async getPrice(id: ProductId, variationId: VariationId | null = null): Promise<Money> {
    if (variationId) {
      const v = await this.#client.get<WooVariation>(`${V3}/products/${id}/variations/${variationId}`);
      return fromDecimalString(v.price, this.#currency);
    }
    const p = await this.#client.get<WooProduct>(`${V3}/products/${id}`);
    return fromDecimalString(p.price, this.#currency);
  }

  /* ---------- carts: the only write into the store ---------- */

  async createCart(): Promise<Cart> {
    const raw = await this.#client.get<WooCart>(`${STORE}/cart`);
    const id = asCartId('wc_' + Math.random().toString(36).slice(2, 12));
    return this.#toCart(id, raw);
  }

  async addToCart(cartId: CartId, productId: ProductId, variationId: VariationId | null, quantity: number): Promise<Cart> {
    const raw = await this.#client.post<WooCart>(`${STORE}/cart/add-item`, {
      id: Number(variationId ?? productId),
      quantity
    });
    return this.#toCart(cartId, raw);
  }

  async createCheckout(cartId: CartId): Promise<Checkout> {
    return { cartId, url: `${this.#credentials.storeUrl.replace(/\/$/, '')}/checkout/` };
  }

  /* ---------- 3. attribution persistence ---------- */

  async writeAttribution(orderId: OrderId, attribution: PersistedAttribution): Promise<void> {
    await this.#client.put(`${V3}/orders/${orderId}`, { meta_data: toMeta(attribution) });
  }

  async readOrder(orderId: OrderId): Promise<Order | null> {
    const raw = await this.#client.get<WooOrder | null>(`${V3}/orders/${orderId}`);
    return raw ? toOrder(raw, this.#merchantId) : null;
  }

  /* ---------- private ---------- */

  #toCart(id: CartId, raw: WooCart): Cart {
    const currency = raw.totals?.currency_code ?? this.#currency;
    const lines = (raw.items ?? []).map(i => ({
      productId: String(i.id) as ProductId,
      variationId: (i.variation?.[0]?.id ? String(i.variation[0].id) : null) as VariationId | null,
      quantity: i.quantity,
      unitPrice: fromDecimalString(String(Number(i.prices?.price ?? '0') / 100), currency),
      lineTotal: fromDecimalString(String(Number(i.totals?.line_total ?? '0') / 100), currency)
    }));
    return {
      id,
      lines,
      subtotal: fromDecimalString(String(Number(raw.totals?.total_items ?? '0') / 100), currency),
      currency
    };
  }
}

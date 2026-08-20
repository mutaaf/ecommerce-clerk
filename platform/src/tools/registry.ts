/* Binding the verbs to one merchant's store.

   Every call goes through here, so this is where the invariants live:

   - transactional facts are read from the commerce API at call time and
     never taken from the catalog cache, which exists only to decide which
     products are worth looking at
   - a product id the merchant does not carry is refused before it reaches
     the store, so the model cannot invent a SKU and get real data back
   - recommending writes a row with position and reason, and adding to a
     cart writes the line with the recommendation that led to it, which is
     what reconciliation later reads

   No provider appears in this file. The tool layer does not know what is
   calling it. */

import type { CommerceAdapter, Product, Variation } from '../contract/adapter.ts';
import type { MerchantId, SessionId, ProductId, VariationId, CartId } from '../contract/ids.ts';
import { asProductId, asVariationId, type IdFactory } from '../contract/ids.ts';
import { format, fromDecimalString, type Money } from '../contract/money.ts';
import type { AttributionLedger } from '../attribution/ledger.ts';
import type { CatalogStore } from '../catalog/store.ts';
import { rank, type Signal } from '../catalog/search.ts';
import { TOOLS, TOOL_NAMES, type ToolDef } from './schema.ts';

export interface ToolContext {
  readonly adapter: CommerceAdapter;
  readonly catalog: CatalogStore;
  readonly ledger: AttributionLedger;
  readonly ids: IdFactory;
  readonly merchantId: MerchantId;
  readonly sessionId: SessionId;
  readonly currency: string;
}

export interface ToolCallRecord {
  readonly name: string;
  readonly input: unknown;
  readonly ok: boolean;
  readonly at: Date;
}

export interface ToolKit {
  readonly defs: readonly ToolDef[];
  readonly calls: readonly ToolCallRecord[];
  cartId(): CartId | null;
  call(name: string, input: Record<string, unknown>): Promise<unknown>;
}

/* Shown to the model. Money is a formatted string so it never has to do
   arithmetic, and every one of these was read a moment ago. */
interface LiveProduct {
  product_id: string;
  variation_id?: string;
  title: string;
  sku: string | null;
  price: string;
  in_stock: boolean;
  stock?: number | null;
  attributes: Record<string, unknown>;
  categories?: readonly string[];
  checked_at: string;
  why?: readonly string[];
}

class UnknownProduct extends Error {}

export function createToolKit(ctx: ToolContext): ToolKit {
  const calls: ToolCallRecord[] = [];
  const recommended = new Map<string, string>();   /* product|variation -> recommendationId */
  let cart: CartId | null = null;

  /* A product id has to be one this merchant carries. Checked against our
     own catalog before the store is ever asked. */
  const known = async (id: string): Promise<ProductId> => {
    const entry = await ctx.catalog.get(ctx.merchantId, asProductId(id));
    if (!entry) throw new UnknownProduct(`no product ${id} in this catalog`);
    return entry.product.id;
  };

  /* The one place a product becomes something a customer can be told. */
  const live = async (productId: ProductId, variationId: VariationId | null,
                      why?: readonly string[]): Promise<LiveProduct> => {
    const [product, price, inventory] = await Promise.all([
      ctx.adapter.getProduct(productId),
      ctx.adapter.getPrice(productId, variationId),
      ctx.adapter.checkInventory(productId, variationId)
    ]);
    if (!product) throw new UnknownProduct(`no product ${productId}`);

    let variation: Variation | undefined;
    if (variationId) {
      const all = await ctx.adapter.getVariations(productId);
      variation = all.find(v => v.id === variationId);
    }

    return {
      product_id: productId,
      ...(variationId ? { variation_id: variationId } : {}),
      title: variation ? `${product.title} (${variation.title})` : product.title,
      sku: variation?.sku ?? product.sku,
      price: format(price),
      in_stock: inventory.inStock,
      stock: inventory.quantity,
      attributes: variation ? variation.attributes : product.attributes,
      categories: product.categories,
      checked_at: inventory.checkedAt.toISOString(),
      ...(why?.length ? { why } : {})
    };
  };

  const money = (decimal: unknown): Money | undefined =>
    typeof decimal === 'string' && decimal.trim()
      ? fromDecimalString(decimal.replace(/[^0-9.]/g, ''), ctx.currency)
      : undefined;

  const handlers: Record<string, (input: any) => Promise<unknown>> = {

    async search_products(input) {
      const signals: Signal[] = Array.isArray(input.signals)
        ? input.signals.filter((s: any) => s && typeof s.key === 'string' && typeof s.value === 'string')
        : [];

      const entries = await ctx.catalog.entries(ctx.merchantId);
      const candidates = rank(entries, {
        text: String(input.query ?? ''),
        signals,
        maxPrice: money(input.max_price),
        inStockOnly: input.in_stock_only !== false,
        limit: Math.min(Number(input.limit) || 5, 10)
      });

      /* Ranked on the cache, answered from the store. */
      const results = await Promise.all(
        candidates.map(c => live(c.productId, null, c.matched))
      );
      return { results, searched: entries.length };
    },

    async get_product(input) {
      return live(await known(input.product_id), null);
    },

    async get_variations(input) {
      const productId = await known(input.product_id);
      const variations = await ctx.adapter.getVariations(productId);
      return {
        product_id: productId,
        variations: variations.map(v => ({
          variation_id: v.id,
          title: v.title,
          sku: v.sku,
          price: format(v.price),
          in_stock: v.inStock,
          stock: v.stockQuantity,
          attributes: v.attributes
        }))
      };
    },

    async check_inventory(input) {
      const productId = await known(input.product_id);
      const variationId = input.variation_id ? asVariationId(input.variation_id) : null;
      const inv = await ctx.adapter.checkInventory(productId, variationId);
      return {
        product_id: productId,
        variation_id: variationId ?? undefined,
        in_stock: inv.inStock,
        stock: inv.quantity,
        checked_at: inv.checkedAt.toISOString()
      };
    },

    async get_price(input) {
      const productId = await known(input.product_id);
      const variationId = input.variation_id ? asVariationId(input.variation_id) : null;
      const price = await ctx.adapter.getPrice(productId, variationId);
      return { product_id: productId, variation_id: variationId ?? undefined, price: format(price), read_at: new Date().toISOString() };
    },

    async compare_products(input) {
      const ids: string[] = Array.isArray(input.product_ids) ? input.product_ids : [];
      if (ids.length < 2) return { error: 'compare_products needs at least two product ids' };
      const products = await Promise.all(ids.map(async id => live(await known(id), null)));

      /* Only the attributes that actually differ: that is the comparison. */
      const keys = [...new Set(products.flatMap(p => Object.keys(p.attributes)))];
      const differing = keys.filter(k => {
        const seen = products.map(p => JSON.stringify(p.attributes[k] ?? null));
        return new Set(seen).size > 1;
      });
      return { products, differing_attributes: differing };
    },

    async recommend_products(input) {
      const list = Array.isArray(input.recommendations) ? input.recommendations : [];
      if (!list.length) return { error: 'recommend_products needs at least one recommendation' };

      const shown: LiveProduct[] = [];
      for (const [i, r] of list.entries()) {
        const productId = await known(r.product_id);
        const variationId = r.variation_id ? asVariationId(r.variation_id) : null;
        const facts = await live(productId, variationId);

        /* The moment the platform can point at later. */
        const recommendationId = ctx.ids.recommendation();
        await ctx.ledger.recordRecommendation({
          recommendationId,
          sessionId: ctx.sessionId,
          productId,
          variationId,
          position: i + 1,
          reason: String(r.reason ?? '').slice(0, 500),
          at: new Date()
        });
        recommended.set(`${productId}|${variationId ?? ''}`, recommendationId);
        shown.push({ ...facts, why: [String(r.reason ?? '')] });
      }
      return { recommended: shown, recorded: shown.length };
    },

    async create_cart() {
      if (cart) return { cart_id: cart, note: 'this conversation already has a cart' };
      const created = await ctx.adapter.createCart();
      cart = created.id;
      await ctx.ledger.recordCart({
        cartId: created.id,
        sessionId: ctx.sessionId,
        createdAt: new Date(),
        lines: []
      });
      return { cart_id: created.id, lines: [], subtotal: format(created.subtotal) };
    },

    async add_to_cart(input) {
      if (!cart) return { error: 'call create_cart first' };
      const productId = await known(input.product_id);
      const variationId = input.variation_id ? asVariationId(input.variation_id) : null;
      const quantity = Math.max(1, Math.min(Number(input.quantity) || 1, 20));

      /* Never add something that is not there. */
      const inv = await ctx.adapter.checkInventory(productId, variationId);
      if (!inv.inStock) {
        return { error: 'out of stock', product_id: productId, variation_id: variationId ?? undefined };
      }

      const updated = await ctx.adapter.addToCart(cart, productId, variationId, quantity);
      await ctx.ledger.addCartLine(cart, {
        productId,
        variationId,
        quantity,
        fromRecommendationId: (recommended.get(`${productId}|${variationId ?? ''}`)
          ?? recommended.get(`${productId}|`) ?? null) as any
      });
      return {
        cart_id: cart,
        added: { product_id: productId, variation_id: variationId ?? undefined, quantity },
        subtotal: format(updated.subtotal)
      };
    },

    async create_checkout() {
      if (!cart) return { error: 'there is no cart to check out' };
      const checkout = await ctx.adapter.createCheckout(cart);
      return { cart_id: cart, checkout_url: checkout.url };
    }
  };

  return {
    defs: TOOLS,
    calls,
    cartId: () => cart,

    async call(name, input) {
      if (!TOOL_NAMES.includes(name)) {
        /* Not a refusal: there is nothing here to refuse. */
        calls.push({ name, input, ok: false, at: new Date() });
        return { error: `no such tool: ${name}` };
      }
      try {
        const out = await handlers[name](input ?? {});
        calls.push({ name, input, ok: true, at: new Date() });
        return out;
      } catch (err) {
        calls.push({ name, input, ok: false, at: new Date() });
        if (err instanceof UnknownProduct) return { error: 'unknown product', detail: err.message };
        return { error: 'tool failed', detail: err instanceof Error ? err.message : String(err) };
      }
    }
  };
}

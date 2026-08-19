/* Concern two of three: catalog normalization.

   Everything platform shaped stops here. Above this file a product is a
   Product, whatever WooCommerce called it. */

import type { Product, Variation, OrderLine, Order } from '../../contract/adapter.ts';
import { fromDecimalString, money } from '../../contract/money.ts';
import { asProductId, asVariationId, asOrderId, asCartId, asMerchantId,
         type MerchantId } from '../../contract/ids.ts';
import { readAttribution } from './attribution.ts';

export interface WooProduct {
  id: number; sku: string; name: string; description: string; short_description?: string;
  permalink: string; price: string; stock_status: string; type: string;
  categories?: { name: string }[];
  attributes?: { name: string; options: string[] }[];
  images?: { src: string }[];
  variations?: number[];
}

export interface WooVariation {
  id: number; sku: string; price: string; stock_status: string; stock_quantity: number | null;
  attributes?: { name: string; option: string }[];
}

export interface WooOrder {
  id: number; currency: string; total: string; date_created_gmt: string;
  customer_id?: number; billing?: { email?: string };
  line_items?: { product_id: number; variation_id?: number; quantity: number; total: string }[];
  meta_data?: { key: string; value: string }[];
}

const strip = (html: string): string => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export function toProduct(raw: WooProduct, currency: string): Product {
  const attributes: Record<string, string[]> = {};
  for (const a of raw.attributes ?? []) attributes[a.name.toLowerCase()] = a.options;

  return {
    id: asProductId(String(raw.id)),
    sku: raw.sku || null,
    title: raw.name,
    description: strip(raw.description || raw.short_description || ''),
    url: raw.permalink,
    price: raw.price ? fromDecimalString(raw.price, currency) : money(0, currency),
    inStock: raw.stock_status === 'instock',
    categories: (raw.categories ?? []).map(c => c.name),
    attributes,
    hasVariations: raw.type === 'variable' || (raw.variations?.length ?? 0) > 0,
    imageUrl: raw.images?.[0]?.src ?? null
  };
}

export function toVariation(raw: WooVariation, productId: string, currency: string): Variation {
  const attributes: Record<string, string> = {};
  for (const a of raw.attributes ?? []) attributes[a.name.toLowerCase()] = a.option;

  return {
    id: asVariationId(String(raw.id)),
    productId: asProductId(productId),
    sku: raw.sku || null,
    title: Object.values(attributes).join(' · ') || raw.sku || String(raw.id),
    price: fromDecimalString(raw.price, currency),
    inStock: raw.stock_status === 'instock',
    stockQuantity: raw.stock_quantity ?? null,
    attributes
  };
}

export function toOrder(raw: WooOrder, merchantId: MerchantId): Order {
  const currency = raw.currency;
  const lines: OrderLine[] = (raw.line_items ?? []).map(l => ({
    productId: asProductId(String(l.product_id)),
    variationId: l.variation_id ? asVariationId(String(l.variation_id)) : null,
    quantity: l.quantity,
    lineTotal: fromDecimalString(l.total, currency)
  }));

  const attribution = readAttribution(raw.meta_data ?? []);

  return {
    id: asOrderId(String(raw.id)),
    merchantId: asMerchantId(merchantId),
    cartId: attribution?.cartId ?? null,
    /* The visitor reference an assisted claim would have to match on. */
    customerRef: raw.customer_id ? String(raw.customer_id) : (raw.billing?.email ?? null),
    placedAt: new Date(raw.date_created_gmt + 'Z'),
    total: fromDecimalString(raw.total, currency),
    currency,
    lines,
    attribution
  };
}

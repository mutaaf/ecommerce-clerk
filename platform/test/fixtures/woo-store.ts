/* A WooCommerce store, small enough to reason about, behind a fake fetch.
   It answers the REST shapes the adapter actually calls and keeps order
   meta the way Woo does, so the attribution round trip is exercised
   rather than mocked. */

import type { Fetch } from '../../src/adapters/woocommerce/client.ts';

export interface FakeStore {
  fetch: Fetch;
  orders: Map<number, any>;
  calls: string[];
  /* simulate a competing plugin wiping our order meta */
  dropMeta(orderId: number): void;
}

const PRODUCTS = [
  { id: 101, sku: 'RYSE-LOW', name: 'Ryse Court Low', description: '<p>Low cut indoor guard shoe.</p>',
    permalink: 'https://store.test/p/ryse-court-low', price: '104.00', stock_status: 'instock',
    type: 'variable', categories: [{ name: 'Basketball' }],
    attributes: [{ name: 'Width', options: ['Regular', 'Wide'] }, { name: 'Size', options: ['4', '5'] }],
    images: [{ src: 'https://store.test/i/ryse.jpg' }], variations: [1011, 1012] },
  { id: 102, sku: 'ANCHOR-2', name: 'Anchor Pro 2', description: 'High cut, more cushioning.',
    permalink: 'https://store.test/p/anchor-pro-2', price: '118.00', stock_status: 'instock',
    type: 'simple', categories: [{ name: 'Basketball' }], attributes: [], images: [] },
  { id: 103, sku: 'SOCK-3PK', name: 'Court Socks 3 pack', description: 'Socks.',
    permalink: 'https://store.test/p/socks', price: '14.00', stock_status: 'outofstock',
    type: 'simple', categories: [{ name: 'Accessories' }], attributes: [], images: [] }
];

const VARIATIONS: Record<number, any[]> = {
  101: [
    { id: 1011, sku: 'RYSE-LOW-4W', price: '104.00', stock_status: 'instock', stock_quantity: 6,
      attributes: [{ name: 'Width', option: 'Wide' }, { name: 'Size', option: '4' }] },
    { id: 1012, sku: 'RYSE-LOW-5R', price: '104.00', stock_status: 'outofstock', stock_quantity: 0,
      attributes: [{ name: 'Width', option: 'Regular' }, { name: 'Size', option: '5' }] }
  ]
};

export function fakeWooStore(seedOrders: any[] = []): FakeStore {
  const orders = new Map<number, any>(seedOrders.map(o => [o.id, structuredClone(o)]));
  const calls: string[] = [];

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  const store: FakeStore = {
    orders,
    calls,
    dropMeta(orderId) {
      const o = orders.get(orderId);
      if (o) o.meta_data = [];
    },
    async fetch(url, init = {}) {
      const u = new URL(url);
      const p = u.pathname;
      const method = init.method ?? 'GET';
      calls.push(`${method} ${p}`);

      if (!(init.headers as any)?.authorization) return json({ message: 'unauthorized' }, 401);

      /* catalog */
      if (p === '/wp-json/wc/v3/products' && method === 'GET') {
        const page = Number(u.searchParams.get('page') ?? 1);
        if (page > 1) return json([]);
        const search = (u.searchParams.get('search') ?? '').toLowerCase();
        const stock = u.searchParams.get('stock_status');
        let out = PRODUCTS;
        if (search) out = out.filter(x => (x.name + ' ' + x.description).toLowerCase().includes(search));
        if (stock === 'instock') out = out.filter(x => x.stock_status === 'instock');
        const per = Number(u.searchParams.get('per_page') ?? 10);
        return json(out.slice(0, per));
      }
      let m = p.match(/^\/wp-json\/wc\/v3\/products\/(\d+)\/variations\/(\d+)$/);
      if (m) return json(VARIATIONS[Number(m[1])]?.find(v => v.id === Number(m[2])) ?? null);
      m = p.match(/^\/wp-json\/wc\/v3\/products\/(\d+)\/variations$/);
      if (m) return json(VARIATIONS[Number(m[1])] ?? []);
      m = p.match(/^\/wp-json\/wc\/v3\/products\/(\d+)$/);
      if (m) return json(PRODUCTS.find(x => x.id === Number(m![1])) ?? null);

      /* cart */
      if (p === '/wp-json/wc/store/v1/cart' && method === 'GET') {
        return json({ items: [], totals: { total_items: '0', currency_code: 'USD' } });
      }
      if (p === '/wp-json/wc/store/v1/cart/add-item' && method === 'POST') {
        const body = JSON.parse(String(init.body));
        return json({
          items: [{ id: body.id, quantity: body.quantity,
                    prices: { price: '10400' }, totals: { line_total: String(10400 * body.quantity) } }],
          totals: { total_items: String(10400 * body.quantity), currency_code: 'USD' }
        });
      }

      /* orders: meta_data is merged the way WooCommerce merges it */
      m = p.match(/^\/wp-json\/wc\/v3\/orders\/(\d+)$/);
      if (m) {
        const id = Number(m[1]);
        const order = orders.get(id);
        if (!order) return json(null);
        if (method === 'PUT') {
          const body = JSON.parse(String(init.body));
          const merged = [...(order.meta_data ?? [])];
          for (const row of body.meta_data ?? []) {
            const at = merged.findIndex(x => x.key === row.key);
            if (at >= 0) merged[at] = row; else merged.push(row);
          }
          order.meta_data = merged;
        }
        return json(order);
      }

      return json({ message: 'not found' }, 404);
    }
  };
  return store;
}

export const CREDENTIALS = {
  merchantId: 'mch_sideline',
  storeUrl: 'https://store.test',
  secrets: { consumerKey: 'ck_test', consumerSecret: 'cs_test', scopes: 'read:products,read:orders,write:order_meta' }
};

export function wooOrder(opts: {
  id: number;
  lines: { product_id: number; variation_id?: number; quantity: number; total: string }[];
  total: string;
  placedAt: string;
  customerRef?: string;
  meta?: { key: string; value: string }[];
}) {
  return {
    id: opts.id,
    currency: 'USD',
    total: opts.total,
    date_created_gmt: opts.placedAt,
    billing: { email: opts.customerRef ?? 'buyer@example.test' },
    line_items: opts.lines,
    meta_data: opts.meta ?? []
  };
}

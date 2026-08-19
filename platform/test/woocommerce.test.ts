/* The adapter's three concerns: auth, normalization, attribution persistence. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { META } from '../src/adapters/woocommerce/attribution.ts';
import { asProductId, asVariationId, asOrderId, asSessionId, asCartId, asRecommendationId } from '../src/contract/ids.ts';
import { format } from '../src/contract/money.ts';
import { fakeWooStore, CREDENTIALS, wooOrder } from './fixtures/woo-store.ts';

test('a Woo product normalizes into the common shape', async () => {
  const adapter = new WooCommerceAdapter(CREDENTIALS, fakeWooStore().fetch);
  const p = await adapter.getProduct(asProductId('101'));
  assert.ok(p);
  assert.equal(p.title, 'Ryse Court Low');
  assert.equal(p.sku, 'RYSE-LOW');
  assert.equal(format(p.price), '$104.00');
  assert.equal(p.inStock, true);
  assert.equal(p.hasVariations, true);
  assert.deepEqual([...p.categories], ['Basketball']);
  assert.deepEqual(p.attributes.width, ['Regular', 'Wide']);
  assert.equal(p.description, 'Low cut indoor guard shoe.', 'markup is stripped');
});

test('variations carry their own price and stock', async () => {
  const adapter = new WooCommerceAdapter(CREDENTIALS, fakeWooStore().fetch);
  const vs = await adapter.getVariations(asProductId('101'));
  assert.equal(vs.length, 2);
  const wide = vs.find(v => v.attributes.width === 'Wide')!;
  assert.equal(wide.inStock, true);
  assert.equal(wide.stockQuantity, 6);
  assert.equal(vs.find(v => v.attributes.size === '5')!.inStock, false);
});

test('stock and price are read from the store on every call, never recalled', async () => {
  const store = fakeWooStore();
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  await adapter.checkInventory(asProductId('101'), asVariationId('1011'));
  await adapter.getPrice(asProductId('101'), asVariationId('1011'));
  const reads = store.calls.filter(c => c.includes('/variations/1011'));
  assert.equal(reads.length, 2, 'two questions, two reads');
});

test('search can be held to what is actually in stock', async () => {
  const adapter = new WooCommerceAdapter(CREDENTIALS, fakeWooStore().fetch);
  const all = await adapter.searchProducts({ text: 'socks' });
  const live = await adapter.searchProducts({ text: 'socks', inStockOnly: true });
  assert.equal(all.length, 1);
  assert.equal(live.length, 0, 'an out of stock product is never put forward');
});

test('attribution is written as order meta and read back off the order', async () => {
  const store = fakeWooStore([wooOrder({
    id: 900, total: '104.00', placedAt: '2026-08-01T10:00:00',
    lines: [{ product_id: 101, variation_id: 1011, quantity: 1, total: '104.00' }]
  })]);
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);

  const written = {
    sessionId: asSessionId('ais_abc'),
    cartId: asCartId('wc_cart_1'),
    recommendationId: asRecommendationId('rec_1'),
    writtenAt: new Date('2026-08-01T09:59:00Z')
  };
  await adapter.writeAttribution(asOrderId('900'), written);

  const keys = store.orders.get(900).meta_data.map((m: any) => m.key);
  assert.deepEqual(keys.sort(), [META.cart, META.recommendation, META.session, META.writtenAt].sort());

  const order = await adapter.readOrder(asOrderId('900'));
  assert.ok(order);
  assert.equal(order.attribution?.sessionId, 'ais_abc');
  assert.equal(order.attribution?.cartId, 'wc_cart_1');
  assert.equal(order.cartId, 'wc_cart_1');
  assert.equal(format(order.total), '$104.00');
  assert.equal(order.lines.length, 1);
});

test('writing attribution twice does not duplicate the meta', async () => {
  const store = fakeWooStore([wooOrder({
    id: 901, total: '10.00', placedAt: '2026-08-01T10:00:00',
    lines: [{ product_id: 102, quantity: 1, total: '10.00' }]
  })]);
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  const a = { sessionId: asSessionId('ais_x'), cartId: null, recommendationId: null, writtenAt: new Date() };
  await adapter.writeAttribution(asOrderId('901'), a);
  await adapter.writeAttribution(asOrderId('901'), a);
  const sessionRows = store.orders.get(901).meta_data.filter((m: any) => m.key === META.session);
  assert.equal(sessionRows.length, 1);
});

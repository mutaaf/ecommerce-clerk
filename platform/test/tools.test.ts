/* The commerce tool layer. What it refuses matters more than what it does. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { createToolKit } from '../src/tools/registry.ts';
import { TOOLS, TOOL_NAMES } from '../src/tools/schema.ts';
import { FORBIDDEN_OPERATIONS } from '../src/contract/adapter.ts';
import { inMemoryCatalog } from '../src/catalog/store.ts';
import { syncCatalog } from '../src/catalog/sync.ts';
import { inMemoryLedger } from '../src/attribution/ledger.ts';
import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { prefixedIds, asMerchantId, asSessionId, asProductId } from '../src/contract/ids.ts';
import { money } from '../src/contract/money.ts';
import { fakeWooStore, CREDENTIALS } from './fixtures/woo-store.ts';

const MERCHANT = asMerchantId('mch_sideline');
const SESSION = asSessionId('ais_tools');

async function kit() {
  const store = fakeWooStore();
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  const catalog = inMemoryCatalog();
  const ledger = inMemoryLedger();
  await syncCatalog(adapter, catalog, MERCHANT);
  await ledger.openSession({
    sessionId: SESSION, merchantId: MERCHANT,
    conversationId: 'cnv_tools' as any, visitorRef: 'buyer@example.test',
    startedAt: new Date()
  });
  let n = 0;
  const tools = createToolKit({
    adapter, catalog, ledger, ids: prefixedIds(() => `t${++n}`),
    merchantId: MERCHANT, sessionId: SESSION, currency: 'USD'
  });
  return { tools, store, catalog, ledger, adapter };
}

/* ---------- what is not there ---------- */

test('the destructive operations are absent from the schema, not blocked in it', async () => {
  const text = JSON.stringify(TOOLS).toLowerCase();
  for (const op of FORBIDDEN_OPERATIONS) {
    const snake = op.replace(/([A-Z])/g, '_$1').toLowerCase();
    assert.ok(!TOOL_NAMES.includes(snake), `${snake} must not be a tool`);
    assert.ok(!text.includes(`"name":"${snake}"`), `${snake} must not appear in the schema`);
  }
});

test('every tool takes a closed input, so the model cannot smuggle a field', () => {
  for (const t of TOOLS) {
    assert.equal(t.input.additionalProperties, false, `${t.name} accepts unknown properties`);
    assert.equal(t.input.type, 'object');
  }
});

test('a tool that does not exist is answered, not attempted', async () => {
  const { tools, store } = await kit();
  const before = store.calls.length;
  const out: any = await tools.call('refund_order', { order_id: '900' });
  assert.match(out.error, /no such tool/);
  assert.equal(store.calls.length, before, 'the store was never asked');
});

test('a product this merchant does not carry is refused before the store is asked', async () => {
  const { tools, store } = await kit();
  const before = store.calls.length;
  const out: any = await tools.call('get_product', { product_id: '999999' });
  assert.equal(out.error, 'unknown product');
  assert.equal(store.calls.length, before, 'no request left the platform');
});

/* ---------- the invariant the whole thing rests on ---------- */

test('a stale catalog price is never what the customer is told', async () => {
  const { tools, catalog } = await kit();

  /* The shelf goes out of date, which is what shelves do. */
  const entry = (await catalog.get(MERCHANT, asProductId('101')))!;
  await catalog.upsert(MERCHANT, [{ ...entry.product, price: money(1, 'USD'), inStock: false }]);

  const out: any = await tools.call('get_product', { product_id: '101' });
  assert.equal(out.price, '$104.00', 'read from the store, not the shelf');
  assert.equal(out.in_stock, true);
  assert.ok(out.checked_at, 'and it says when it was read');
});

test('search ranks on the shelf but answers from the store', async () => {
  const { tools, catalog } = await kit();
  const entry = (await catalog.get(MERCHANT, asProductId('101')))!;
  await catalog.upsert(MERCHANT, [{ ...entry.product, price: money(1, 'USD') }]);

  const out: any = await tools.call('search_products', {
    query: 'indoor basketball shoes',
    signals: [{ key: 'width', value: 'wide' }],
    in_stock_only: true
  });
  assert.ok(out.results.length);
  assert.equal(out.results[0].product_id, '101');
  assert.equal(out.results[0].price, '$104.00', 'the live price, not the stale one');
  assert.ok(out.results[0].why.length, 'and why it ranked');
});

/* ---------- recommending is an act, and it is written down ---------- */

test('recommending records position and reason against the session', async () => {
  const { tools, ledger } = await kit();
  await tools.call('recommend_products', {
    recommendations: [
      { product_id: '101', variation_id: '1011', reason: 'wide fit, indoor outsole, inside the budget' },
      { product_id: '102', reason: 'more cushioning if he takes contact' }
    ]
  });

  const recs = await ledger.recommendationsForSession(SESSION);
  assert.equal(recs.length, 2);
  assert.deepEqual(recs.map(r => r.position).sort(), [1, 2]);
  const first = recs.find(r => r.position === 1)!;
  assert.equal(first.productId, '101');
  assert.equal(first.variationId, '1011');
  assert.match(first.reason, /wide fit/);
});

test('searching records nothing: only putting something forward counts', async () => {
  const { tools, ledger } = await kit();
  await tools.call('search_products', { query: 'basketball shoes' });
  assert.equal((await ledger.recommendationsForSession(SESSION)).length, 0);
});

/* ---------- carts, the only write ---------- */

test('a cart line remembers the recommendation that led to it', async () => {
  const { tools, ledger } = await kit();
  await tools.call('recommend_products', {
    recommendations: [{ product_id: '101', variation_id: '1011', reason: 'wide fit' }]
  });
  await tools.call('create_cart', {});
  await tools.call('add_to_cart', { product_id: '101', variation_id: '1011', quantity: 1 });

  const cart = await ledger.getCart(tools.cartId()!);
  assert.equal(cart?.lines.length, 1);
  assert.ok(cart!.lines[0].fromRecommendationId, 'the line points back at the reason');
});

test('adding something out of stock is refused', async () => {
  const { tools } = await kit();
  await tools.call('create_cart', {});
  const out: any = await tools.call('add_to_cart', { product_id: '103', quantity: 1 });
  assert.equal(out.error, 'out of stock');
});

test('adding before there is a cart is refused rather than guessed at', async () => {
  const { tools } = await kit();
  const out: any = await tools.call('add_to_cart', { product_id: '101', quantity: 1 });
  assert.match(out.error, /create_cart/);
});

test('checkout hands off to the merchant, it does not take a payment', async () => {
  const { tools } = await kit();
  await tools.call('create_cart', {});
  const out: any = await tools.call('create_checkout', {});
  assert.match(out.checkout_url, /^https:\/\/store\.test\/checkout/);
});

test('comparing says which attributes actually differ', async () => {
  const { tools } = await kit();
  const out: any = await tools.call('compare_products', { product_ids: ['101', '102'] });
  assert.equal(out.products.length, 2);
  assert.ok(Array.isArray(out.differing_attributes));
});

test('every call is logged with whether it worked', async () => {
  const { tools } = await kit();
  await tools.call('get_product', { product_id: '101' });
  await tools.call('get_product', { product_id: 'nope' });
  assert.deepEqual(tools.calls.map(c => c.ok), [true, false]);
});

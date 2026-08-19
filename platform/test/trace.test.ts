/* The whole point: from an order id and nothing else, get back to the
   session, the conversation and the reason a product was put forward.
   If this cannot be done, the order should not have been billed. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { inMemoryLedger } from '../src/attribution/ledger.ts';
import { FOUNDING_POLICY } from '../src/attribution/policy.ts';
import { traceOrder } from '../src/attribution/trace.ts';
import { reconcile } from '../src/attribution/reconcile.ts';
import { format } from '../src/contract/money.ts';
import { prefixedIds, asOrderId, asProductId, asVariationId, asCartId, asMerchantId } from '../src/contract/ids.ts';
import { fakeWooStore, CREDENTIALS, wooOrder } from './fixtures/woo-store.ts';
import { META } from '../src/adapters/woocommerce/attribution.ts';

const MERCHANT = asMerchantId('mch_sideline');
const SHOE = asProductId('101');
const WIDE = asVariationId('1011');
const CART = asCartId('wc_cart_live');
const PLACED = '2026-08-10T12:00:00';

/* One conversation, start to order, through the real adapter against the
   fake store. Returns everything a webhook would have. */
async function conversationToOrder(opts: { stampSurvives?: boolean } = {}) {
  let n = 0;
  const ids = prefixedIds(() => `t${++n}`);

  const store = fakeWooStore([wooOrder({
    id: 900,
    total: '104.00',
    placedAt: PLACED,
    lines: [{ product_id: 101, variation_id: 1011, quantity: 1, total: '104.00' }]
  })]);
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  const ledger = inMemoryLedger();

  /* intent */
  const sessionId = ids.session();
  const conversationId = ids.conversation();
  await ledger.openSession({
    sessionId, merchantId: MERCHANT, conversationId,
    visitorRef: 'buyer@example.test', startedAt: new Date('2026-08-10T11:40:00Z')
  });

  /* recommendation, with the reason recorded at the time */
  const recommendationId = ids.recommendation();
  await ledger.recordRecommendation({
    recommendationId, sessionId, productId: SHOE, variationId: WIDE, position: 1,
    reason: 'wide fit, indoor outsole, inside the stated budget',
    at: new Date('2026-08-10T11:45:00Z')
  });

  /* cart, carrying the session that created it */
  await ledger.recordCart({
    cartId: CART, sessionId, createdAt: new Date('2026-08-10T11:50:00Z'),
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: recommendationId }]
  });

  /* order: the adapter writes the trail onto the merchant's own record */
  await adapter.writeAttribution(asOrderId('900'), {
    sessionId, cartId: CART, recommendationId, writtenAt: new Date('2026-08-10T11:55:00Z')
  });
  if (opts.stampSurvives === false) store.dropMeta(900);

  return { adapter, ledger, store, sessionId, conversationId, recommendationId };
}

test('an order traces back to the session that produced it', async () => {
  const { adapter, ledger, sessionId, conversationId, recommendationId } = await conversationToOrder();

  const trace = await traceOrder(asOrderId('900'), adapter, ledger, FOUNDING_POLICY);
  assert.ok(trace, 'a billed order must be traceable');

  assert.equal(trace.decision.case, 'direct');
  assert.equal(trace.session?.sessionId, sessionId);
  assert.equal(trace.conversationId, conversationId);
  assert.equal(trace.cart?.cartId, CART);
  assert.equal(trace.recommendations[0].recommendationId, recommendationId);
  assert.match(trace.recommendations[0].reason, /wide fit/);
  assert.equal(format(trace.decision.attributed), '$104.00');
  assert.equal(format(trace.decision.fee), '$1.04');

  /* the chain, in the order it happened, is what the dashboard shows */
  assert.equal(trace.steps.length, 5);
  assert.match(trace.steps[0], /^intent · /);
  assert.match(trace.steps[1], /^conversation · /);
  assert.match(trace.steps[2], /^recommendation · .*position 1/);
  assert.match(trace.steps[3], /^cart · /);
  assert.match(trace.steps[4], /^order · .*direct$/);
});

test('the trail is on the merchant order record too, not only on ours', async () => {
  const { store, sessionId, recommendationId } = await conversationToOrder();
  const meta = Object.fromEntries(store.orders.get(900).meta_data.map((m: any) => [m.key, m.value]));
  assert.equal(meta[META.session], sessionId);
  assert.equal(meta[META.cart], CART);
  assert.equal(meta[META.recommendation], recommendationId);
});

test('the trace survives the merchant record losing its meta', async () => {
  const { adapter, ledger, sessionId } = await conversationToOrder({ stampSurvives: false });

  const order = await adapter.readOrder(asOrderId('900'));
  assert.equal(order?.attribution, null, 'the store no longer carries the trail');

  /* Reconciliation cannot see the cart on the order either, so this order
     falls to the assisted path: still traceable, still billed, and still
     labelled honestly rather than claimed as direct. */
  const trace = await traceOrder(asOrderId('900'), adapter, ledger, FOUNDING_POLICY);
  assert.ok(trace);
  assert.equal(trace.decision.case, 'assisted');
  assert.equal(trace.session?.sessionId, sessionId);
  assert.equal(format(trace.decision.attributed), '$104.00');
});

test('an order nobody had a conversation about traces to nothing and bills nothing', async () => {
  const store = fakeWooStore([wooOrder({
    id: 901, total: '14.00', placedAt: PLACED,
    lines: [{ product_id: 103, quantity: 1, total: '14.00' }]
  })]);
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  const trace = await traceOrder(asOrderId('901'), adapter, inMemoryLedger(), FOUNDING_POLICY);

  assert.ok(trace);
  assert.equal(trace.decision.case, 'unrelated');
  assert.equal(trace.session, null);
  assert.equal(trace.decision.fee.amount, 0);
});

test('reconciling the same order twice gives the same answer', async () => {
  const { adapter, ledger } = await conversationToOrder();
  const order = await adapter.readOrder(asOrderId('900'));
  const a = await reconcile(order!, ledger, FOUNDING_POLICY, new Date('2026-08-11T00:00:00Z'));
  const b = await reconcile(order!, ledger, FOUNDING_POLICY, new Date('2026-08-30T00:00:00Z'));
  assert.equal(a.case, b.case);
  assert.equal(a.attributed.amount, b.attributed.amount);
  assert.equal(a.fee.amount, b.fee.amount);
});

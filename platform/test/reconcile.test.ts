/* The three cases, kept apart, plus the two ways the two records can
   disagree. This is the invoice, so it is tested like one. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { reconcile, reconcileAndRecord } from '../src/attribution/reconcile.ts';
import { inMemoryLedger, type AttributionLedger } from '../src/attribution/ledger.ts';
import { FOUNDING_POLICY } from '../src/attribution/policy.ts';
import { invoiceFor } from '../src/attribution/invoice.ts';
import { format, money } from '../src/contract/money.ts';
import type { Order } from '../src/contract/adapter.ts';
import {
  asMerchantId, asSessionId, asConversationId, asRecommendationId,
  asCartId, asOrderId, asProductId, asVariationId
} from '../src/contract/ids.ts';

const MERCHANT = asMerchantId('mch_sideline');
const SESSION = asSessionId('ais_1');
const CART = asCartId('wc_cart_1');
const SHOE = asProductId('101');
const WIDE = asVariationId('1011');
const SOCKS = asProductId('103');
const PLACED = new Date('2026-08-10T12:00:00Z');

async function ledgerWithSession(visitorRef: string | null = 'buyer@example.test'): Promise<AttributionLedger> {
  const ledger = inMemoryLedger();
  await ledger.openSession({
    sessionId: SESSION, merchantId: MERCHANT, conversationId: asConversationId('cnv_1'),
    visitorRef, startedAt: new Date('2026-08-10T11:40:00Z')
  });
  await ledger.recordRecommendation({
    recommendationId: asRecommendationId('rec_1'), sessionId: SESSION,
    productId: SHOE, variationId: WIDE, position: 1,
    reason: 'wide fit, indoor outsole, under the stated budget',
    at: new Date('2026-08-10T11:45:00Z')
  });
  return ledger;
}

function order(over: Partial<Order> = {}): Order {
  return {
    id: asOrderId('900'), merchantId: MERCHANT, cartId: null, customerRef: 'buyer@example.test',
    placedAt: PLACED, total: money(10400, 'USD'), currency: 'USD',
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, lineTotal: money(10400, 'USD') }],
    attribution: null,
    ...over
  };
}

/* ---------- direct ---------- */

test('direct: the cart was created by the session', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({
    cartId: CART, sessionId: SESSION, createdAt: new Date('2026-08-10T11:50:00Z'),
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: asRecommendationId('rec_1') }]
  });

  const d = await reconcile(order({ cartId: CART }), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'direct');
  assert.equal(d.sessionId, SESSION);
  assert.equal(format(d.attributed), '$104.00');
  assert.equal(format(d.fee), '$1.04');
  assert.ok(d.evidence.some(e => e.code === 'ledger_cart_created_by_session'));
});

test('direct: a stamp the ledger agrees with is enough on its own', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({ cartId: CART, sessionId: SESSION, createdAt: PLACED,
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: null }] });

  /* the platform lost the cart link but the stamp survived */
  const d = await reconcile(order({
    cartId: null,
    attribution: { sessionId: SESSION, cartId: CART, recommendationId: null, writtenAt: PLACED }
  }), ledger, FOUNDING_POLICY);

  assert.equal(d.case, 'direct');
  assert.ok(d.evidence.some(e => e.code === 'order_stamp_matches_ledger'));
});

test('direct: the stamp is gone and we still bill, because the ledger has it', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({ cartId: CART, sessionId: SESSION, createdAt: PLACED,
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: null }] });

  /* what a competing app overwriting cart attributes looks like here */
  const d = await reconcile(order({ cartId: CART, attribution: null }), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'direct');
  assert.ok(d.evidence.some(e => e.code === 'order_stamp_missing_ledger_had_it'));
});

test('direct: only the lines the conversation put in the cart are billed', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({ cartId: CART, sessionId: SESSION, createdAt: PLACED,
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: asRecommendationId('rec_1') }] });

  const d = await reconcile(order({
    cartId: CART,
    total: money(11800, 'USD'),
    lines: [
      { productId: SHOE, variationId: WIDE, quantity: 1, lineTotal: money(10400, 'USD') },
      { productId: SOCKS, variationId: null, quantity: 1, lineTotal: money(1400, 'USD') }
    ]
  }), ledger, FOUNDING_POLICY);

  assert.equal(d.case, 'direct');
  assert.equal(format(d.orderTotal), '$118.00');
  assert.equal(format(d.attributed), '$104.00', 'the socks were added outside the conversation');
  assert.equal(format(d.fee), '$1.04');
});

/* ---------- assisted ---------- */

test('assisted: recommended, then bought the normal way inside the window', async () => {
  const ledger = await ledgerWithSession();
  const d = await reconcile(order(), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'assisted');
  assert.equal(d.sessionId, SESSION);
  assert.equal(format(d.attributed), '$104.00');
  assert.ok(d.evidence.some(e => e.code === 'recommended_product_bought_in_window'));
});

test('assisted: outside the window it is not attributed, and says so', async () => {
  const ledger = await ledgerWithSession();
  const late = new Date(PLACED.getTime() + 5 * 24 * 3600_000);
  const d = await reconcile(order({ placedAt: late }), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'unrelated');
  assert.equal(d.attributed.amount, 0);
  assert.ok(d.evidence.some(e => e.code === 'recommended_product_bought_outside_window'));
});

test('assisted: with nothing to match the visitor on, we do not claim', async () => {
  const ledger = await ledgerWithSession(null);
  const d = await reconcile(order({ customerRef: null }), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'unrelated');
  assert.ok(d.evidence.some(e => e.code === 'no_visitor_reference_to_match_on'));
});

/* ---------- unrelated ---------- */

test('unrelated: a different product in a later session is not ours', async () => {
  const ledger = await ledgerWithSession();
  const d = await reconcile(order({
    lines: [{ productId: SOCKS, variationId: null, quantity: 1, lineTotal: money(1400, 'USD') }],
    total: money(1400, 'USD')
  }), ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'unrelated');
  assert.equal(d.attributed.amount, 0);
  assert.equal(d.fee.amount, 0);
});

test('unrelated: a stamp we cannot corroborate is never billed', async () => {
  const ledger = inMemoryLedger();   /* our side knows nothing about this session */
  const d = await reconcile(order({
    attribution: { sessionId: asSessionId('ais_ghost'), cartId: asCartId('wc_ghost'), recommendationId: null, writtenAt: PLACED }
  }), ledger, FOUNDING_POLICY);

  assert.equal(d.case, 'unrelated');
  assert.equal(d.fee.amount, 0);
  assert.ok(d.evidence.some(e => e.code === 'order_stamp_present_but_unknown_to_ledger'));
});

test('a session on another merchant cannot pull an order across', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({ cartId: CART, sessionId: SESSION, createdAt: PLACED,
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: null }] });
  const d = await reconcile(order({ cartId: CART, merchantId: asMerchantId('mch_someone_else'), customerRef: null }),
                            ledger, FOUNDING_POLICY);
  assert.equal(d.case, 'unrelated');
});

/* ---------- the three stay separable afterwards ---------- */

test('the invoice keeps direct and assisted apart', async () => {
  const ledger = await ledgerWithSession();
  await ledger.recordCart({ cartId: CART, sessionId: SESSION, createdAt: PLACED,
    lines: [{ productId: SHOE, variationId: WIDE, quantity: 1, fromRecommendationId: null }] });

  await reconcileAndRecord(order({ id: asOrderId('900'), cartId: CART }), ledger, FOUNDING_POLICY);
  await reconcileAndRecord(order({ id: asOrderId('901') }), ledger, FOUNDING_POLICY);
  await reconcileAndRecord(order({ id: asOrderId('902'),
    lines: [{ productId: SOCKS, variationId: null, quantity: 1, lineTotal: money(1400, 'USD') }] }),
    ledger, FOUNDING_POLICY);

  const decisions = await Promise.all(['900', '901', '902'].map(id => ledger.decisionFor(asOrderId(id))));
  const invoice = invoiceFor(MERCHANT, decisions.filter(Boolean) as any, 'USD', FOUNDING_POLICY);

  assert.equal(invoice.direct.orders, 1);
  assert.equal(invoice.assisted.orders, 1);
  assert.equal(invoice.unrelated.orders, 1);
  assert.equal(format(invoice.attributed), '$208.00');
  assert.equal(format(invoice.fee), '$2.08');
});

test('the fee always rounds in the merchant favour', () => {
  const invoice = invoiceFor(MERCHANT, [
    { orderId: asOrderId('1'), merchantId: MERCHANT, case: 'direct', sessionId: SESSION,
      attributed: money(9999, 'USD'), fee: money(99, 'USD'), decidedAt: PLACED }
  ], 'USD', FOUNDING_POLICY);
  assert.equal(format(invoice.attributed), '$99.99');
  assert.equal(format(invoice.fee), '$0.99', 'not a cent more than one percent');
});

/* The whole loop, on a provider that cannot surprise us.

   A customer says one sentence, the agent works the catalog through the
   tool layer, a cart appears on the merchant store, the order lands, and
   the invoice line can be walked back to the sentence. That chain is the
   product, so it is tested as one thing rather than five. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ShoppingConversation } from '../src/agent/service.ts';
import { scriptedProvider, callTools, say } from '../src/agent/scripted.ts';
import { createToolKit } from '../src/tools/registry.ts';
import { TOOL_NAMES } from '../src/tools/schema.ts';
import { inMemoryCatalog } from '../src/catalog/store.ts';
import { syncCatalog } from '../src/catalog/sync.ts';
import { inMemoryLedger } from '../src/attribution/ledger.ts';
import { reconcileAndRecord } from '../src/attribution/reconcile.ts';
import { traceOrder } from '../src/attribution/trace.ts';
import { invoiceFor } from '../src/attribution/invoice.ts';
import { FOUNDING_POLICY } from '../src/attribution/policy.ts';
import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { prefixedIds, asMerchantId, asSessionId, asConversationId, asOrderId } from '../src/contract/ids.ts';
import { format } from '../src/contract/money.ts';
import { fakeWooStore, CREDENTIALS, wooOrder } from './fixtures/woo-store.ts';

const MERCHANT = asMerchantId('mch_sideline');
const SENTENCE = "My son just joined a competitive team. He's 9, plays point guard indoors, has wide feet, and I need to stay under $120.";

const BRIEF = {
  storeName: 'Sideline Sports Co.',
  whatTheySell: 'basketball and court sports kit',
  houseStyle: 'Never put a child in a shoe with no room to grow.'
};

/* What a good turn looks like: find, put forward with a reason, build the
   cart, hand it over. The provider is told to do exactly this so the test
   is about the platform, not about the model. */
const GOOD_TURN = [
  callTools('Let me see what is in his size.',
    { name: 'search_products', input: {
        query: 'indoor basketball shoes for a young point guard',
        signals: [{ key: 'width', value: 'wide' }],
        max_price: '120.00', in_stock_only: true } }),
  callTools('',
    { name: 'get_variations', input: { product_id: '101' } }),
  callTools('',
    { name: 'recommend_products', input: { recommendations: [
        { product_id: '101', variation_id: '1011', reason: 'wide fit in his size, indoor outsole, and it leaves room to grow' }
      ] } }),
  callTools('',
    { name: 'create_cart', input: {} }),
  callTools('',
    { name: 'add_to_cart', input: { product_id: '101', variation_id: '1011', quantity: 1 } }),
  callTools('',
    { name: 'create_checkout', input: {} }),
  say('The Ryse Court Low in a youth 4 wide is the one. Lightest of the three and cut for a guard changing direction. It is in your cart.')
];

async function conversation(script = GOOD_TURN) {
  const store = fakeWooStore([wooOrder({
    id: 900, total: '104.00', placedAt: '2026-08-19T12:00:00',
    lines: [{ product_id: 101, variation_id: 1011, quantity: 1, total: '104.00' }]
  })]);
  const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
  const catalog = inMemoryCatalog();
  const ledger = inMemoryLedger();
  await syncCatalog(adapter, catalog, MERCHANT);

  let n = 0;
  const ids = prefixedIds(() => `c${++n}`);
  const sessionId = asSessionId('ais_live');
  const tools = createToolKit({
    adapter, catalog, ledger, ids, merchantId: MERCHANT, sessionId, currency: 'USD'
  });
  const provider = scriptedProvider(script);

  const chat = new ShoppingConversation({
    provider, tools, ledger, merchantId: MERCHANT, sessionId,
    conversationId: asConversationId('cnv_live'),
    visitorRef: 'buyer@example.test',
    brief: BRIEF
  });

  return { chat, tools, ledger, adapter, store, provider, sessionId };
}

test('one sentence produces a cart on the merchant store', async () => {
  const { chat, tools } = await conversation();
  const turn = await chat.say(SENTENCE);

  assert.match(turn.reply, /Ryse Court Low/);
  assert.ok(turn.cartId, 'a real cart exists');
  assert.equal(turn.hitRoundLimit, false);
  assert.deepEqual(
    turn.toolCalls.map(c => c.name),
    ['search_products', 'get_variations', 'recommend_products', 'create_cart', 'add_to_cart', 'create_checkout']
  );
});

test('the provider is only ever offered the commerce verbs', async () => {
  const { chat, provider } = await conversation();
  await chat.say(SENTENCE);
  for (const request of provider.seen) {
    for (const t of request.tools) assert.ok(TOOL_NAMES.includes(t.name), `${t.name} is not a commerce verb`);
  }
  assert.deepEqual([...provider.seen[0].tools].map(t => t.name), [...TOOL_NAMES]);
});

test('the merchant’s own words reach the model', async () => {
  const { chat, provider } = await conversation();
  await chat.say(SENTENCE);
  assert.match(provider.seen[0].system, /Sideline Sports Co\./);
  assert.match(provider.seen[0].system, /room to grow/);
  assert.match(provider.seen[0].system, /Never state a price/);
});

test('the order that follows is direct, and the fee is one percent of it', async () => {
  const { chat, tools, ledger, adapter, sessionId } = await conversation();
  await chat.say(SENTENCE);

  /* The customer checks out on the merchant's own checkout, and the trail
     is written onto their order record. */
  await adapter.writeAttribution(asOrderId('900'), {
    sessionId, cartId: tools.cartId()!, recommendationId: null, writtenAt: new Date()
  });

  const order = await adapter.readOrder(asOrderId('900'));
  const decision = await reconcileAndRecord(order!, ledger, FOUNDING_POLICY);

  assert.equal(decision.case, 'direct');
  assert.equal(decision.sessionId, sessionId);
  assert.equal(format(decision.attributed), '$104.00');
  assert.equal(format(decision.fee), '$1.04');
});

test('and the invoice line walks back to the sentence that caused it', async () => {
  const { chat, tools, ledger, adapter, sessionId } = await conversation();
  await chat.say(SENTENCE);
  await adapter.writeAttribution(asOrderId('900'), {
    sessionId, cartId: tools.cartId()!, recommendationId: null, writtenAt: new Date()
  });

  const recorded = await reconcileAndRecord(
    (await adapter.readOrder(asOrderId('900')))!, ledger, FOUNDING_POLICY);
  assert.equal(recorded.case, 'direct');

  const trace = await traceOrder(asOrderId('900'), adapter, ledger, FOUNDING_POLICY);
  assert.ok(trace);
  assert.equal(trace.decision.case, 'direct');
  assert.equal(trace.session?.sessionId, sessionId);
  assert.equal(trace.recommendations.length, 1);
  assert.match(trace.recommendations[0].reason, /room to grow/);
  assert.match(trace.steps[2], /position 1/);

  const invoice = invoiceFor(MERCHANT, [(await ledger.decisionFor(asOrderId('900')))!].filter(Boolean) as any, 'USD', FOUNDING_POLICY);
  assert.equal(invoice.direct.orders, 1);
  assert.equal(format(invoice.fee), '$1.04');
});

test('a conversation that will not settle is cut off and answered anyway', async () => {
  const spin = Array.from({ length: 20 }, () =>
    callTools('', { name: 'search_products', input: { query: 'shoes' } }));
  const { chat } = await conversation(spin);

  const turn = await chat.say(SENTENCE);
  assert.equal(turn.hitRoundLimit, true);
  assert.equal(turn.rounds, 8, 'it stops at the limit rather than looping');
  assert.ok(turn.reply.length, 'and it still says something rather than nothing');
});

test('a model that asks for a tool that does not exist gets told so and carries on', async () => {
  const { chat, ledger } = await conversation([
    callTools('', { name: 'issue_refund', input: { order_id: '900' } }),
    say('I cannot do refunds, but I can help you pick.')
  ]);
  const turn = await chat.say('refund my order');
  assert.match(turn.reply, /cannot do refunds/);
  assert.equal((await ledger.recommendationsForSession(asSessionId('ais_live'))).length, 0);
});

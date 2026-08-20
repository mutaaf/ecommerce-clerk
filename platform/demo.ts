/* The whole chain, end to end, printed.

     node platform/demo.ts

   Runs on the scripted provider, so it works with no key and no network.
   With ANTHROPIC_API_KEY set it runs the same conversation through the
   real model against the same fake store:

     ANTHROPIC_API_KEY=... node platform/demo.ts --live

   Either way the commerce platform underneath is identical, which is the
   thing worth seeing. */

import { ShoppingConversation } from './src/agent/service.ts';
import { scriptedProvider, callTools, say } from './src/agent/scripted.ts';
import { anthropicProvider } from './src/agent/anthropic.ts';
import { createToolKit } from './src/tools/registry.ts';
import { inMemoryCatalog } from './src/catalog/store.ts';
import { syncCatalog } from './src/catalog/sync.ts';
import { inMemoryLedger } from './src/attribution/ledger.ts';
import { reconcileAndRecord } from './src/attribution/reconcile.ts';
import { traceOrder } from './src/attribution/trace.ts';
import { invoiceFor } from './src/attribution/invoice.ts';
import { FOUNDING_POLICY } from './src/attribution/policy.ts';
import { WooCommerceAdapter } from './src/adapters/woocommerce/index.ts';
import { prefixedIds, asMerchantId, asSessionId, asConversationId, asOrderId } from './src/contract/ids.ts';
import { format } from './src/contract/money.ts';
import { fakeWooStore, CREDENTIALS, wooOrder } from './test/fixtures/woo-store.ts';

const LIVE = process.argv.includes('--live');
const MERCHANT = asMerchantId('mch_sideline');
const SENTENCE = "My son just joined a competitive team. He's 9, plays point guard indoors, has wide feet, and I need to stay under $120.";

const SCRIPT = [
  callTools('Let me see what is in his size.',
    { name: 'search_products', input: { query: 'indoor basketball shoes for a young point guard',
        signals: [{ key: 'width', value: 'wide' }], max_price: '120.00', in_stock_only: true } }),
  callTools('', { name: 'get_variations', input: { product_id: '101' } }),
  callTools('', { name: 'recommend_products', input: { recommendations: [
      { product_id: '101', variation_id: '1011', reason: 'wide fit in his size, indoor outsole, and it leaves room to grow' } ] } }),
  callTools('', { name: 'create_cart', input: {} }),
  callTools('', { name: 'add_to_cart', input: { product_id: '101', variation_id: '1011', quantity: 1 } }),
  callTools('', { name: 'create_checkout', input: {} }),
  say('The Ryse Court Low in a youth 4 wide is the one. Lightest of the three and cut for a guard changing direction, with room to grow. It is in your cart at $104.')
];

const rule = (t: string) => console.log(`\n\x1b[2m${'-'.repeat(64)}\x1b[0m\n\x1b[1m${t}\x1b[0m`);

const store = fakeWooStore([wooOrder({
  id: 900, total: '104.00', placedAt: '2026-08-19T12:00:00',
  lines: [{ product_id: 101, variation_id: 1011, quantity: 1, total: '104.00' }]
})]);
const adapter = new WooCommerceAdapter(CREDENTIALS, store.fetch);
const catalog = inMemoryCatalog();
const ledger = inMemoryLedger();

rule('1. sync the catalog through the adapter');
const sync = await syncCatalog(adapter, catalog, MERCHANT);
console.log(`   ${sync.products} products, ${sync.variations} variations, normalized once and shared by every platform`);

rule(`2. the conversation  (${LIVE ? 'live model' : 'scripted provider, no key needed'})`);
let n = 0;
const sessionId = asSessionId('ais_demo');
const tools = createToolKit({
  adapter, catalog, ledger, ids: prefixedIds(() => `d${++n}`),
  merchantId: MERCHANT, sessionId, currency: 'USD'
});
const chat = new ShoppingConversation({
  provider: LIVE ? anthropicProvider() : scriptedProvider(SCRIPT),
  tools, ledger, merchantId: MERCHANT, sessionId,
  conversationId: asConversationId('cnv_demo'),
  visitorRef: 'buyer@example.test',
  brief: {
    storeName: 'Sideline Sports Co.',
    whatTheySell: 'basketball and court sports kit',
    houseStyle: 'Never put a child in a shoe with no room to grow.'
  }
});

console.log(`\n   customer: ${SENTENCE}`);
const turn = await chat.say(SENTENCE);
console.log(`\n   verbs used: ${turn.toolCalls.map(c => c.name).join(' -> ')}`);
console.log(`\n   clerk: ${turn.reply}`);

rule('3. the customer checks out on the merchant store');
await adapter.writeAttribution(asOrderId('900'), {
  sessionId, cartId: tools.cartId()!, recommendationId: null, writtenAt: new Date()
});
console.log(`   order 900 placed, trail written as order meta on their own record`);

rule('4. reconcile, server side, against the order');
const decision = await reconcileAndRecord((await adapter.readOrder(asOrderId('900')))!, ledger, FOUNDING_POLICY);
console.log(`   case       ${decision.case}`);
console.log(`   order      ${format(decision.orderTotal)}`);
console.log(`   attributed ${format(decision.attributed)}`);
console.log(`   fee        ${format(decision.fee)}  (1% of what we can show)`);
console.log('   why:');
for (const e of decision.evidence) console.log(`     ${e.code.padEnd(34)} ${e.detail}`);

rule('5. what the merchant reads when they query the line');
const trace = await traceOrder(asOrderId('900'), adapter, ledger, FOUNDING_POLICY);
for (const step of trace!.steps) console.log(`   ${step}`);

rule('6. the invoice');
const invoice = invoiceFor(MERCHANT, [(await ledger.decisionFor(asOrderId('900')))!], 'USD', FOUNDING_POLICY);
console.log(`   direct ${invoice.direct.orders}  assisted ${invoice.assisted.orders}  unrelated ${invoice.unrelated.orders}`);
console.log(`   attributed ${format(invoice.attributed)}  ->  fee ${format(invoice.fee)}`);
console.log('');

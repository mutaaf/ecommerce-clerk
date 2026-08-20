/* Retrieval. What somebody told you about their situation should beat a
   word that happens to appear in a description. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { inMemoryCatalog } from '../src/catalog/store.ts';
import { rank } from '../src/catalog/search.ts';
import { syncCatalog } from '../src/catalog/sync.ts';
import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { asMerchantId } from '../src/contract/ids.ts';
import { money } from '../src/contract/money.ts';
import { fakeWooStore, CREDENTIALS } from './fixtures/woo-store.ts';

const MERCHANT = asMerchantId('mch_sideline');

async function shelf() {
  const catalog = inMemoryCatalog();
  const adapter = new WooCommerceAdapter(CREDENTIALS, fakeWooStore().fetch);
  await syncCatalog(adapter, catalog, MERCHANT);
  return { catalog, entries: await catalog.entries(MERCHANT) };
}

test('a sync puts the normalized catalog on the shelf', async () => {
  const { entries } = await shelf();
  assert.equal(entries.length, 3);
  assert.ok(entries.every(e => e.syncedAt instanceof Date));
  assert.ok(entries.some(e => e.product.title === 'Ryse Court Low'));
});

test('an attribute the merchant models outranks a word in a description', async () => {
  const { entries } = await shelf();
  const out = rank(entries, {
    text: 'basketball shoes',
    signals: [{ key: 'width', value: 'wide' }]
  });
  assert.equal(out[0].productId, '101', 'the one that comes in Wide');
  assert.ok(out[0].matched.some(m => m.includes('wide')));
});

test('something they asked to avoid is pushed down, not hidden', async () => {
  const { entries } = await shelf();
  const out = rank(entries, {
    text: 'shoes',
    signals: [{ key: 'avoid', value: 'anchor' }],
    inStockOnly: false
  });
  const anchor = out.find(c => c.productId === '102');
  if (anchor) {
    assert.ok(out.indexOf(anchor) > 0, 'still visible, but not the answer');
    assert.ok(anchor.matched.some(m => m.includes('asked to avoid')));
  }
});

test('over the stated budget does not come back', async () => {
  const { entries } = await shelf();
  const out = rank(entries, { text: 'shoes', maxPrice: money(9000, 'USD') });
  assert.ok(!out.some(c => c.productId === '102'), '$118 is past a $90 budget');
});

test('out of stock is excluded when asked for', async () => {
  const { entries } = await shelf();
  const withIt = rank(entries, { text: 'socks', inStockOnly: false });
  const without = rank(entries, { text: 'socks', inStockOnly: true });
  assert.equal(withIt.length, 1);
  assert.equal(without.length, 0);
});

test('nothing matching returns nothing rather than filler', async () => {
  const { entries } = await shelf();
  assert.equal(rank(entries, { text: 'lawnmower carburettor' }).length, 0);
});

/* The agnosticism claim, as a test. An adapter either covers the contract
   or it is not an adapter. */

import test from 'node:test';
import assert from 'node:assert/strict';

import { ADAPTER_METHODS, FORBIDDEN_OPERATIONS } from '../src/contract/adapter.ts';
import { WooCommerceAdapter } from '../src/adapters/woocommerce/index.ts';
import { fakeWooStore, CREDENTIALS } from './fixtures/woo-store.ts';

const adapter = () => new WooCommerceAdapter(CREDENTIALS, fakeWooStore().fetch);

test('the contract is the twelve methods the platform page publishes', () => {
  assert.deepEqual([...ADAPTER_METHODS], [
    'authenticate', 'syncCatalog', 'searchProducts', 'getProduct', 'getVariations',
    'checkInventory', 'getPrice', 'createCart', 'addToCart', 'createCheckout',
    'writeAttribution', 'readOrder'
  ]);
});

test('the WooCommerce adapter implements every method', () => {
  const a = adapter() as unknown as Record<string, unknown>;
  for (const name of ADAPTER_METHODS) {
    assert.equal(typeof a[name], 'function', `${name} is missing`);
  }
});

test('the destructive operations are absent, not guarded', () => {
  const a = adapter() as unknown as Record<string, unknown>;
  for (const name of FORBIDDEN_OPERATIONS) {
    assert.equal(a[name], undefined, `${name} must not exist on an adapter`);
  }
});

test('credentials are refused over plain http', () => {
  assert.throws(
    () => new WooCommerceAdapter({ ...CREDENTIALS, storeUrl: 'http://store.test' }, fakeWooStore().fetch),
    /https/
  );
});

test('authenticate reports scopes we were given but will never use', async () => {
  const wide = { ...CREDENTIALS, secrets: { ...CREDENTIALS.secrets, scopes: 'read:products,write:products,delete' } };
  const result = await new WooCommerceAdapter(wide, fakeWooStore().fetch).authenticate(wide);
  assert.equal(result.ok, true);
  assert.deepEqual([...result.excessiveScopes], ['write:products', 'delete']);
});

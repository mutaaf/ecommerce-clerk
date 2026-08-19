/* Concern one of three: authentication and credential scoping.

   WooCommerce issues a consumer key and secret per integration. We ask for
   read on the catalog and read_write only on orders, because attribution
   is written as order meta. Fetch is injected so the adapter is testable
   without a store and so a service can wrap it in its own retry policy. */

import type { Credentials, AuthResult } from '../../contract/adapter.ts';
import { asMerchantId } from '../../contract/ids.ts';

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/* What we ask WooCommerce for, and what we will never use even if a
   merchant hands us a wider key by mistake. */
export const REQUIRED_SCOPES = ['read:products', 'read:orders', 'write:order_meta'] as const;
export const NEVER_USED_SCOPES = ['write:products', 'write:customers', 'write:settings', 'delete'] as const;

export class WooCommerceError extends Error {
  readonly status: number;
  readonly path: string;
  constructor(status: number, path: string, message: string) {
    super(`woocommerce ${status} on ${path}: ${message}`);
    this.name = 'WooCommerceError';
    this.status = status;
    this.path = path;
  }
}

export class WooClient {
  readonly #base: string;
  readonly #auth: string;
  readonly #fetch: Fetch;

  constructor(credentials: Credentials, fetchImpl: Fetch = fetch) {
    const { storeUrl, secrets } = credentials;
    if (!secrets.consumerKey || !secrets.consumerSecret) {
      throw new Error('woocommerce needs consumerKey and consumerSecret');
    }
    if (!/^https:\/\//.test(storeUrl) && !/^http:\/\/(localhost|127\.)/.test(storeUrl)) {
      throw new Error('woocommerce credentials must be sent over https');
    }
    this.#base = storeUrl.replace(/\/$/, '');
    this.#auth = 'Basic ' + Buffer.from(`${secrets.consumerKey}:${secrets.consumerSecret}`).toString('base64');
    this.#fetch = fetchImpl;
  }

  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(this.#base + path);
    for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
    return this.#send<T>(url.toString(), { method: 'GET' }, path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.#send<T>(this.#base + path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }, path);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.#send<T>(this.#base + path, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }, path);
  }

  async #send<T>(url: string, init: RequestInit, path: string): Promise<T> {
    const res = await this.#fetch(url, {
      ...init,
      headers: { ...(init.headers as Record<string, string> | undefined), authorization: this.#auth }
    });
    if (!res.ok) throw new WooCommerceError(res.status, path, await res.text().catch(() => ''));
    return res.json() as Promise<T>;
  }
}

export async function authenticate(client: WooClient, credentials: Credentials): Promise<AuthResult> {
  /* One cheap read proves the key works and that it can see the catalog. */
  await client.get('/wp-json/wc/v3/products', { per_page: 1 });
  const granted = (credentials.secrets.scopes ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return {
    merchantId: asMerchantId(credentials.merchantId),
    ok: true,
    scopes: granted.length ? granted : [...REQUIRED_SCOPES],
    excessiveScopes: granted.filter(s => (NEVER_USED_SCOPES as readonly string[]).includes(s))
  };
}

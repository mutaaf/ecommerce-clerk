/* Concern three of three: how attribution is persisted on WooCommerce.

   Woo keeps arbitrary key value pairs on the order record as order meta,
   so this is the straightforward case: write the ids onto the order, read
   them back off it. The adapter forms no opinion about what they mean.
   Deciding whether an order counts is reconcile.ts, one layer up, and it
   treats what comes back from here as a claim to be corroborated rather
   than as the answer. */

import type { PersistedAttribution } from '../../contract/adapter.ts';
import { asSessionId, asCartId, asRecommendationId } from '../../contract/ids.ts';

/* Namespaced with a leading underscore so WooCommerce keeps it out of the
   customer facing order view. */
export const META = {
  session: '_clerk_ai_session_id',
  cart: '_clerk_cart_id',
  recommendation: '_clerk_recommendation_id',
  writtenAt: '_clerk_attributed_at'
} as const;

export interface WooMeta { key: string; value: string }

export function toMeta(a: PersistedAttribution): WooMeta[] {
  const rows: WooMeta[] = [
    { key: META.session, value: a.sessionId },
    { key: META.writtenAt, value: a.writtenAt.toISOString() }
  ];
  if (a.cartId) rows.push({ key: META.cart, value: a.cartId });
  if (a.recommendationId) rows.push({ key: META.recommendation, value: a.recommendationId });
  return rows;
}

export function readAttribution(meta: readonly WooMeta[]): PersistedAttribution | null {
  const at = (key: string) => meta.find(m => m.key === key)?.value;
  const session = at(META.session);
  if (!session) return null;

  const written = at(META.writtenAt);
  return {
    sessionId: asSessionId(session),
    cartId: at(META.cart) ? asCartId(at(META.cart)!) : null,
    recommendationId: at(META.recommendation) ? asRecommendationId(at(META.recommendation)!) : null,
    writtenAt: written ? new Date(written) : new Date(0)
  };
}

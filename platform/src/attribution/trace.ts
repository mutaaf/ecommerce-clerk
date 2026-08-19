/* Walking a billed order back to the conversation that produced it.

   This is the merchant facing side of attribution: open any line on the
   invoice and read what happened. It starts from an order id and nothing
   else, which is the test: if a trace cannot be built from the order
   alone, the order should not have been billed. */

import type { CommerceAdapter, Order } from '../contract/adapter.ts';
import type { OrderId, SessionId, ConversationId } from '../contract/ids.ts';
import type { AttributionLedger, SessionRecord, RecommendationRecord, CartRecord } from './ledger.ts';
import type { AttributionPolicy } from './policy.ts';
import { reconcile, type AttributionDecision } from './reconcile.ts';

export interface Trace {
  readonly order: Order;
  readonly decision: AttributionDecision;
  readonly session: SessionRecord | null;
  readonly conversationId: ConversationId | null;
  readonly cart: CartRecord | null;
  readonly recommendations: readonly RecommendationRecord[];
  /* The chain in the order it happened, for the dashboard. */
  readonly steps: readonly string[];
}

export async function traceOrder(
  orderId: OrderId,
  adapter: CommerceAdapter,
  ledger: AttributionLedger,
  policy: AttributionPolicy,
  now: Date = new Date()
): Promise<Trace | null> {
  const order = await adapter.readOrder(orderId);
  if (!order) return null;

  const decision = await reconcile(order, ledger, policy, now);
  const sessionId: SessionId | null = decision.sessionId;
  const session = sessionId ? await ledger.getSession(sessionId) : null;
  const cart = order.cartId ? await ledger.getCart(order.cartId) : null;
  const recommendations = sessionId ? await ledger.recommendationsForSession(sessionId) : [];

  const steps: string[] = [];
  if (session) {
    steps.push(`intent · session ${session.sessionId} opened ${session.startedAt.toISOString()}`);
    steps.push(`conversation · ${session.conversationId}`);
  }
  for (const r of recommendations) {
    steps.push(`recommendation · ${r.recommendationId} put ${r.productId} at position ${r.position}: ${r.reason}`);
  }
  if (cart) steps.push(`cart · ${cart.cartId} created by ${cart.sessionId} with ${cart.lines.length} line(s)`);
  steps.push(`order · ${order.id} placed ${order.placedAt.toISOString()}, ${decision.case}`);

  return {
    order,
    decision,
    session,
    conversationId: session?.conversationId ?? null,
    cart,
    recommendations,
    steps
  };
}

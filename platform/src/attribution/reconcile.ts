/* RECONCILIATION

   This is the first thing in the platform because it is the business
   model. It runs server side against the order webhook, and it decides,
   for one order, which of the three cases applies and how much of that
   order we may bill for.

   It has two sources and trusts neither on its own:

     the order      read back through the adapter, carrying whatever
                    attribution survived on the merchant's platform
     the ledger     our own record of what the session actually did

   Where they disagree, the ledger wins for claiming and the order wins for
   not claiming. That asymmetry is the whole point:

     stamp missing, ledger has the cart   -> still direct. Cart attributes
                                             are known to get dropped, and
                                             the merchant should not lose
                                             the record because an app
                                             overwrote a field.
     stamp present, ledger knows nothing  -> not attributed. We cannot show
                                             a merchant the conversation,
                                             so we do not bill for it.

   No adapter is imported here. Reconciliation is written once and is the
   same on WooCommerce, Shopify, Magento and anything else. */

import type { Order, OrderLine } from '../contract/adapter.ts';
import type { MerchantId, SessionId, OrderId, RecommendationId } from '../contract/ids.ts';
import { type Money, zero, sum, share } from '../contract/money.ts';
import { type AttributionCase, type Evidence, evidence, isBillable } from './cases.ts';
import { type AttributionPolicy, windowStart } from './policy.ts';
import type { AttributionLedger, CartRecord, RecommendationRecord } from './ledger.ts';

export interface AttributedLine {
  readonly line: OrderLine;
  readonly recommendationId: RecommendationId | null;
  readonly attributed: boolean;
}

export interface AttributionDecision {
  readonly orderId: OrderId;
  readonly merchantId: MerchantId;
  readonly case: AttributionCase;
  readonly sessionId: SessionId | null;
  readonly lines: readonly AttributedLine[];
  readonly attributed: Money;      /* only the lines we can point at */
  readonly orderTotal: Money;
  readonly fee: Money;
  readonly evidence: readonly Evidence[];
  readonly policy: AttributionPolicy;
  readonly decidedAt: Date;
}

const sameItem = (a: { productId: string; variationId: string | null },
                  b: { productId: string; variationId: string | null }): boolean =>
  a.productId === b.productId && (a.variationId ?? null) === (b.variationId ?? null);

export async function reconcile(
  order: Order,
  ledger: AttributionLedger,
  policy: AttributionPolicy,
  now: Date = new Date()
): Promise<AttributionDecision> {
  const trail: Evidence[] = [];

  /* ---- 1. did a session create this cart? ---------------------------- */
  const cart = await findSessionCart(order, ledger, trail);

  if (cart) {
    const session = await ledger.getSession(cart.sessionId);
    if (session && session.merchantId === order.merchantId) {
      return direct(order, cart, policy, trail, now);
    }
    trail.push(evidence('no_session_activity_for_this_order',
      `cart ${cart.cartId} belongs to a session on another merchant`));
  }

  /* ---- 2. was something we recommended bought inside the window? ----- */
  const assistedBy = await findAssistingRecommendations(order, ledger, policy, trail);
  if (assistedBy.length) {
    return assisted(order, assistedBy, policy, trail, now);
  }

  /* ---- 3. otherwise it is not ours ----------------------------------- */
  return unrelated(order, policy, trail, now);
}

/* ---------- step one: cart provenance ---------- */

async function findSessionCart(
  order: Order, ledger: AttributionLedger, trail: Evidence[]
): Promise<CartRecord | null> {
  /* The cart the platform says produced the order. */
  if (order.cartId) {
    const cart = await ledger.getCart(order.cartId);
    if (cart) {
      trail.push(evidence('ledger_cart_created_by_session',
        `cart ${order.cartId} was created by session ${cart.sessionId}`));
      if (!order.attribution) {
        trail.push(evidence('order_stamp_missing_ledger_had_it',
          'the order carried no attribution, the ledger did: reconciled from our own record'));
      }
      return cart;
    }
  }

  /* The stamp on the order, corroborated against the ledger. */
  const stamped = order.attribution;
  if (stamped) {
    const cart = stamped.cartId ? await ledger.getCart(stamped.cartId) : null;
    if (cart) {
      trail.push(evidence('order_stamp_matches_ledger',
        `order stamp names cart ${stamped.cartId}, ledger agrees it came from session ${cart.sessionId}`));
      return cart;
    }
    const session = await ledger.getSession(stamped.sessionId);
    if (!session) {
      trail.push(evidence('order_stamp_present_but_unknown_to_ledger',
        `order names session ${stamped.sessionId}, which this platform never opened: not attributed`));
    }
  }
  return null;
}

/* ---------- step two: assisted ---------- */

async function findAssistingRecommendations(
  order: Order, ledger: AttributionLedger, policy: AttributionPolicy, trail: Evidence[]
): Promise<readonly RecommendationRecord[]> {
  if (!order.customerRef) {
    trail.push(evidence('no_visitor_reference_to_match_on',
      'the order carries no visitor reference, so an assisted claim cannot be proved'));
    return [];
  }

  const from = windowStart(order.placedAt, policy);
  const inWindow = await ledger.recommendationsForVisitor(
    order.merchantId, order.customerRef, from, order.placedAt);

  const bought = inWindow.filter(r => order.lines.some(l => sameItem(l, r)));
  if (bought.length) {
    trail.push(evidence('recommended_product_bought_in_window',
      `${bought.length} recommended item(s) bought within ${policy.assistedWindowHours}h`));
    return bought;
  }

  /* Say out loud when a match existed but fell outside the window: the
     merchant sees the same thing we do. */
  const older = await ledger.recommendationsForVisitor(
    order.merchantId, order.customerRef, new Date(0), from);
  if (older.some(r => order.lines.some(l => sameItem(l, r)))) {
    trail.push(evidence('recommended_product_bought_outside_window',
      `recommended earlier than ${policy.assistedWindowHours}h before the order: not attributed`));
  } else {
    trail.push(evidence('no_session_activity_for_this_order',
      'no recommendation to this visitor matches anything in this order'));
  }
  return [];
}

/* ---------- the three outcomes ---------- */

function direct(
  order: Order, cart: CartRecord, policy: AttributionPolicy, trail: Evidence[], now: Date
): AttributionDecision {
  const lines = order.lines.map(line => {
    const fromCart = cart.lines.find(c => sameItem(line, c));
    if (fromCart) {
      trail.push(evidence('line_matched_session_cart',
        `${line.productId} was put in the cart by session ${cart.sessionId}`));
      return { line, recommendationId: fromCart.fromRecommendationId, attributed: true };
    }
    trail.push(evidence('line_not_attributed',
      `${line.productId} was added outside the conversation`));
    return { line, recommendationId: null, attributed: false };
  });
  return settle(order, 'direct', cart.sessionId, lines, policy, trail, now);
}

function assisted(
  order: Order, recs: readonly RecommendationRecord[],
  policy: AttributionPolicy, trail: Evidence[], now: Date
): AttributionDecision {
  const lines = order.lines.map(line => {
    const rec = recs.find(r => sameItem(line, r));
    if (rec) {
      trail.push(evidence('line_matched_recommendation',
        `${line.productId} was recommended as ${rec.recommendationId}: ${rec.reason}`));
      return { line, recommendationId: rec.recommendationId, attributed: true };
    }
    trail.push(evidence('line_not_attributed', `${line.productId} was never recommended`));
    return { line, recommendationId: null, attributed: false };
  });
  return settle(order, 'assisted', recs[0].sessionId, lines, policy, trail, now);
}

function unrelated(
  order: Order, policy: AttributionPolicy, trail: Evidence[], now: Date
): AttributionDecision {
  const lines = order.lines.map(line => ({ line, recommendationId: null, attributed: false }));
  return settle(order, 'unrelated', null, lines, policy, trail, now);
}

function settle(
  order: Order, kind: AttributionCase, sessionId: SessionId | null,
  lines: readonly AttributedLine[], policy: AttributionPolicy,
  trail: readonly Evidence[], now: Date
): AttributionDecision {
  /* Only the lines we can point at, never the order total. A merchant who
     adds a battery at checkout did not buy the battery from us. */
  const attributed = isBillable(kind)
    ? sum(lines.filter(l => l.attributed).map(l => l.line.lineTotal), order.currency)
    : zero(order.currency);

  return {
    orderId: order.id,
    merchantId: order.merchantId,
    case: kind,
    sessionId,
    lines,
    attributed,
    orderTotal: order.total,
    fee: share(attributed, policy.takeRate),
    evidence: trail,
    policy,
    decidedAt: now
  };
}

/* Reconcile and write the decision down, which is what the order webhook
   calls. Kept separate so the decision itself stays a pure function of its
   inputs and is trivial to test. */
export async function reconcileAndRecord(
  order: Order, ledger: AttributionLedger, policy: AttributionPolicy, now: Date = new Date()
): Promise<AttributionDecision> {
  const decision = await reconcile(order, ledger, policy, now);
  await ledger.recordDecision({
    orderId: decision.orderId,
    merchantId: decision.merchantId,
    case: decision.case,
    sessionId: decision.sessionId,
    attributed: decision.attributed,
    fee: decision.fee,
    decidedAt: decision.decidedAt
  });
  return decision;
}

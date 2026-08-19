/* Our own record of what a session did.

   This is the half of attribution the store cannot lose. Order meta and
   cart attributes are written on the merchant's platform and can be
   dropped there: WooCommerce order meta is reliable, Shopify cart
   attributes are known to vanish, sometimes because a competing app
   overwrites them. The ledger is written on our side at the moment each
   thing happens, and reconciliation checks the two against each other.

   The interface is a port. In production it is Postgres; the in memory
   implementation below is what the tests run against. */

import type {
  MerchantId, SessionId, ConversationId, RecommendationId, CartId, OrderId, ProductId, VariationId
} from '../contract/ids.ts';
import type { AttributionCase } from './cases.ts';
import type { Money } from '../contract/money.ts';

export interface SessionRecord {
  readonly sessionId: SessionId;
  readonly merchantId: MerchantId;
  readonly conversationId: ConversationId;
  /* However the storefront identifies this visitor before they are a
     customer: a first party cookie, a logged in id. Assisted attribution
     is only possible when this is present on both sides. */
  readonly visitorRef: string | null;
  readonly startedAt: Date;
}

export interface RecommendationRecord {
  readonly recommendationId: RecommendationId;
  readonly sessionId: SessionId;
  readonly productId: ProductId;
  readonly variationId: VariationId | null;
  readonly position: number;
  readonly reason: string;          /* why it was put forward, kept for the audit trail */
  readonly at: Date;
}

export interface CartLineRecord {
  readonly productId: ProductId;
  readonly variationId: VariationId | null;
  readonly quantity: number;
  readonly fromRecommendationId: RecommendationId | null;
}

export interface CartRecord {
  readonly cartId: CartId;
  readonly sessionId: SessionId;
  readonly createdAt: Date;
  readonly lines: readonly CartLineRecord[];
}

export interface DecisionRecord {
  readonly orderId: OrderId;
  readonly merchantId: MerchantId;
  readonly case: AttributionCase;
  readonly sessionId: SessionId | null;
  readonly attributed: Money;
  readonly fee: Money;
  readonly decidedAt: Date;
}

export interface AttributionLedger {
  openSession(record: SessionRecord): Promise<void>;
  recordRecommendation(record: RecommendationRecord): Promise<void>;
  recordCart(record: CartRecord): Promise<void>;
  addCartLine(cartId: CartId, line: CartLineRecord): Promise<void>;

  getSession(sessionId: SessionId): Promise<SessionRecord | null>;
  getCart(cartId: CartId): Promise<CartRecord | null>;
  getRecommendation(id: RecommendationId): Promise<RecommendationRecord | null>;
  recommendationsForSession(sessionId: SessionId): Promise<readonly RecommendationRecord[]>;
  /* Every recommendation made to this visitor, on this merchant, in the
     window. The only lookup assisted attribution is allowed to make. */
  recommendationsForVisitor(merchantId: MerchantId, visitorRef: string, since: Date, until: Date): Promise<readonly RecommendationRecord[]>;

  recordDecision(record: DecisionRecord): Promise<void>;
  decisionFor(orderId: OrderId): Promise<DecisionRecord | null>;
}

export function inMemoryLedger(): AttributionLedger {
  const sessions = new Map<string, SessionRecord>();
  const carts = new Map<string, CartRecord>();
  const recs = new Map<string, RecommendationRecord>();
  const decisions = new Map<string, DecisionRecord>();

  return {
    async openSession(r) { sessions.set(r.sessionId, r); },
    async recordRecommendation(r) { recs.set(r.recommendationId, r); },
    async recordCart(r) { carts.set(r.cartId, r); },
    async addCartLine(cartId, line) {
      const cart = carts.get(cartId);
      if (!cart) throw new Error(`no cart ${cartId} in the ledger`);
      carts.set(cartId, { ...cart, lines: [...cart.lines, line] });
    },

    async getSession(id) { return sessions.get(id) ?? null; },
    async getCart(id) { return carts.get(id) ?? null; },
    async getRecommendation(id) { return recs.get(id) ?? null; },
    async recommendationsForSession(id) {
      return [...recs.values()].filter(r => r.sessionId === id);
    },
    async recommendationsForVisitor(merchantId, visitorRef, since, until) {
      const theirs = new Set(
        [...sessions.values()]
          .filter(s => s.merchantId === merchantId && s.visitorRef != null && s.visitorRef === visitorRef)
          .map(s => s.sessionId as string)
      );
      return [...recs.values()]
        .filter(r => theirs.has(r.sessionId) && r.at >= since && r.at <= until)
        .sort((a, b) => a.at.getTime() - b.at.getTime());
    },

    async recordDecision(r) { decisions.set(r.orderId, r); },
    async decisionFor(id) { return decisions.get(id) ?? null; }
  };
}

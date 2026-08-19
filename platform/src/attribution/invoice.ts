/* The invoice is a sum over decisions, with direct and assisted kept
   apart so a merchant can accept one and query the other. */

import { type Money, zero, add, share } from '../contract/money.ts';
import type { MerchantId } from '../contract/ids.ts';
import type { DecisionRecord } from './ledger.ts';
import type { AttributionPolicy } from './policy.ts';

export interface Invoice {
  readonly merchantId: MerchantId;
  readonly currency: string;
  readonly direct: { orders: number; attributed: Money };
  readonly assisted: { orders: number; attributed: Money };
  readonly unrelated: { orders: number };
  readonly attributed: Money;
  readonly fee: Money;
  readonly takeRate: number;
}

export function invoiceFor(
  merchantId: MerchantId,
  decisions: readonly DecisionRecord[],
  currency: string,
  policy: AttributionPolicy
): Invoice {
  const mine = decisions.filter(d => d.merchantId === merchantId);
  const bucket = (kind: DecisionRecord['case']) => {
    const rows = mine.filter(d => d.case === kind);
    return { orders: rows.length, attributed: rows.reduce((t, r) => add(t, r.attributed), zero(currency)) };
  };

  const direct = bucket('direct');
  const assisted = bucket('assisted');
  const attributed = add(direct.attributed, assisted.attributed);

  return {
    merchantId,
    currency,
    direct,
    assisted,
    unrelated: { orders: mine.filter(d => d.case === 'unrelated').length },
    attributed,
    /* Charged on the sum, not per order, so rounding never favours us. */
    fee: share(attributed, policy.takeRate),
    takeRate: policy.takeRate
  };
}

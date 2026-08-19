/* The three cases, kept apart on purpose.

   direct     the cart was created by the session. Unambiguous.
   assisted   no session cart, but the customer bought something the agent
              had put in front of them, inside a stated window. Reported
              separately so a merchant can judge it themselves.
   unrelated  not attributed. Includes everything we cannot prove, which
              is deliberate: under claim rather than send an invoice a
              merchant can argue with.

   These are three values of one field, never a boolean and a footnote. A
   dashboard that cannot separate them cannot be audited. */

export type AttributionCase = 'direct' | 'assisted' | 'unrelated';

export const ATTRIBUTION_CASES: readonly AttributionCase[] = ['direct', 'assisted', 'unrelated'];

/* Only these two are billed. Kept as data so the invoice and the dashboard
   read the same rule. */
export const BILLABLE_CASES: readonly AttributionCase[] = ['direct', 'assisted'];

export const isBillable = (c: AttributionCase): boolean => BILLABLE_CASES.includes(c);

/* Why a decision came out the way it did, in the order the checks ran.
   This is what a merchant reads when they query a line on the invoice. */
export type EvidenceCode =
  | 'ledger_cart_created_by_session'
  | 'order_stamp_matches_ledger'
  | 'order_stamp_present_but_unknown_to_ledger'
  | 'order_stamp_missing_ledger_had_it'
  | 'recommended_product_bought_in_window'
  | 'recommended_product_bought_outside_window'
  | 'no_visitor_reference_to_match_on'
  | 'no_session_activity_for_this_order'
  | 'line_matched_session_cart'
  | 'line_matched_recommendation'
  | 'line_not_attributed';

export interface Evidence {
  readonly code: EvidenceCode;
  readonly detail: string;
}

export const evidence = (code: EvidenceCode, detail: string): Evidence => ({ code, detail });

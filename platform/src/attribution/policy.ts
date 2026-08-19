/* The rules that decide an invoice, written down in one place because they
   decide an invoice. Changing one is a commercial decision, not a tweak. */

export interface AttributionPolicy {
  /* How long after a recommendation a purchase can still count as assisted. */
  readonly assistedWindowHours: number;
  /* Share of attributed revenue we bill. */
  readonly takeRate: number;
  /* Attribute an order stamp we cannot corroborate against our own ledger?
     No. It stays false. It exists so the choice is visible rather than
     buried in a branch. */
  readonly trustUncorroboratedOrderStamp: boolean;
}

export const FOUNDING_POLICY: AttributionPolicy = {
  assistedWindowHours: 72,
  takeRate: 0.01,
  trustUncorroboratedOrderStamp: false
};

export const windowStart = (placedAt: Date, policy: AttributionPolicy): Date =>
  new Date(placedAt.getTime() - policy.assistedWindowHours * 3600_000);

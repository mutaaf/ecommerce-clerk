/* Money is integer minor units and a currency, never a float. Attribution
   is the invoice, so a rounding error here is a billing error. */

export interface Money {
  readonly amount: number;      /* minor units: 12345 is $123.45 */
  readonly currency: string;    /* ISO 4217 */
}

export function money(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) throw new TypeError(`money amount must be minor units, got ${amount}`);
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError(`money currency must be ISO 4217, got ${currency}`);
  return { amount, currency };
}

export const zero = (currency: string): Money => money(0, currency);

export function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new TypeError(`cannot add ${a.currency} to ${b.currency}`);
  return money(a.amount + b.amount, a.currency);
}

export const sum = (parts: readonly Money[], currency: string): Money =>
  parts.reduce(add, zero(currency));

/* Fees round down, so the merchant is never billed for a fraction we
   cannot show them. */
export function share(of: Money, rate: number): Money {
  if (!(rate >= 0 && rate <= 1)) throw new RangeError(`rate must be between 0 and 1, got ${rate}`);
  return money(Math.floor(of.amount * rate), of.currency);
}

export const format = (m: Money): string =>
  (m.amount / 100).toLocaleString('en-US', { style: 'currency', currency: m.currency });

/* Parse the decimal strings commerce platforms send over the wire. */
export function fromDecimalString(value: string, currency: string): Money {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new TypeError(`not a decimal amount: ${value}`);
  return money(Math.round(n * 100), currency);
}

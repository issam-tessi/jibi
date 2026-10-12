// Money is stored as integer minor units of the account currency (amount_cents column):
// millimes for TND (1 DT = 1000), cents for EUR/USD (1 = 100). Formatting happens only at the edge.

export const DEFAULT_CURRENCY = 'TND';
const LOCALE = 'fr-TN';

/** Number of decimal places the currency uses (TND -> 3, EUR -> 2). */
export function minorDigits(currency: string) {
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
}

/** e.g. 1234500 millimes -> "1 234,500 DT"; whole amounts drop the decimals -> "1 234 DT". */
export function formatMoney(minor: number, currency = DEFAULT_CURRENCY) {
  const digits = minorDigits(currency);
  const factor = 10 ** digits;
  const whole = minor % factor === 0;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: whole ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(minor / factor);
}

/** Parses user input like "12", "12.5", "12,750" into positive minor units. Returns null if invalid. */
export function parseAmount(input: string, currency = DEFAULT_CURRENCY): number | null {
  const digits = minorDigits(currency);
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!new RegExp(`^\\d+(\\.\\d{1,${digits}})?$`).test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
  return minor > 0 && Number.isSafeInteger(minor) ? minor : null;
}

/** Placeholder for amount inputs, e.g. "0,000" for TND. */
export function amountPlaceholder(currency = DEFAULT_CURRENCY) {
  return `0,${'0'.repeat(minorDigits(currency))}`;
}

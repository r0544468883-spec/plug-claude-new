export const EXCHANGE_RATES: Record<string, number> = {
  USD: 3.6,
  EUR: 3.9,
  ILS: 1,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  ILS: '₪',
};

export function formatSalaryAmount(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  if (amount >= 1000) {
    const k = amount / 1000;
    return k % 1 === 0 ? `${symbol}${k}K` : `${symbol}${k.toFixed(1)}K`;
  }
  return `${symbol}${amount.toLocaleString()}`;
}

export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null
): string | null {
  if (!min && !max) return null;
  const cur = currency || 'ILS';
  const per = period || 'monthly';
  const suffix = per === 'yearly' ? '/yr' : '/mo';

  if (min && max) {
    return `${formatSalaryAmount(min, cur)}-${formatSalaryAmount(max, cur)}${suffix}`;
  }
  if (min) return `${formatSalaryAmount(min, cur)}+${suffix}`;
  if (max) return `${formatSalaryAmount(max, cur)}${suffix}`;
  return null;
}

export function convertToILS(amount: number, currency: string): number {
  return Math.round(amount * (EXCHANGE_RATES[currency] || 1));
}

export function monthlyEquivalent(amount: number, period: string): number {
  return period === 'yearly' ? Math.round(amount / 12) : amount;
}

export function getILSFootnote(
  min: number | null,
  max: number | null,
  currency: string | null,
  period: string | null
): string | null {
  if (!currency || currency === 'ILS') return null;
  if (!min && !max) return null;

  const per = period || 'monthly';
  const monthlyMin = min ? monthlyEquivalent(convertToILS(min, currency), per) : null;
  const monthlyMax = max ? monthlyEquivalent(convertToILS(max, currency), per) : null;

  if (monthlyMin && monthlyMax) {
    return `≈ ₪${monthlyMin.toLocaleString()}-₪${monthlyMax.toLocaleString()} לחודש`;
  }
  if (monthlyMin) return `≈ ₪${monthlyMin.toLocaleString()}+ לחודש`;
  if (monthlyMax) return `≈ ₪${monthlyMax.toLocaleString()} לחודש`;
  return null;
}

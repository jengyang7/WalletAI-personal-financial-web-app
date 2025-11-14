export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'];

export function getCurrencySymbol(code?: string): string {
  const currency = code || 'USD';
  try {
    return (0).toLocaleString(undefined, { style: 'currency', currency })
      .replace(/0(?:\.00)?/,'').trim();
  } catch {
    // Fallback map for a few common currencies
    const map: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      SGD: 'S$',
      MYR: 'RM'
    };
    return map[currency] || '$';
  }
}

export function getCurrencyFormatter(code?: string) {
  const currency = code || 'USD';
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency });
  } catch {
    formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });
  }
  return (amount: number) => formatter.format(amount);
}








// Simple currency conversion rates (relative to USD)
// In production, you would fetch these from an API like exchangerate-api.com or fixer.io
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.50,
  CNY: 7.24,
  SGD: 1.34,
  MYR: 4.47,
};

/**
 * Convert amount from one currency to another
 * @param amount - The amount to convert
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string = 'USD',
  toCurrency: string = 'USD'
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  // Convert to USD first, then to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;

  return convertedAmount;
}

/**
 * Get the exchange rate between two currencies
 * @param fromCurrency - Source currency code
 * @param toCurrency - Target currency code
 * @returns Exchange rate
 */
export function getExchangeRate(
  fromCurrency: string = 'USD',
  toCurrency: string = 'USD'
): number {
  if (fromCurrency === toCurrency) {
    return 1;
  }

  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;

  return toRate / fromRate;
}

/**
 * Update exchange rates (for future API integration)
 * @param rates - Object with currency codes as keys and rates as values
 */
export function updateExchangeRates(rates: Record<string, number>): void {
  Object.assign(EXCHANGE_RATES, rates);
}



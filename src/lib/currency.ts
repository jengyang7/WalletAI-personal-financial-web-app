export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'MYR'];

// Localized currency symbol map
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CNY: '¥',
  SGD: 'S$',
  MYR: 'RM'
};

export function getCurrencySymbol(code?: string): string {
  const currency = code || 'USD';
  return CURRENCY_SYMBOLS[currency] || currency;
}

export function getCurrencyFormatter(code?: string) {
  const currency = code || 'USD';
  const symbol = getCurrencySymbol(currency);
  
  // Special handling for currencies with no decimal places
  const noDecimalCurrencies = ['JPY', 'CNY'];
  const decimals = noDecimalCurrencies.includes(currency) ? 0 : 2;
  
  return (amount: number) => {
    const formattedAmount = amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    // For currencies that typically put symbol after (like EUR in some locales), 
    // we'll keep symbol before for consistency
    return `${symbol} ${formattedAmount}`;
  };
}








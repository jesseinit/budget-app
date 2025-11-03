/**
 * Currency configuration and formatting utilities
 */

// Popular currencies with their symbols and locale codes
export const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', locale: 'en-US', name: 'US Dollar' },
  EUR: { symbol: '€', code: 'EUR', locale: 'en-IE', name: 'Euro' },
  GBP: { symbol: '£', code: 'GBP', locale: 'en-GB', name: 'British Pound' },
  NGN: { symbol: '₦', code: 'NGN', locale: 'en-NG', name: 'Nigerian Naira' },
  JPY: { symbol: '¥', code: 'JPY', locale: 'ja-JP', name: 'Japanese Yen' },
  CNY: { symbol: '¥', code: 'CNY', locale: 'zh-CN', name: 'Chinese Yuan' },
  INR: { symbol: '₹', code: 'INR', locale: 'en-IN', name: 'Indian Rupee' },
  CAD: { symbol: 'C$', code: 'CAD', locale: 'en-CA', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', code: 'AUD', locale: 'en-AU', name: 'Australian Dollar' },
  CHF: { symbol: 'Fr', code: 'CHF', locale: 'de-CH', name: 'Swiss Franc' },
};

/**
 * Get currency configuration
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'EUR')
 * @returns {Object} Currency configuration object
 */
export const getCurrencyConfig = (currencyCode = 'USD') => {
  return CURRENCIES[currencyCode.toUpperCase()] || CURRENCIES.USD;
};

/**
 * Format a number as currency
 * @param {number|string} value - The value to format
 * @param {string} currencyCode - Currency code (e.g., 'USD', 'EUR')
 * @param {Object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currencyCode = 'USD', options = {}) => {
  const num = parseFloat(value);
  const config = getCurrencyConfig(currencyCode);

  const defaultOptions = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };

  const formatOptions = {
    ...defaultOptions,
    ...options,
    style: 'currency',
    currency: config.code,
    currencyDisplay: 'symbol',
  };

  try {
    // Use en-US locale for EUR to ensure symbol is in front
    const locale = config.code === 'EUR' ? 'en-US' : config.locale;
    return new Intl.NumberFormat(locale, formatOptions).format(num);
  } catch (error) {
    // Fallback to USD if there's an error
    console.error(`Error formatting currency ${currencyCode}:`, error);
    return new Intl.NumberFormat('en-US', {
      ...formatOptions,
      currency: 'USD',
    }).format(num);
  }
};

/**
 * Format a number as currency with no decimals
 * @param {number|string} value - The value to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted currency string
 */
export const formatCurrencyShort = (value, currencyCode = 'USD') => {
  return formatCurrency(value, currencyCode, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Get currency symbol
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode = 'USD') => {
  const config = getCurrencyConfig(currencyCode);
  return config.symbol;
};

/**
 * Format percentage
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  return `${parseFloat(value).toFixed(decimals)}%`;
};

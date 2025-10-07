import { Currency } from '@bitpesa/shared-types';

/**
 * Format amount in satoshis to BTC
 */
export function formatSatsToBtc(sats: number): string {
  return (sats / 100000000).toFixed(8);
}

/**
 * Format amount in BTC to satoshis
 */
export function formatBtcToSats(btc: number): number {
  return Math.round(btc * 100000000);
}

/**
 * Format KES amount with proper currency symbol
 */
export function formatKesAmount(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format BTC amount with proper currency symbol
 */
export function formatBtcAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'BTC',
    minimumFractionDigits: 8,
    maximumFractionDigits: 8,
  }).format(amount);
}

/**
 * Format phone number to Kenyan format
 */
export function formatKenyaPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (digits.startsWith('254')) {
    return `+${digits}`;
  } else if (digits.startsWith('0')) {
    return `+254${digits.substring(1)}`;
  } else if (digits.length === 9) {
    return `+254${digits}`;
  }
  
  return phone; // Return original if can't format
}

/**
 * Format amount based on currency
 */
export function formatAmount(amount: number, currency: Currency): string {
  switch (currency) {
    case Currency.BTC:
      return formatBtcAmount(amount);
    case Currency.SATS:
      return `${amount.toLocaleString()} sats`;
    case Currency.KES:
      return formatKesAmount(amount);
    default:
      return amount.toString();
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date, locale: string = 'en-KE'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(date);
  }
}

/**
 * Format transaction ID for display
 */
export function formatTransactionId(id: string): string {
  return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
}

/**
 * Format payment hash for display
 */
export function formatPaymentHash(hash: string): string {
  return `${hash.substring(0, 12)}...${hash.substring(hash.length - 12)}`;
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  } else if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Format file size in bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format exchange rate for display
 */
export function formatExchangeRate(rate: number, fromCurrency: Currency, toCurrency: Currency): string {
  return `1 ${fromCurrency} = ${rate.toFixed(2)} ${toCurrency}`;
}

/**
 * Format wallet address for display (truncate middle)
 */
export function formatWalletAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (address.length <= startChars + endChars) {
    return address;
  }
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
}
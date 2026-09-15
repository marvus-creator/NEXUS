const EXPONENTS: Record<string, number> = {
  RWF: 0,
  UGX: 0,
  TZS: 0,
  BIF: 0,
  JPY: 0,
  KRW: 0,
  KES: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  ZAR: 2,
  NGN: 2,
  GHS: 2,
  CAD: 2,
  AUD: 2,
};

export const SUPPORTED_CURRENCIES = Object.keys(EXPONENTS);

export function exponentFor(currency: string) {
  const exponent = EXPONENTS[currency.toUpperCase()];

  if (exponent === undefined) {
    throw new Error(`Unsupported currency: ${currency}`);
  }

  return exponent;
}

export function isSupportedCurrency(currency: string) {
  return EXPONENTS[currency.toUpperCase()] !== undefined;
}

export function toMinor(amount: number, currency: string) {
  const factor = 10 ** exponentFor(currency);
  const minor = Math.round(amount * factor);

  if (!Number.isSafeInteger(minor)) {
    throw new Error('Amount is out of range');
  }

  return minor;
}

export function fromMinor(minor: number, currency: string) {
  return minor / 10 ** exponentFor(currency);
}

export function formatMoney(minor: number, currency: string, locale = 'en-RW') {
  const exponent = exponentFor(currency);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: exponent,
    maximumFractionDigits: exponent,
  }).format(fromMinor(minor, currency));
}

export function money(minor: number, currency: string) {
  return {
    minor,
    currency: currency.toUpperCase(),
    exponent: exponentFor(currency),
    display: formatMoney(minor, currency),
  };
}

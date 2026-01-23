export function formatStat(
  value: any,
  key: string = '',
  prefix: string = ''
): string {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (isNaN(numericValue)) return '-';

  const isPercentage = key.includes('%');

   if (isPercentage) {
    return `${numericValue.toFixed(1)}${prefix}`; // Keep 1 decimal for %
  }

  const absValue = Math.abs(numericValue);
  let formattedValue = '';
  let suffix = '';

  if (absValue >= 1e9) {
    formattedValue = Math.round(numericValue / 1e9).toString();
    suffix = 'B';
  } else if (absValue >= 1e6) {
    formattedValue = Math.round(numericValue / 1e6).toString();
    suffix = 'M';
  } else if (absValue >= 1e3) {
    formattedValue = Math.round(numericValue / 1e3).toString();
    suffix = 'K';
  } else {
    formattedValue = Math.round(numericValue).toString();
  }

  return `${prefix}${formattedValue}${suffix}`;
}

export function formatStatOneDecimal(
  value: any,
  key: string = '',
  prefix: string = ''
): string {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (isNaN(numericValue)) return '-';

  const isPercentage = key.includes('%');

  if (isPercentage) {
    return `${numericValue.toFixed(1)}${prefix}`; // Keep 1 decimal for %
  }

  const absValue = Math.abs(numericValue);
  let formattedValue = '';
  let suffix = '';

  if (absValue === 0) {
    return `${prefix}0`;
  } else if (absValue >= 1e9) {
    formattedValue = (numericValue / 1e9).toFixed(1);
    suffix = 'B';
  } else if (absValue >= 1e6) {
    formattedValue = (numericValue / 1e6).toFixed(1);
    suffix = 'M';
  } else if (absValue >= 1e3) {
    formattedValue = (numericValue / 1e3).toFixed(1);
    suffix = 'K';
  } else {
    formattedValue = (numericValue / 1e3).toFixed(1);
    suffix = 'K';
  }

  return `${prefix}${formattedValue}${suffix}`;
}



export function commaSeparatedValue(value: any): string {
  if (value === null || value === undefined || value === '') return '-';

  const numericValue = Number(value);
  if (isNaN(numericValue)) return '-';

  return numericValue.toLocaleString('en-US');
}

export function roundToNearestInteger(value: number): number {
  return Math.round(value);
}

export function formatDecimalWithCommas(value: number | string): string {
  const num = typeof value === 'number' ? value : parseFloat(value as string);
  if (isNaN(num)) return '-';

  // Always round to the nearest whole number and add commas
  return Math.round(num).toLocaleString('en-US');
}

export function oneDecimalWithCommas(value: number | string): string {
  const num = typeof value === 'number' ? value : parseFloat(value as string);
  if (isNaN(num)) return '-';

  return num.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}


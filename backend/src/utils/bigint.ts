/**
 * BigInt helpers shared by the results engine, tests, and API formatting.
 *
 * The contract uses OpenZeppelin `Math.sqrt` (floor of the integer square root)
 * and `Math.mulDiv` (floor of score * pool / totalScore). The functions below
 * implement exactly the same integer semantics with native BigInt, so the
 * backend can independently reproduce every number the contract commits to.
 */

export const WAD = 10n ** 18n;

export function toBigInt(value: string | number | bigint | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(`Cannot convert non-integer number to BigInt: ${value}`);
    }
    return BigInt(value);
  }
  const trimmed = value.trim();
  if (trimmed === '') return 0n;
  return BigInt(trimmed);
}

/** Floor integer square root (identical to OpenZeppelin Math.sqrt). */
export function isqrt(value: bigint): bigint {
  if (value < 0n) throw new RangeError('isqrt is undefined for negative values');
  if (value < 2n) return value;

  // Newton's method. The initial guess is above the root, and the sequence
  // decreases monotonically until it converges to floor(sqrt(value)).
  let x0 = value;
  let x1 = (x0 + 1n) >> 1n;
  while (x1 < x0) {
    x0 = x1;
    x1 = (x0 + value / x0) >> 1n;
  }
  return x0;
}

/** floor(score * pool / totalScore), matching Math.mulDiv on-chain. */
export function scaleToPool(score: bigint, pool: bigint, totalScore: bigint): bigint {
  if (score < 0n || pool < 0n || totalScore < 0n) {
    throw new RangeError('scaleToPool only accepts non-negative values');
  }
  if (totalScore === 0n) return 0n;
  return (score * pool) / totalScore;
}

export function sumBigInts(values: Iterable<bigint>): bigint {
  let total = 0n;
  for (const value of values) total += value;
  return total;
}

export function minBigInt(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Formats a wei value as a decimal string without floating point loss.
 * `maxFractionDigits` only truncates the display, never rounds up.
 */
export function formatUnits(value: bigint, decimals = 18, maxFractionDigits = 6): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = absolute / base;
  const fraction = absolute % base;

  let fractionText = fraction.toString().padStart(decimals, '0');
  if (maxFractionDigits < fractionText.length) {
    fractionText = fractionText.slice(0, maxFractionDigits);
  }
  fractionText = fractionText.replace(/0+$/, '');

  const sign = negative ? '-' : '';
  return fractionText.length > 0 ? `${sign}${whole}.${fractionText}` : `${sign}${whole}`;
}

/** Formats a wei value as ETH with a fixed display precision. */
export function formatEth(value: bigint, maxFractionDigits = 6): string {
  return formatUnits(value, 18, maxFractionDigits);
}

/** Percentage of `part` in `whole`, in basis points (floor). */
export function shareBps(part: bigint, whole: bigint): number {
  if (whole === 0n) return 0;
  return Number((part * 10_000n) / whole);
}

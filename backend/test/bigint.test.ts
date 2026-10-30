import { describe, expect, it } from 'vitest';
import {
  formatEth,
  formatUnits,
  isqrt,
  scaleToPool,
  shareBps,
  toBigInt,
} from '../src/utils/bigint.js';

const ONE_ETH = 10n ** 18n;

describe('isqrt', () => {
  it('matches the exact floor square root for small values', () => {
    const cases: Array<[bigint, bigint]> = [
      [0n, 0n],
      [1n, 1n],
      [2n, 1n],
      [3n, 1n],
      [4n, 2n],
      [8n, 2n],
      [9n, 3n],
      [15n, 3n],
      [16n, 4n],
      [99n, 9n],
      [100n, 10n],
    ];
    for (const [input, expected] of cases) {
      expect(isqrt(input)).toBe(expected);
    }
  });

  it('never rounds up and satisfies r^2 <= n < (r+1)^2', () => {
    for (let n = 0n; n < 2_000n; n++) {
      const root = isqrt(n);
      expect(root * root <= n).toBe(true);
      expect((root + 1n) * (root + 1n) > n).toBe(true);
    }
  });

  it('handles wei-scale values used by the contract', () => {
    expect(isqrt(10n ** 18n)).toBe(10n ** 9n);
    expect(isqrt(4n * 10n ** 18n)).toBe(2n * 10n ** 9n);
    expect(isqrt(9n * 10n ** 18n)).toBe(3n * 10n ** 9n);
  });

  it('rejects negative values', () => {
    expect(() => isqrt(-1n)).toThrow(RangeError);
  });
});

describe('scaleToPool', () => {
  it('floors exactly like Math.mulDiv', () => {
    expect(scaleToPool(1n, 10n, 3n)).toBe(3n);
    expect(scaleToPool(2n, 10n, 3n)).toBe(6n);
    expect(scaleToPool(10n, 10n, 3n)).toBe(33n);
    expect(scaleToPool(0n, 10n, 3n)).toBe(0n);
    expect(scaleToPool(5n, 10n, 0n)).toBe(0n);
  });

  it('never allocates more than the pool when scaling every score', () => {
    const scores = [7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n];
    const total = scores.reduce((sum, score) => sum + score, 0n);
    const pool = 1_000_000n;
    const allocated = scores.reduce(
      (sum, score) => sum + scaleToPool(score, pool, total),
      0n,
    );
    expect(allocated <= pool).toBe(true);
  });
});

describe('formatting and parsing', () => {
  it('formats wei without floating point loss', () => {
    expect(formatEth(ONE_ETH)).toBe('1');
    expect(formatEth(1_234_500_000_000_000_000n)).toBe('1.2345');
    expect(formatEth(1n)).toBe('0');
    expect(formatUnits(123_456n, 6, 3)).toBe('0.123');
  });

  it('parses decimal strings and integers', () => {
    expect(toBigInt('123')).toBe(123n);
    expect(toBigInt('  42 ')).toBe(42n);
    expect(toBigInt('')).toBe(0n);
    expect(toBigInt(null)).toBe(0n);
    expect(toBigInt(7)).toBe(7n);
    expect(() => toBigInt(1.5)).toThrow();
  });

  it('computes basis-point shares', () => {
    expect(shareBps(1n, 4n)).toBe(2500);
    expect(shareBps(0n, 0n)).toBe(0);
  });
});

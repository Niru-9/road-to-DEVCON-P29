import { getAddress, isAddress, type Address } from 'viem';
import { AppError } from '../errors.js';

/**
 * Normalizes any valid EVM address to its EIP-55 checksum form.
 * Throws a 400 AppError for invalid input so route handlers stay small.
 */
export function normalizeAddress(value: string, field = 'address'): Address {
  if (!isAddress(value, { strict: false })) {
    throw new AppError(400, 'invalid_address', `${field} is not a valid EVM address`);
  }
  return getAddress(value);
}

export function tryNormalizeAddress(value: string): Address | null {
  if (!isAddress(value, { strict: false })) return null;
  return getAddress(value);
}

export function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

import { parse } from 'csv-parse/sync';
import type { Address } from 'viem';
import { AppError } from '../errors.js';
import { tryNormalizeAddress } from './address.js';

export interface EligibilityInput {
  address: Address;
  label?: string;
  source?: string;
}

const ADDRESS_HEADERS = new Set(['address', 'wallet', 'wallet_address', 'addr', 'account']);
const LABEL_HEADERS = new Set(['label', 'name', 'handle', 'community_member']);
const SOURCE_HEADERS = new Set(['source', 'event', 'cohort']);

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/^\uFEFF/, '').trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Parses a CSV of community members. Supported shapes:
 *
 *   address,label,source
 *   0xabc...,Asha,road-to-devcon-pune
 *
 *   or just one address per line. Headers are optional and case-insensitive.
 */
export function parseEligibilityCsv(csvText: string, defaultSource = 'csv'): EligibilityInput[] {
  if (csvText.trim().length === 0) {
    throw new AppError(400, 'empty_csv', 'The uploaded CSV is empty');
  }

  let rows: unknown[][];
  try {
    rows = parse(csvText.replace(/^\uFEFF/, ''), {
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    }) as unknown[][];
  } catch (error) {
    throw new AppError(400, 'invalid_csv', 'The uploaded CSV could not be parsed', {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  if (rows.length === 0) {
    throw new AppError(400, 'empty_csv', 'The uploaded CSV contains no rows');
  }

  const firstRow = rows[0] ?? [];
  const headerCells = firstRow.map((cell) => String(cell ?? '').trim().toLowerCase());
  const hasHeader = headerCells.some((cell) => ADDRESS_HEADERS.has(cell));

  let addressIndex = 0;
  let labelIndex = 1;
  let sourceIndex = 2;

  if (hasHeader) {
    addressIndex = headerCells.findIndex((cell) => ADDRESS_HEADERS.has(cell));
    labelIndex = headerCells.findIndex((cell) => LABEL_HEADERS.has(cell));
    sourceIndex = headerCells.findIndex((cell) => SOURCE_HEADERS.has(cell));
    rows = rows.slice(1);
  }

  const result: EligibilityInput[] = [];
  const invalid: Array<{ line: number; value: string }> = [];

  rows.forEach((row, index) => {
    const rawAddress = clean(row[addressIndex]);
    if (!rawAddress) return;

    const address = tryNormalizeAddress(rawAddress);
    if (!address) {
      invalid.push({ line: index + (hasHeader ? 2 : 1), value: rawAddress });
      return;
    }

    const label = labelIndex >= 0 ? clean(row[labelIndex]) : undefined;
    const source = sourceIndex >= 0 ? clean(row[sourceIndex]) : undefined;

    result.push({
      address,
      label,
      source: source ?? defaultSource,
    });
  });

  if (invalid.length > 0) {
    throw new AppError(400, 'invalid_csv_addresses', 'The CSV contains invalid addresses', {
      invalid: invalid.slice(0, 25),
      invalidCount: invalid.length,
    });
  }

  if (result.length === 0) {
    throw new AppError(400, 'empty_csv', 'The CSV contains no usable addresses');
  }

  return result;
}

export interface EligibilityJsonEntry {
  address: string;
  label?: string;
  source?: string;
}

export function normalizeEligibilityInputs(
  entries: EligibilityJsonEntry[],
  defaultSource = 'json',
): EligibilityInput[] {
  const invalid: string[] = [];
  const normalized: EligibilityInput[] = [];

  for (const entry of entries) {
    const address = tryNormalizeAddress(entry.address);
    if (!address) {
      invalid.push(entry.address);
      continue;
    }
    normalized.push({
      address,
      label: entry.label?.trim() || undefined,
      source: entry.source?.trim() || defaultSource,
    });
  }

  if (invalid.length > 0) {
    throw new AppError(400, 'invalid_addresses', 'Some addresses are invalid', {
      invalid: invalid.slice(0, 25),
      invalidCount: invalid.length,
    });
  }

  if (normalized.length === 0) {
    throw new AppError(400, 'empty_eligibility_set', 'No eligible addresses were supplied');
  }

  return normalized;
}

function escapeCsvCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(header: string[], rows: Array<Array<string | number | boolean | null>>): string {
  const lines = [header.map(escapeCsvCell).join(',')];
  for (const row of rows) {
    lines.push(
      row
        .map((cell) => {
          if (cell === null) return '';
          if (typeof cell === 'string') return escapeCsvCell(cell);
          return String(cell);
        })
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

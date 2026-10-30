import { describe, expect, it } from 'vitest';
import {
  normalizeEligibilityInputs,
  parseEligibilityCsv,
  toCsv,
} from '../src/utils/csv.js';
import { AppError } from '../src/errors.js';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';

describe('eligibility CSV parsing', () => {
  it('parses a headerless address list', () => {
    const entries = parseEligibilityCsv(`${A}\n${B}\n`);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.address.toLowerCase()).toBe(A);
    expect(entries[0]!.source).toBe('csv');
  });

  it('detects headers, a BOM, and metadata columns', () => {
    const csv = `\uFEFFwallet,label,source\n${A},Asha,devcon-pune\n${B},Bob,devcon-pune\n`;
    const entries = parseEligibilityCsv(csv, 'attendees');
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ label: 'Asha', source: 'devcon-pune' });
  });

  it('falls back to the default source when the source column is empty', () => {
    const csv = `address,label,source\n${A},Asha,\n`;
    const entries = parseEligibilityCsv(csv, 'attendees');
    expect(entries[0]!.source).toBe('attendees');
  });

  it('rejects malformed address rows with line numbers', () => {
    const csv = `address\n${A}\nnot-an-address\n`;
    try {
      parseEligibilityCsv(csv);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('invalid_csv_addresses');
      expect((error as AppError).details).toMatchObject({ invalidCount: 1 });
    }
  });

  it('rejects empty input', () => {
    expect(() => parseEligibilityCsv('   ')).toThrow(AppError);
  });
});

describe('JSON eligibility normalization', () => {
  it('normalizes and deduplicates addresses downstream', () => {
    const entries = normalizeEligibilityInputs(
      [{ address: A, label: 'Asha' }, { address: B }],
      'json',
    );
    expect(entries).toHaveLength(2);
    expect(entries[1]!.source).toBe('json');
  });

  it('rejects invalid addresses', () => {
    expect(() => normalizeEligibilityInputs([{ address: 'nope' }])).toThrow(AppError);
  });
});

describe('CSV output', () => {
  it('quotes cells containing commas and quotes', () => {
    const csv = toCsv(['name', 'value'], [['Project, One', 'say "hi"'], ['plain', 1]]);
    expect(csv).toContain('"Project, One"');
    expect(csv).toContain('"say ""hi"""');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});

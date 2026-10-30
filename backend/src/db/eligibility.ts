import type { Address, Hex } from 'viem';
import type { Db } from './client.js';
import type { EligibilityEntryRow, EligibilityRootRow } from '../domain/types.js';

export interface EligibilityEntryInput {
  address: Address;
  label?: string;
  source?: string;
}

export function replaceEligibilitySet(
  db: Db,
  roundId: number,
  entries: EligibilityEntryInput[],
  root: Hex,
  leafCount: number,
  source: string,
): EligibilityRootRow {
  const transaction = db.transaction(() => {
    db.prepare(`UPDATE eligibility_roots SET active = 0 WHERE round_id = ?`).run(roundId);
    db.prepare(`DELETE FROM eligibility_entries WHERE round_id = ?`).run(roundId);

    const insertEntry = db.prepare(
      `INSERT INTO eligibility_entries (round_id, address, label, source) VALUES (?, ?, ?, ?)`,
    );
    for (const entry of entries) {
      insertEntry.run(roundId, entry.address, entry.label ?? null, entry.source ?? source);
    }

    db.prepare(
      `INSERT INTO eligibility_roots (round_id, root, leaf_count, source, active)
       VALUES (?, ?, ?, ?, 1)`,
    ).run(roundId, root, leafCount, source);
  });

  transaction();

  const active = getActiveEligibilityRoot(db, roundId);
  if (!active) throw new Error('Failed to read active eligibility root after import');
  return active;
}

export function getActiveEligibilityRoot(db: Db, roundId: number): EligibilityRootRow | undefined {
  return db
    .prepare(
      `SELECT * FROM eligibility_roots
        WHERE round_id = ? AND active = 1
        ORDER BY id DESC LIMIT 1`,
    )
    .get(roundId) as EligibilityRootRow | undefined;
}

export function listEligibilityEntries(db: Db, roundId: number): EligibilityEntryRow[] {
  return db
    .prepare(`SELECT * FROM eligibility_entries WHERE round_id = ? ORDER BY address ASC`)
    .all(roundId) as EligibilityEntryRow[];
}

export function findEligibilityEntry(
  db: Db,
  roundId: number,
  address: string,
): EligibilityEntryRow | undefined {
  return db
    .prepare(
      `SELECT * FROM eligibility_entries WHERE round_id = ? AND lower(address) = lower(?)`,
    )
    .get(roundId, address) as EligibilityEntryRow | undefined;
}

export function countEligibilityEntries(db: Db, roundId: number): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM eligibility_entries WHERE round_id = ?`)
    .get(roundId) as { count: number };
  return row.count;
}

export function listEligibilityRoots(db: Db, roundId: number): EligibilityRootRow[] {
  return db
    .prepare(`SELECT * FROM eligibility_roots WHERE round_id = ? ORDER BY id DESC`)
    .all(roundId) as EligibilityRootRow[];
}

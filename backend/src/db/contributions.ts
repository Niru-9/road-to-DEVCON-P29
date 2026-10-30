import type { Address, Hex } from 'viem';
import type { Db } from './client.js';
import type { ContributionRow } from '../domain/types.js';
import type { Page } from './projects.js';

export interface NewContribution {
  onchainProjectId: number;
  contributor: Address;
  amount: bigint;
  txHash: Hex;
  logIndex: number;
  blockNumber: number | null;
  blockTimestamp: number | null;
}

/** Returns true only when the event was new (idempotent re-indexing). */
export function insertContribution(db: Db, roundId: number, input: NewContribution): boolean {
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO contributions (
         round_id, onchain_project_id, contributor, amount_wei,
         tx_hash, log_index, block_number, block_timestamp
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      roundId,
      input.onchainProjectId,
      input.contributor,
      input.amount.toString(),
      input.txHash,
      input.logIndex,
      input.blockNumber,
      input.blockTimestamp,
    );

  return result.changes > 0;
}

export function allContributions(db: Db, roundId: number): ContributionRow[] {
  return db
    .prepare(
      `SELECT * FROM contributions
        WHERE round_id = ?
        ORDER BY onchain_project_id ASC, block_number ASC, log_index ASC`,
    )
    .all(roundId) as ContributionRow[];
}

export function contributionsForProject(
  db: Db,
  roundId: number,
  onchainProjectId: number,
): ContributionRow[] {
  return db
    .prepare(
      `SELECT * FROM contributions
        WHERE round_id = ? AND onchain_project_id = ?
        ORDER BY block_number ASC, log_index ASC`,
    )
    .all(roundId, onchainProjectId) as ContributionRow[];
}

export interface ContributionFilters {
  onchainProjectId?: number;
  contributor?: Address;
}

export function listContributions(
  db: Db,
  roundId: number,
  filters: ContributionFilters,
  page: Page,
): { rows: ContributionRow[]; total: number } {
  const clauses = ['round_id = ?'];
  const params: Array<string | number> = [roundId];

  if (filters.onchainProjectId !== undefined) {
    clauses.push('onchain_project_id = ?');
    params.push(filters.onchainProjectId);
  }
  if (filters.contributor) {
    clauses.push('lower(contributor) = lower(?)');
    params.push(filters.contributor);
  }

  const where = clauses.join(' AND ');
  const rows = db
    .prepare(
      `SELECT * FROM contributions
        WHERE ${where}
        ORDER BY block_number DESC, log_index DESC
        LIMIT ? OFFSET ?`,
    )
    .all(...params, page.limit, page.offset) as ContributionRow[];

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM contributions WHERE ${where}`)
    .get(...params) as { count: number };

  return { rows, total: total.count };
}

export function countContributions(db: Db, roundId: number): number {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM contributions WHERE round_id = ?`)
    .get(roundId) as { count: number };
  return row.count;
}

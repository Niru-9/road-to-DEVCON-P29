import type { Address, Hex } from 'viem';
import type { Db } from './client.js';
import type { RoundRow } from '../domain/types.js';

export interface UpsertRoundInput {
  chainId: number;
  address: Address;
  name: string;
  startBlock: number;
  operator?: Address | null;
  startTime?: number | null;
  endTime?: number | null;
  matchingPool?: bigint;
  totalContributions?: bigint;
  totalScore?: bigint;
  totalMatchAllocated?: bigint;
  unallocatedPool?: bigint;
  finalized?: boolean;
  eligibilityRoot?: Hex | null;
  projectCount?: number;
}

const DEFAULTS = {
  matchingPool: 0n,
  totalContributions: 0n,
  totalScore: 0n,
  totalMatchAllocated: 0n,
  unallocatedPool: 0n,
};

export function upsertRound(db: Db, input: UpsertRoundInput): RoundRow {
  db.prepare(
    `INSERT INTO rounds (
       chain_id, address, name, operator, start_time, end_time, start_block,
       matching_pool_wei, total_contributions_wei, total_score,
       total_match_allocated_wei, unallocated_pool_wei, finalized,
       eligibility_root, project_count
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(chain_id, address) DO UPDATE SET
       name = excluded.name,
       operator = excluded.operator,
       start_time = excluded.start_time,
       end_time = excluded.end_time,
       start_block = excluded.start_block,
       matching_pool_wei = excluded.matching_pool_wei,
       total_contributions_wei = excluded.total_contributions_wei,
       total_score = excluded.total_score,
       total_match_allocated_wei = excluded.total_match_allocated_wei,
       unallocated_pool_wei = excluded.unallocated_pool_wei,
       finalized = excluded.finalized,
       eligibility_root = excluded.eligibility_root,
       project_count = excluded.project_count,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  ).run(
    input.chainId,
    input.address,
    input.name,
    input.operator ?? null,
    input.startTime ?? null,
    input.endTime ?? null,
    input.startBlock,
    (input.matchingPool ?? DEFAULTS.matchingPool).toString(),
    (input.totalContributions ?? DEFAULTS.totalContributions).toString(),
    (input.totalScore ?? DEFAULTS.totalScore).toString(),
    (input.totalMatchAllocated ?? DEFAULTS.totalMatchAllocated).toString(),
    (input.unallocatedPool ?? DEFAULTS.unallocatedPool).toString(),
    input.finalized ? 1 : 0,
    input.eligibilityRoot ?? null,
    input.projectCount ?? 0,
  );

  const row = getRoundByAddress(db, input.address, input.chainId);
  if (!row) throw new Error('Failed to read round after upsert');
  return row;
}

export function getRoundByAddress(db: Db, address: string, chainId: number): RoundRow | undefined {
  return db
    .prepare(`SELECT * FROM rounds WHERE lower(address) = lower(?) AND chain_id = ?`)
    .get(address, chainId) as RoundRow | undefined;
}

export function getRoundById(db: Db, id: number): RoundRow | undefined {
  return db.prepare(`SELECT * FROM rounds WHERE id = ?`).get(id) as RoundRow | undefined;
}

export function listRounds(db: Db, chainId?: number): RoundRow[] {
  if (chainId === undefined) {
    return db.prepare(`SELECT * FROM rounds ORDER BY id DESC`).all() as RoundRow[];
  }
  return db
    .prepare(`SELECT * FROM rounds WHERE chain_id = ? ORDER BY id DESC`)
    .all(chainId) as RoundRow[];
}

export function listSyncableRounds(db: Db): RoundRow[] {
  return db
    .prepare(`SELECT * FROM rounds WHERE finalized = 0 ORDER BY id ASC`)
    .all() as RoundRow[];
}

export function setLastIndexedBlock(db: Db, roundId: number, block: number): void {
  db.prepare(
    `UPDATE rounds
       SET last_indexed_block = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  ).run(block, roundId);
}

export interface RoundPatch {
  operator?: Address | null;
  startTime?: number | null;
  endTime?: number | null;
  matchingPool?: bigint;
  totalContributions?: bigint;
  totalScore?: bigint;
  totalMatchAllocated?: bigint;
  unallocatedPool?: bigint;
  finalized?: boolean;
  eligibilityRoot?: Hex | null;
  projectCount?: number;
  name?: string;
}

export function updateRound(db: Db, roundId: number, patch: RoundPatch): void {
  const current = getRoundById(db, roundId);
  if (!current) throw new Error(`Round ${roundId} not found`);

  db.prepare(
    `UPDATE rounds SET
       name = ?,
       operator = ?,
       start_time = ?,
       end_time = ?,
       matching_pool_wei = ?,
       total_contributions_wei = ?,
       total_score = ?,
       total_match_allocated_wei = ?,
       unallocated_pool_wei = ?,
       finalized = ?,
       eligibility_root = ?,
       project_count = ?,
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE id = ?`,
  ).run(
    patch.name ?? current.name,
    patch.operator === undefined ? current.operator : patch.operator,
    patch.startTime === undefined ? current.start_time : patch.startTime,
    patch.endTime === undefined ? current.end_time : patch.endTime,
    (patch.matchingPool ?? BigInt(current.matching_pool_wei)).toString(),
    (patch.totalContributions ?? BigInt(current.total_contributions_wei)).toString(),
    (patch.totalScore ?? BigInt(current.total_score)).toString(),
    (patch.totalMatchAllocated ?? BigInt(current.total_match_allocated_wei)).toString(),
    (patch.unallocatedPool ?? BigInt(current.unallocated_pool_wei)).toString(),
    patch.finalized === undefined ? current.finalized : patch.finalized ? 1 : 0,
    patch.eligibilityRoot === undefined ? current.eligibility_root : patch.eligibilityRoot,
    patch.projectCount ?? current.project_count,
    roundId,
  );
}

export function addRoundContribution(db: Db, roundId: number, amount: bigint): void {
  const round = getRoundById(db, roundId);
  if (!round) throw new Error(`Round ${roundId} not found`);
  const next = BigInt(round.total_contributions_wei) + amount;
  db.prepare(`UPDATE rounds SET total_contributions_wei = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?`).run(
    next.toString(),
    roundId,
  );
}

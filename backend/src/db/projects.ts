import type { Address, Hex } from 'viem';
import type { Db } from './client.js';
import type { ProjectRow } from '../domain/types.js';

export interface UpsertProjectInput {
  onchainId: number;
  payout: Address;
  name: string;
  metadataUri: string;
  registeredBlock?: number | null;
  registeredTx?: Hex | null;
}

export function upsertProject(db: Db, roundId: number, input: UpsertProjectInput): ProjectRow {
  db.prepare(
    `INSERT INTO projects (
       round_id, onchain_project_id, payout, name, metadata_uri,
       registered_block, registered_tx
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(round_id, onchain_project_id) DO UPDATE SET
       payout = excluded.payout,
       name = excluded.name,
       metadata_uri = excluded.metadata_uri,
       registered_block = COALESCE(excluded.registered_block, projects.registered_block),
       registered_tx = COALESCE(excluded.registered_tx, projects.registered_tx),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  ).run(
    roundId,
    input.onchainId,
    input.payout,
    input.name,
    input.metadataUri,
    input.registeredBlock ?? null,
    input.registeredTx ?? null,
  );

  syncProjectCount(db, roundId);
  const project = getProject(db, roundId, input.onchainId);
  if (!project) throw new Error('Failed to read project after upsert');
  return project;
}

export function getProject(db: Db, roundId: number, onchainId: number): ProjectRow | undefined {
  return db
    .prepare(`SELECT * FROM projects WHERE round_id = ? AND onchain_project_id = ?`)
    .get(roundId, onchainId) as ProjectRow | undefined;
}

export function allProjects(db: Db, roundId: number): ProjectRow[] {
  return db
    .prepare(`SELECT * FROM projects WHERE round_id = ? ORDER BY onchain_project_id ASC`)
    .all(roundId) as ProjectRow[];
}

export interface Page {
  limit: number;
  offset: number;
}

export function listProjects(
  db: Db,
  roundId: number,
  page: Page,
): { rows: ProjectRow[]; total: number } {
  const rows = db
    .prepare(
      `SELECT * FROM projects
        WHERE round_id = ?
        ORDER BY onchain_project_id ASC
        LIMIT ? OFFSET ?`,
    )
    .all(roundId, page.limit, page.offset) as ProjectRow[];

  const total = db
    .prepare(`SELECT COUNT(*) AS count FROM projects WHERE round_id = ?`)
    .get(roundId) as { count: number };

  return { rows, total: total.count };
}

export function addProjectContribution(
  db: Db,
  roundId: number,
  onchainId: number,
  amount: bigint,
): void {
  const project = getProject(db, roundId, onchainId);
  if (!project) throw new Error(`Project ${onchainId} not found in round ${roundId}`);
  const next = BigInt(project.contributions_wei) + amount;
  db.prepare(
    `UPDATE projects
        SET contributions_wei = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE round_id = ? AND onchain_project_id = ?`,
  ).run(next.toString(), roundId, onchainId);
}

export function setProjectMatch(
  db: Db,
  roundId: number,
  onchainId: number,
  score: bigint,
  match: bigint,
): void {
  db.prepare(
    `UPDATE projects
        SET score_wei = ?, match_wei = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE round_id = ? AND onchain_project_id = ?`,
  ).run(score.toString(), match.toString(), roundId, onchainId);
}

export function markProjectWithdrawn(
  db: Db,
  roundId: number,
  onchainId: number,
  input: {
    txHash: Hex;
    contributions: bigint;
    match: bigint;
    timestamp: number | null;
    blockNumber: number | null;
  },
): void {
  db.prepare(
    `UPDATE projects
        SET withdrawn = 1,
            withdrawn_tx = ?,
            withdrawn_at = ?,
            withdrawn_contributions_wei = ?,
            withdrawn_match_wei = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE round_id = ? AND onchain_project_id = ?`,
  ).run(
    input.txHash,
    input.timestamp ? new Date(input.timestamp * 1000).toISOString() : null,
    input.contributions.toString(),
    input.match.toString(),
    roundId,
    onchainId,
  );
}

export interface ChainProjectState {
  payout: Address;
  name: string;
  metadataUri: string;
  contributions: bigint;
  match: bigint;
  score: bigint;
  withdrawn: boolean;
}

/** Repairs a project row from on-chain reads. Used by the reconcile endpoint. */
export function applyChainProjectState(
  db: Db,
  roundId: number,
  onchainId: number,
  state: ChainProjectState,
): void {
  const existing = getProject(db, roundId, onchainId);
  if (!existing) {
    db.prepare(
      `INSERT INTO projects (
         round_id, onchain_project_id, payout, name, metadata_uri,
         contributions_wei, match_wei, score_wei, withdrawn
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      roundId,
      onchainId,
      state.payout,
      state.name,
      state.metadataUri,
      state.contributions.toString(),
      state.match.toString(),
      state.score.toString(),
      state.withdrawn ? 1 : 0,
    );
    syncProjectCount(db, roundId);
    return;
  }

  db.prepare(
    `UPDATE projects
        SET payout = ?,
            name = ?,
            metadata_uri = ?,
            contributions_wei = ?,
            match_wei = ?,
            score_wei = ?,
            withdrawn = ?,
            updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE round_id = ? AND onchain_project_id = ?`,
  ).run(
    state.payout,
    state.name,
    state.metadataUri,
    state.contributions.toString(),
    state.match.toString(),
    state.score.toString(),
    state.withdrawn ? 1 : 0,
    roundId,
    onchainId,
  );
}

export function syncProjectCount(db: Db, roundId: number): void {
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM projects WHERE round_id = ?`)
    .get(roundId) as { count: number };
  db.prepare(`UPDATE rounds SET project_count = ? WHERE id = ?`).run(row.count, roundId);
}

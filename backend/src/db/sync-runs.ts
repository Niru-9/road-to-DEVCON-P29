import type { Db } from './client.js';
import type { SyncRunRow } from '../domain/types.js';

export function startSyncRun(db: Db, roundId: number, fromBlock: number, toBlock: number): number {
  const result = db
    .prepare(`INSERT INTO sync_runs (round_id, from_block, to_block) VALUES (?, ?, ?)`)
    .run(roundId, fromBlock, toBlock);
  return Number(result.lastInsertRowid);
}

export function finishSyncRun(
  db: Db,
  id: number,
  status: 'success' | 'error',
  logsProcessed: number,
  errorMessage?: string,
): void {
  db.prepare(
    `UPDATE sync_runs
        SET status = ?, logs_processed = ?, error = ?,
            finished_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ?`,
  ).run(status, logsProcessed, errorMessage ?? null, id);
}

export function latestSyncRun(db: Db, roundId: number): SyncRunRow | undefined {
  return db
    .prepare(`SELECT * FROM sync_runs WHERE round_id = ? ORDER BY id DESC LIMIT 1`)
    .get(roundId) as SyncRunRow | undefined;
}

import type { Db } from './client.js';
import type { MatchRow } from '../domain/types.js';

export function upsertMatch(
  db: Db,
  roundId: number,
  onchainProjectId: number,
  score: bigint,
  match: bigint,
): void {
  db.prepare(
    `INSERT INTO matches (round_id, onchain_project_id, score_wei, match_wei)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(round_id, onchain_project_id) DO UPDATE SET
       score_wei = excluded.score_wei,
       match_wei = excluded.match_wei,
       created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
  ).run(roundId, onchainProjectId, score.toString(), match.toString());
}

export function allMatches(db: Db, roundId: number): MatchRow[] {
  return db
    .prepare(`SELECT * FROM matches WHERE round_id = ? ORDER BY onchain_project_id ASC`)
    .all(roundId) as MatchRow[];
}

export function getMatch(
  db: Db,
  roundId: number,
  onchainProjectId: number,
): MatchRow | undefined {
  return db
    .prepare(`SELECT * FROM matches WHERE round_id = ? AND onchain_project_id = ?`)
    .get(roundId, onchainProjectId) as MatchRow | undefined;
}

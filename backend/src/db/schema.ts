/**
 * SQLite schema. All token amounts are stored as decimal TEXT because uint256
 * scores can exceed SQLite's signed 64-bit INTEGER range. Arithmetic is always
 * performed in JavaScript BigInt, never with SQL SUM().
 */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS rounds (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id                  INTEGER NOT NULL,
  address                   TEXT NOT NULL,
  name                      TEXT NOT NULL,
  operator                  TEXT,
  start_time                INTEGER,
  end_time                  INTEGER,
  start_block               INTEGER NOT NULL DEFAULT 0,
  last_indexed_block        INTEGER NOT NULL DEFAULT 0,
  finalized                 INTEGER NOT NULL DEFAULT 0,
  matching_pool_wei         TEXT NOT NULL DEFAULT '0',
  total_contributions_wei   TEXT NOT NULL DEFAULT '0',
  total_score               TEXT NOT NULL DEFAULT '0',
  total_match_allocated_wei TEXT NOT NULL DEFAULT '0',
  unallocated_pool_wei      TEXT NOT NULL DEFAULT '0',
  eligibility_root          TEXT,
  project_count             INTEGER NOT NULL DEFAULT 0,
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (chain_id, address)
);

CREATE TABLE IF NOT EXISTS projects (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id                  INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  onchain_project_id        INTEGER NOT NULL,
  payout                    TEXT NOT NULL,
  name                      TEXT NOT NULL,
  metadata_uri              TEXT NOT NULL DEFAULT '',
  contributions_wei        TEXT NOT NULL DEFAULT '0',
  match_wei                 TEXT NOT NULL DEFAULT '0',
  score_wei                 TEXT NOT NULL DEFAULT '0',
  withdrawn                 INTEGER NOT NULL DEFAULT 0,
  withdrawn_tx              TEXT,
  withdrawn_at              TEXT,
  withdrawn_contributions_wei TEXT,
  withdrawn_match_wei       TEXT,
  registered_block          INTEGER,
  registered_tx             TEXT,
  created_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (round_id, onchain_project_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_round ON projects (round_id);
CREATE INDEX IF NOT EXISTS idx_projects_payout ON projects (round_id, payout);

CREATE TABLE IF NOT EXISTS contributions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id            INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  onchain_project_id  INTEGER NOT NULL,
  contributor         TEXT NOT NULL,
  amount_wei          TEXT NOT NULL,
  tx_hash             TEXT NOT NULL,
  log_index           INTEGER NOT NULL,
  block_number        INTEGER,
  block_timestamp     INTEGER,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (round_id, tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_contributions_project
  ON contributions (round_id, onchain_project_id);
CREATE INDEX IF NOT EXISTS idx_contributions_contributor
  ON contributions (round_id, contributor);

CREATE TABLE IF NOT EXISTS matches (
  round_id            INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  onchain_project_id  INTEGER NOT NULL,
  score_wei           TEXT NOT NULL,
  match_wei           TEXT NOT NULL,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (round_id, onchain_project_id)
);

CREATE TABLE IF NOT EXISTS eligibility_entries (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id    INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  address     TEXT NOT NULL,
  label       TEXT,
  source      TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (round_id, address)
);

CREATE INDEX IF NOT EXISTS idx_eligibility_entries_round
  ON eligibility_entries (round_id);

CREATE TABLE IF NOT EXISTS eligibility_roots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id    INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  root        TEXT NOT NULL,
  leaf_count  INTEGER NOT NULL,
  source      TEXT,
  active      INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_eligibility_roots_round
  ON eligibility_roots (round_id, active);

CREATE TABLE IF NOT EXISTS sync_runs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id        INTEGER NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  from_block      INTEGER NOT NULL,
  to_block        INTEGER NOT NULL,
  logs_processed  INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'running',
  error           TEXT,
  started_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  finished_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_round ON sync_runs (round_id, id DESC);
`;

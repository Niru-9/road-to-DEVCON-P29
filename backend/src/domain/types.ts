import type { Address, Hex } from 'viem';

export interface RoundRow {
  id: number;
  chain_id: number;
  address: Address;
  name: string;
  operator: Address | null;
  start_time: number | null;
  end_time: number | null;
  start_block: number;
  last_indexed_block: number;
  finalized: 0 | 1;
  matching_pool_wei: string;
  total_contributions_wei: string;
  total_score: string;
  total_match_allocated_wei: string;
  unallocated_pool_wei: string;
  eligibility_root: Hex | null;
  project_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectRow {
  id: number;
  round_id: number;
  onchain_project_id: number;
  payout: Address;
  name: string;
  metadata_uri: string;
  contributions_wei: string;
  match_wei: string;
  score_wei: string;
  withdrawn: 0 | 1;
  withdrawn_tx: Hex | null;
  withdrawn_at: string | null;
  withdrawn_contributions_wei: string | null;
  withdrawn_match_wei: string | null;
  registered_block: number | null;
  registered_tx: Hex | null;
  created_at: string;
  updated_at: string;
}

export interface ContributionRow {
  id: number;
  round_id: number;
  onchain_project_id: number;
  contributor: Address;
  amount_wei: string;
  tx_hash: Hex;
  log_index: number;
  block_number: number | null;
  block_timestamp: number | null;
  created_at: string;
}

export interface MatchRow {
  round_id: number;
  onchain_project_id: number;
  score_wei: string;
  match_wei: string;
  created_at: string;
}

export interface EligibilityEntryRow {
  id: number;
  round_id: number;
  address: Address;
  label: string | null;
  source: string | null;
  created_at: string;
}

export interface EligibilityRootRow {
  id: number;
  round_id: number;
  root: Hex;
  leaf_count: number;
  source: string | null;
  active: 0 | 1;
  created_at: string;
}

export interface SyncRunRow {
  id: number;
  round_id: number;
  from_block: number;
  to_block: number;
  logs_processed: number;
  status: 'running' | 'success' | 'error';
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface ChainRoundConfig {
  address: Address;
  chainId: number;
  operator: Address;
  startTime: number;
  endTime: number;
  matchingPool: bigint;
  totalContributions: bigint;
  totalScore: bigint;
  totalMatchAllocated: bigint;
  unallocatedPool: bigint;
  finalized: boolean;
  eligibilityRoot: Hex;
  projectCount: number;
}

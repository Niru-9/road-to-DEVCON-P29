import type {
  ContributionRow,
  MatchRow,
  ProjectRow,
  RoundRow,
} from '../src/domain/types.js';

export const ROUND_ADDRESS = '0x1111111111111111111111111111111111111111' as const;
export const OPERATOR = '0x2222222222222222222222222222222222222222' as const;
export const PAYOUT_0 = '0x3333333333333333333333333333333333333333' as const;
export const PAYOUT_1 = '0x4444444444444444444444444444444444444444' as const;

export const ONE_ETH = 10n ** 18n;

export function makeRound(overrides: Partial<RoundRow> = {}): RoundRow {
  return {
    id: 1,
    chain_id: 11155111,
    address: ROUND_ADDRESS,
    name: 'Test Round',
    operator: OPERATOR,
    start_time: 1_700_000_000,
    end_time: 1_700_604_800,
    start_block: 100,
    last_indexed_block: 0,
    finalized: 0,
    matching_pool_wei: (100n * ONE_ETH).toString(),
    total_contributions_wei: '0',
    total_score: '0',
    total_match_allocated_wei: '0',
    unallocated_pool_wei: '0',
    eligibility_root: null,
    project_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeProject(
  onchainId: number,
  overrides: Partial<ProjectRow> = {},
): ProjectRow {
  return {
    id: onchainId + 1,
    round_id: 1,
    onchain_project_id: onchainId,
    payout: onchainId === 0 ? PAYOUT_0 : PAYOUT_1,
    name: `Project ${onchainId}`,
    metadata_uri: '',
    contributions_wei: '0',
    match_wei: '0',
    score_wei: '0',
    withdrawn: 0,
    withdrawn_tx: null,
    withdrawn_at: null,
    withdrawn_contributions_wei: null,
    withdrawn_match_wei: null,
    registered_block: 101,
    registered_tx: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

let logIndex = 0;

export function makeContribution(
  projectId: number,
  contributor: `0x${string}`,
  amount: bigint,
): ContributionRow {
  logIndex += 1;
  return {
    id: logIndex,
    round_id: 1,
    onchain_project_id: projectId,
    contributor,
    amount_wei: amount.toString(),
    tx_hash: `0x${logIndex.toString(16).padStart(64, '0')}` as `0x${string}`,
    log_index: logIndex,
    block_number: 200 + logIndex,
    block_timestamp: 1_700_000_100,
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

export function makeMatch(
  projectId: number,
  score: bigint,
  match: bigint,
): MatchRow {
  return {
    round_id: 1,
    onchain_project_id: projectId,
    score_wei: score.toString(),
    match_wei: match.toString(),
    created_at: '2026-01-01T00:00:00.000Z',
  };
}

/** Deterministic pseudo-address for the i-th synthetic community member. */
export function addressFor(index: number): `0x${string}` {
  return `0x${(index + 1).toString(16).padStart(40, '0')}`;
}

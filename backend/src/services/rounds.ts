import type { PublicClient } from 'viem';
import type { Db } from '../db/client.js';
import { allProjects, applyChainProjectState, listProjects } from '../db/projects.js';
import { allMatches } from '../db/matches.js';
import { getRoundByAddress, upsertRound, updateRound } from '../db/rounds.js';
import { latestSyncRun } from '../db/sync-runs.js';
import type { ProjectRow, RoundRow } from '../domain/types.js';
import { AppError, notFound } from '../errors.js';
import { formatEth, toBigInt } from '../utils/bigint.js';
import { normalizeAddress } from '../utils/address.js';
import { readAllProjects, readRoundConfig } from '../chain/reader.js';
import { roundPhase } from './results.js';

export function resolveRound(db: Db, chainId: number, addressInput: string): RoundRow {
  const address = normalizeAddress(addressInput, 'round address');
  const round = getRoundByAddress(db, address, chainId);
  if (!round) {
    throw notFound(
      'round_not_found',
      `Round ${address} is not indexed on chain ${chainId}. Add it with POST /api/v1/admin/rounds.`,
    );
  }
  return round;
}

export interface AddRoundInput {
  address: string;
  name?: string;
  startBlock?: number;
}

export async function addRoundFromChain(
  db: Db,
  client: PublicClient,
  chainId: number,
  input: AddRoundInput,
): Promise<{ round: RoundRow; warnings: string[] }> {
  const address = normalizeAddress(input.address);
  const config = await readRoundConfig(client, address);
  const warnings: string[] = [];

  if (input.startBlock === undefined) {
    warnings.push(
      'No start block was supplied. The indexer will scan from genesis, which is slow on public networks. Re-add the round with its deployment block.',
    );
  }

  const round = upsertRound(db, {
    chainId,
    address,
    name: input.name?.trim() || 'Quadratic Funding Round',
    startBlock: input.startBlock ?? 0,
    operator: config.operator,
    startTime: config.startTime,
    endTime: config.endTime,
    matchingPool: config.matchingPool,
    totalContributions: config.totalContributions,
    totalScore: config.totalScore,
    totalMatchAllocated: config.totalMatchAllocated,
    unallocatedPool: config.unallocatedPool,
    finalized: config.finalized,
    eligibilityRoot: config.eligibilityRoot === '0x0000000000000000000000000000000000000000000000000000000000000000' ? null : config.eligibilityRoot,
    projectCount: config.projectCount,
  });

  return { round, warnings };
}

export async function refreshRoundFromChain(
  db: Db,
  client: PublicClient,
  round: RoundRow,
): Promise<RoundRow> {
  const config = await readRoundConfig(client, round.address);
  updateRound(db, round.id, {
    operator: config.operator,
    startTime: config.startTime,
    endTime: config.endTime,
    matchingPool: config.matchingPool,
    totalContributions: config.totalContributions,
    totalScore: config.totalScore,
    totalMatchAllocated: config.totalMatchAllocated,
    unallocatedPool: config.unallocatedPool,
    finalized: config.finalized,
    eligibilityRoot:
      config.eligibilityRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'
        ? null
        : config.eligibilityRoot,
    projectCount: config.projectCount,
  });

  const updated = getRoundByAddress(db, round.address, round.chain_id);
  if (!updated) throw new AppError(500, 'round_refresh_failed', 'Round disappeared during refresh');
  return updated;
}

export interface ReconcileDiff {
  projectId: number;
  field: string;
  indexed: string | number | boolean | null;
  onchain: string | number | boolean | null;
}

export async function reconcileRound(
  db: Db,
  client: PublicClient,
  round: RoundRow,
  repair = false,
): Promise<{
  ok: boolean;
  round: { address: string; finalized: boolean; totalScore: string; matchingPoolWei: string };
  projects: { indexed: number; onchain: number };
  diffs: ReconcileDiff[];
  repaired: boolean;
  checkedAt: string;
}> {
  const config = await readRoundConfig(client, round.address);
  const onchainProjects = await readAllProjects(client, round.address, config.projectCount);
  const indexedProjects = allProjects(db, round.id);
  const indexedById = new Map(indexedProjects.map((project) => [project.onchain_project_id, project]));
  const matches = new Map(allMatches(db, round.id).map((match) => [match.onchain_project_id, match]));

  const diffs: ReconcileDiff[] = [];

  if (Boolean(round.finalized) !== config.finalized) {
    diffs.push({
      projectId: -1,
      field: 'finalized',
      indexed: Boolean(round.finalized),
      onchain: config.finalized,
    });
  }
  if (toBigInt(round.total_score) !== config.totalScore) {
    diffs.push({
      projectId: -1,
      field: 'totalScore',
      indexed: round.total_score,
      onchain: config.totalScore.toString(),
    });
  }
  if (toBigInt(round.matching_pool_wei) !== config.matchingPool) {
    diffs.push({
      projectId: -1,
      field: 'matchingPool',
      indexed: round.matching_pool_wei,
      onchain: config.matchingPool.toString(),
    });
  }

  for (const onchain of onchainProjects) {
    const indexed = indexedById.get(onchain.projectId);
    if (!indexed) {
      diffs.push({
        projectId: onchain.projectId,
        field: 'missing_project',
        indexed: null,
        onchain: onchain.name,
      });
      continue;
    }

    const compareFields: Array<[string, string | number | boolean | null, string | number | boolean | null]> = [
      ['payout', indexed.payout.toLowerCase(), onchain.payout.toLowerCase()],
      ['name', indexed.name, onchain.name],
      ['metadataUri', indexed.metadata_uri, onchain.metadataURI],
      ['contributionsWei', indexed.contributions_wei, onchain.contributions.toString()],
      ['matchWei', indexed.match_wei, onchain.matchAmount.toString()],
      ['scoreWei', indexed.score_wei, onchain.score.toString()],
      ['withdrawn', Boolean(indexed.withdrawn), onchain.withdrawn],
    ];

    for (const [field, indexedValue, onchainValue] of compareFields) {
      if (String(indexedValue) !== String(onchainValue)) {
        diffs.push({
          projectId: onchain.projectId,
          field,
          indexed: indexedValue,
          onchain: onchainValue,
        });
      }
    }

    const match = matches.get(onchain.projectId);
    if (config.finalized) {
      if (!match) {
        diffs.push({
          projectId: onchain.projectId,
          field: 'missing_match_event',
          indexed: null,
          onchain: onchain.matchAmount.toString(),
        });
      } else if (toBigInt(match.match_wei) !== onchain.matchAmount) {
        diffs.push({
          projectId: onchain.projectId,
          field: 'matchEvent',
          indexed: match.match_wei,
          onchain: onchain.matchAmount.toString(),
        });
      }
    }
  }

  if (repair) {
    for (const onchain of onchainProjects) {
      applyChainProjectState(db, round.id, onchain.projectId, {
        payout: onchain.payout,
        name: onchain.name,
        metadataUri: onchain.metadataURI,
        contributions: onchain.contributions,
        match: onchain.matchAmount,
        score: onchain.score,
        withdrawn: onchain.withdrawn,
      });
    }
    updateRound(db, round.id, {
      finalized: config.finalized,
      totalScore: config.totalScore,
      matchingPool: config.matchingPool,
      totalMatchAllocated: config.totalMatchAllocated,
      unallocatedPool: config.unallocatedPool,
      totalContributions: config.totalContributions,
      operator: config.operator,
      startTime: config.startTime,
      endTime: config.endTime,
      projectCount: config.projectCount,
    });
  }

  return {
    ok: diffs.length === 0,
    round: {
      address: round.address,
      finalized: config.finalized,
      totalScore: config.totalScore.toString(),
      matchingPoolWei: config.matchingPool.toString(),
    },
    projects: { indexed: indexedProjects.length, onchain: onchainProjects.length },
    diffs,
    repaired: repair,
    checkedAt: new Date().toISOString(),
  };
}

export function roundSummary(db: Db, round: RoundRow): Record<string, unknown> {
  const latestSync = latestSyncRun(db, round.id);
  const projectPage = listProjects(db, round.id, { limit: 1, offset: 0 });
  const phase = roundPhase(round);

  return {
    address: round.address,
    chainId: round.chain_id,
    name: round.name,
    operator: round.operator,
    startTime: round.start_time,
    endTime: round.end_time,
    startTimeIso: round.start_time ? new Date(round.start_time * 1000).toISOString() : null,
    endTimeIso: round.end_time ? new Date(round.end_time * 1000).toISOString() : null,
    finalized: Boolean(round.finalized),
    phase,
    matchingPoolWei: round.matching_pool_wei,
    matchingPoolEth: formatEth(toBigInt(round.matching_pool_wei)),
    totalContributionsWei: round.total_contributions_wei,
    totalContributionsEth: formatEth(toBigInt(round.total_contributions_wei)),
    totalScore: round.total_score,
    totalMatchAllocatedWei: round.total_match_allocated_wei,
    totalMatchAllocatedEth: formatEth(toBigInt(round.total_match_allocated_wei)),
    unallocatedPoolWei: round.unallocated_pool_wei,
    unallocatedPoolEth: formatEth(toBigInt(round.unallocated_pool_wei)),
    eligibilityRoot: round.eligibility_root,
    projectCount: projectPage.total,
    indexer: {
      startBlock: round.start_block,
      lastIndexedBlock: round.last_indexed_block,
      latestRun: latestSync
        ? {
            status: latestSync.status,
            fromBlock: latestSync.from_block,
            toBlock: latestSync.to_block,
            logsProcessed: latestSync.logs_processed,
            startedAt: latestSync.started_at,
            finishedAt: latestSync.finished_at,
            error: latestSync.error,
          }
        : null,
    },
  };
}

export function projectRowToApi(row: ProjectRow): Record<string, unknown> {
  return {
    onchainId: row.onchain_project_id,
    payout: row.payout,
    name: row.name,
    metadataUri: row.metadata_uri,
    contributionsWei: row.contributions_wei,
    contributionsEth: formatEth(toBigInt(row.contributions_wei)),
    matchWei: row.match_wei,
    matchEth: formatEth(toBigInt(row.match_wei)),
    scoreWei: row.score_wei,
    withdrawn: Boolean(row.withdrawn),
    withdrawnTx: row.withdrawn_tx,
    withdrawnAt: row.withdrawn_at,
    registeredBlock: row.registered_block,
    registeredTx: row.registered_tx,
  };
}

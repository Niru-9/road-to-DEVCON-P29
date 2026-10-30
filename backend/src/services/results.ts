import type { ContributionRow, MatchRow, ProjectRow, RoundRow } from '../domain/types.js';
import { formatEth, isqrt, scaleToPool, shareBps, toBigInt } from '../utils/bigint.js';

export type RoundPhase = 'scheduled' | 'open' | 'awaiting-finalization' | 'finalized';

export interface ContributorBreakdown {
  address: string;
  amountWei: string;
  amountEth: string;
  sqrtWei: string;
  /** Share of the project's sum-of-square-roots total, in basis points. */
  scoreShareBps: number;
}

export interface ResultsProject {
  onchainId: number;
  payout: string;
  name: string;
  metadataUri: string;
  contributionsWei: string;
  contributionsEth: string;
  uniqueContributors: number;
  sumSqrtWei: string;
  scoreWei: string;
  matchWei: string;
  matchEth: string;
  matchSource: 'onchain' | 'computed';
  totalPayoutWei: string;
  totalPayoutEth: string;
  withdrawn: boolean;
  withdrawnAt: string | null;
  withdrawnAmounts: {
    contributionsWei: string;
    matchWei: string;
  } | null;
  onchain: {
    scoreWei: string | null;
    matchWei: string | null;
  };
  contributors: ContributorBreakdown[];
}

export interface IntegrityChecks {
  indexMatchesProjectTotals: boolean;
  indexMatchesRoundTotal: boolean;
  scoresMatchOnchain: boolean | null;
  matchesMatchOnchain: boolean | null;
  totalScoreMatchesOnchain: boolean | null;
  totalMatchesWithinPool: boolean;
  noOrphanContributions: boolean;
  balanceCoversOutstanding: boolean | null;
}

export interface Results {
  round: {
    address: string;
    chainId: number;
    name: string;
    operator: string | null;
    startTime: number | null;
    endTime: number | null;
    startTimeIso: string | null;
    endTimeIso: string | null;
    finalized: boolean;
    phase: RoundPhase;
    matchingPoolWei: string;
    matchingPoolEth: string;
    totalContributionsWei: string;
    totalContributionsEth: string;
    totalScoreWei: string;
    totalMatchAllocatedWei: string;
    totalMatchAllocatedEth: string;
    unallocatedPoolWei: string;
    unallocatedPoolEth: string;
    totalPayoutsWei: string;
    totalPayoutsEth: string;
    outstandingPayoutsWei: string;
    outstandingPayoutsEth: string;
    uniqueContributors: number;
    onchainBalanceWei: string | null;
    onchainBalanceEth: string | null;
  };
  projects: ResultsProject[];
  integrity: {
    ok: boolean;
    checks: IntegrityChecks;
    warnings: string[];
    checkedAt: string;
  };
  formula: {
    score: string;
    match: string;
    notes: string[];
  };
  generatedAt: string;
}

interface ContributorAggregate {
  address: string;
  amount: bigint;
}

interface ProjectSnapshot {
  project: ProjectRow;
  contributors: ContributorAggregate[];
  contributions: bigint;
  sumSqrt: bigint;
  score: bigint;
}

function groupContributions(rows: ContributionRow[]): Map<number, Map<string, ContributorAggregate>> {
  const grouped = new Map<number, Map<string, ContributorAggregate>>();

  for (const row of rows) {
    let projectMap = grouped.get(row.onchain_project_id);
    if (!projectMap) {
      projectMap = new Map();
      grouped.set(row.onchain_project_id, projectMap);
    }

    const key = row.contributor.toLowerCase();
    const existing = projectMap.get(key);
    const amount = toBigInt(row.amount_wei);

    if (existing) {
      existing.amount += amount;
    } else {
      projectMap.set(key, { address: row.contributor, amount });
    }
  }

  return grouped;
}

function snapshotProjects(projects: ProjectRow[], contributions: ContributionRow[]): ProjectSnapshot[] {
  const grouped = groupContributions(contributions);

  return projects.map((project) => {
    const contributorMap = grouped.get(project.onchain_project_id) ?? new Map();
    const contributors = [...contributorMap.values()].sort((a, b) => {
      if (a.amount === b.amount) return a.address.localeCompare(b.address);
      return a.amount > b.amount ? -1 : 1;
    });

    let contributionsTotal = 0n;
    let sumSqrt = 0n;
    for (const contributor of contributors) {
      contributionsTotal += contributor.amount;
      sumSqrt += isqrt(contributor.amount);
    }

    return {
      project,
      contributors,
      contributions: contributionsTotal,
      sumSqrt,
      score: sumSqrt * sumSqrt,
    };
  });
}

function isoFromUnix(timestamp: number | null): string | null {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null;
}

export function roundPhase(round: RoundRow, nowSeconds = Math.floor(Date.now() / 1000)): RoundPhase {
  if (round.finalized) return 'finalized';
  if (round.start_time !== null && nowSeconds < round.start_time) return 'scheduled';
  if (round.end_time !== null && nowSeconds > round.end_time) return 'awaiting-finalization';
  return 'open';
}

export interface ComputeResultsInput {
  round: RoundRow;
  projects: ProjectRow[];
  contributions: ContributionRow[];
  matches?: MatchRow[];
  onchainBalanceWei?: bigint;
  nowSeconds?: number;
}

/**
 * Recomputes the entire round from raw contribution events. This is the source
 * of truth exposed by `/results`; the indexer's project totals are only a cache
 * and are cross-checked in `integrity.checks`.
 */
export function computeResults(input: ComputeResultsInput): Results {
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const phase = roundPhase(input.round, nowSeconds);
  const pool = toBigInt(input.round.matching_pool_wei);
  const matchRows = new Map((input.matches ?? []).map((row) => [row.onchain_project_id, row]));

  const snapshots = snapshotProjects(input.projects, input.contributions);
  const totalScore = snapshots.reduce((sum, snapshot) => sum + snapshot.score, 0n);

  // Provisional scaling: every project's share of the pool if finalization
  // happened with the contributions indexed so far.
  const provisionalMatches = new Map<number, bigint>();
  for (const snapshot of snapshots) {
    provisionalMatches.set(
      snapshot.project.onchain_project_id,
      scaleToPool(snapshot.score, pool, totalScore),
    );
  }

  const resultsProjects: ResultsProject[] = snapshots.map((snapshot) => {
    const project = snapshot.project;
    const matchRow = matchRows.get(project.onchain_project_id);

    const useOnchain = Boolean(input.round.finalized && matchRow);
    const match = useOnchain ? toBigInt(matchRow!.match_wei) : provisionalMatches.get(project.onchain_project_id)!;
    const score = snapshot.score;
    const totalPayout = snapshot.contributions + match;

    const contributors: ContributorBreakdown[] = snapshot.contributors.map((contributor) => {
      const sqrt = isqrt(contributor.amount);
      return {
        address: contributor.address,
        amountWei: contributor.amount.toString(),
        amountEth: formatEth(contributor.amount),
        sqrtWei: sqrt.toString(),
        scoreShareBps: shareBps(sqrt, snapshot.sumSqrt),
      };
    });

    return {
      onchainId: project.onchain_project_id,
      payout: project.payout,
      name: project.name,
      metadataUri: project.metadata_uri,
      contributionsWei: snapshot.contributions.toString(),
      contributionsEth: formatEth(snapshot.contributions),
      uniqueContributors: snapshot.contributors.length,
      sumSqrtWei: snapshot.sumSqrt.toString(),
      scoreWei: score.toString(),
      matchWei: match.toString(),
      matchEth: formatEth(match),
      matchSource: useOnchain ? 'onchain' : 'computed',
      totalPayoutWei: totalPayout.toString(),
      totalPayoutEth: formatEth(totalPayout),
      withdrawn: Boolean(project.withdrawn),
      withdrawnAt: project.withdrawn_at,
      withdrawnAmounts:
        project.withdrawn && project.withdrawn_contributions_wei && project.withdrawn_match_wei
          ? {
              contributionsWei: project.withdrawn_contributions_wei,
              matchWei: project.withdrawn_match_wei,
            }
          : null,
      onchain: {
        scoreWei: matchRow?.score_wei ?? null,
        matchWei: matchRow?.match_wei ?? null,
      },
      contributors,
    };
  });

  const totalContributions = input.contributions.reduce(
    (sum, row) => sum + toBigInt(row.amount_wei),
    0n,
  );
  const totalMatchAllocated = resultsProjects.reduce(
    (sum, project) => sum + toBigInt(project.matchWei),
    0n,
  );
  const totalPayouts = resultsProjects.reduce(
    (sum, project) => sum + toBigInt(project.totalPayoutWei),
    0n,
  );
  const outstandingPayouts = resultsProjects
    .filter((project) => !project.withdrawn)
    .reduce((sum, project) => sum + toBigInt(project.totalPayoutWei), 0n);

  const unallocatedPool = pool > totalMatchAllocated ? pool - totalMatchAllocated : 0n;
  const knownProjectIds = new Set(input.projects.map((project) => project.onchain_project_id));
  const noOrphanContributions = input.contributions.every((row) =>
    knownProjectIds.has(row.onchain_project_id),
  );

  const indexMatchesProjectTotals = snapshots.every(
    (snapshot) => snapshot.contributions === toBigInt(snapshot.project.contributions_wei),
  );
  const indexMatchesRoundTotal =
    totalContributions === toBigInt(input.round.total_contributions_wei);
  const totalMatchesWithinPool = totalMatchAllocated <= pool;

  let scoresMatchOnchain: boolean | null = null;
  let matchesMatchOnchain: boolean | null = null;
  let totalScoreMatchesOnchain: boolean | null = null;

  if (input.round.finalized) {
    scoresMatchOnchain = snapshots.every((snapshot) => {
      const row = matchRows.get(snapshot.project.onchain_project_id);
      return Boolean(row) && toBigInt(row!.score_wei) === snapshot.score;
    });
    matchesMatchOnchain = snapshots.every((snapshot) => {
      const row = matchRows.get(snapshot.project.onchain_project_id);
      const provisional = provisionalMatches.get(snapshot.project.onchain_project_id) ?? 0n;
      return Boolean(row) && toBigInt(row!.match_wei) === provisional;
    });
    totalScoreMatchesOnchain = totalScore === toBigInt(input.round.total_score);
  }

  const balanceCoversOutstanding =
    input.onchainBalanceWei === undefined
      ? null
      : input.onchainBalanceWei >= outstandingPayouts;

  const checks: IntegrityChecks = {
    indexMatchesProjectTotals,
    indexMatchesRoundTotal,
    scoresMatchOnchain,
    matchesMatchOnchain,
    totalScoreMatchesOnchain,
    totalMatchesWithinPool,
    noOrphanContributions,
    balanceCoversOutstanding,
  };

  const warnings: string[] = [];
  if (!indexMatchesProjectTotals) {
    warnings.push('Indexed project contribution totals differ from raw contribution events.');
  }
  if (!indexMatchesRoundTotal) {
    warnings.push('Indexed round contribution total differs from raw contribution events.');
  }
  if (scoresMatchOnchain === false) {
    warnings.push('One or more recomputed scores differ from the on-chain MatchFinalized events.');
  }
  if (matchesMatchOnchain === false) {
    warnings.push('One or more recomputed matches differ from the on-chain MatchFinalized events.');
  }
  if (totalScoreMatchesOnchain === false) {
    warnings.push('Recomputed total score differs from the on-chain totalScore.');
  }
  if (!totalMatchesWithinPool) {
    warnings.push('Allocated matches exceed the matching pool. This should be impossible.');
  }
  if (!noOrphanContributions) {
    warnings.push('Contribution events reference a project that is not registered in the index.');
  }
  if (balanceCoversOutstanding === false) {
    warnings.push('On-chain balance does not cover all outstanding project payouts.');
  }
  if (phase === 'awaiting-finalization') {
    warnings.push('The round has ended but finalize() has not been called yet; matches are previews.');
  }
  if (phase === 'open' || phase === 'scheduled') {
    warnings.push('The round is not finalized; match amounts are previews, not claims.');
  }

  const applicableChecks = Object.values(checks).filter((value) => value !== null);
  const ok = applicableChecks.every(Boolean);

  const uniqueContributors = new Set(
    input.contributions.map((row) => row.contributor.toLowerCase()),
  ).size;

  return {
    round: {
      address: input.round.address,
      chainId: input.round.chain_id,
      name: input.round.name,
      operator: input.round.operator,
      startTime: input.round.start_time,
      endTime: input.round.end_time,
      startTimeIso: isoFromUnix(input.round.start_time),
      endTimeIso: isoFromUnix(input.round.end_time),
      finalized: Boolean(input.round.finalized),
      phase,
      matchingPoolWei: pool.toString(),
      matchingPoolEth: formatEth(pool),
      totalContributionsWei: totalContributions.toString(),
      totalContributionsEth: formatEth(totalContributions),
      totalScoreWei: totalScore.toString(),
      totalMatchAllocatedWei: totalMatchAllocated.toString(),
      totalMatchAllocatedEth: formatEth(totalMatchAllocated),
      unallocatedPoolWei: unallocatedPool.toString(),
      unallocatedPoolEth: formatEth(unallocatedPool),
      totalPayoutsWei: totalPayouts.toString(),
      totalPayoutsEth: formatEth(totalPayouts),
      outstandingPayoutsWei: outstandingPayouts.toString(),
      outstandingPayoutsEth: formatEth(outstandingPayouts),
      uniqueContributors,
      onchainBalanceWei: input.onchainBalanceWei?.toString() ?? null,
      onchainBalanceEth:
        input.onchainBalanceWei === undefined ? null : formatEth(input.onchainBalanceWei),
    },
    projects: resultsProjects,
    integrity: {
      ok,
      checks,
      warnings,
      checkedAt: new Date().toISOString(),
    },
    formula: {
      score: 'score(project) = (Σ sqrt(contributorTotal))², using floor integer square roots in wei',
      match: 'match(project) = floor(score(project) × matchingPool ÷ Σ score(all projects))',
      notes: [
        'Contributions from the same address to the same project are aggregated before the square root.',
        'Every square root is floored to an integer. The backend repeats the exact on-chain integer math.',
        'Matches are floored during pool scaling, so their sum can never exceed the matching pool.',
        'Any rounding dust remains in the contract and can be reclaimed by the operator after finalization.',
        'Eligibility is enforced on-chain with a Merkle root of community attendees; the indexer only reports it.',
      ],
    },
    generatedAt: new Date().toISOString(),
  };
}

export function findProjectResult(results: Results, onchainId: number): ResultsProject | undefined {
  return results.projects.find((project) => project.onchainId === onchainId);
}

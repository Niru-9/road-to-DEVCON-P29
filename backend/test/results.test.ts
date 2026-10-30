import { describe, expect, it } from 'vitest';
import { computeResults, roundPhase } from '../src/services/results.js';
import { isqrt } from '../src/utils/bigint.js';
import {
  addressFor,
  makeContribution,
  makeMatch,
  makeProject,
  makeRound,
  ONE_ETH,
} from './fixtures.js';

describe('quadratic funding results', () => {
  it('lets 200 small backers out-match one whale of 100 ETH', () => {
    const projects = [makeProject(0), makeProject(1)];
    const contributions = [];

    // 200 community members contribute 0.01 ETH each: 2 ETH total against 100 ETH.
    for (let i = 0; i < 200; i++) {
      contributions.push(makeContribution(0, addressFor(i), ONE_ETH / 100n));
    }
    contributions.push(makeContribution(1, addressFor(999), 100n * ONE_ETH));

    const round = makeRound({
      total_contributions_wei: (102n * ONE_ETH).toString(),
      project_count: 2,
    });
    projects[0]!.contributions_wei = (2n * ONE_ETH).toString();
    projects[1]!.contributions_wei = (100n * ONE_ETH).toString();

    const results = computeResults({ round, projects, contributions, nowSeconds: 1_700_000_100 });

    const small = results.projects[0]!;
    const whale = results.projects[1]!;

    const smallSqrt = isqrt(ONE_ETH / 100n);
    expect(smallSqrt).toBe(10n ** 8n);
    expect(small.sumSqrtWei).toBe((200n * smallSqrt).toString());
    expect(small.scoreWei).toBe(((200n * smallSqrt) ** 2n).toString());

    const whaleSqrt = isqrt(100n * ONE_ETH);
    expect(whale.scoreWei).toBe((whaleSqrt ** 2n).toString());

    // 4:1 score advantage because 200 * sqrt(0.01) > sqrt(100).
    expect(small.matchEth).toBe('80');
    expect(whale.matchEth).toBe('20');
    expect(small.totalPayoutEth).toBe('82');
    expect(whale.totalPayoutEth).toBe('120');

    // The crowd wins the match despite contributing 50x less money.
    expect(BigInt(small.matchWei) > BigInt(whale.matchWei)).toBe(true);
    expect(small.uniqueContributors).toBe(200);
    expect(whale.uniqueContributors).toBe(1);
    expect(small.contributors).toHaveLength(200);

    expect(results.round.totalMatchAllocatedEth).toBe('100');
    expect(results.round.totalContributionsEth).toBe('102');
    expect(results.integrity.ok).toBe(true);
    expect(results.integrity.checks.indexMatchesProjectTotals).toBe(true);
    expect(results.integrity.checks.indexMatchesRoundTotal).toBe(true);
    expect(results.integrity.checks.totalMatchesWithinPool).toBe(true);
    expect(results.integrity.checks.noOrphanContributions).toBe(true);
  });

  it('aggregates a contributor before taking the square root', () => {
    const contributions = [
      makeContribution(0, addressFor(1), ONE_ETH),
      makeContribution(0, addressFor(1), 3n * ONE_ETH),
      makeContribution(0, addressFor(2), ONE_ETH),
    ];
    const projects = [makeProject(0, { contributions_wei: (5n * ONE_ETH).toString() })];
    const round = makeRound({ total_contributions_wei: (5n * ONE_ETH).toString() });

    const results = computeResults({ round, projects, contributions, nowSeconds: 1_700_000_100 });
    const project = results.projects[0]!;

    // sqrt(1 + 3) = 2, not sqrt(1) + sqrt(3).
    expect(project.sumSqrtWei).toBe((3n * 10n ** 9n).toString());
    expect(project.scoreWei).toBe((9n * 10n ** 18n).toString());
    expect(project.contributors).toHaveLength(2);
    const merged = project.contributors.find(
      (contributor) => contributor.address.toLowerCase() === addressFor(1),
    );
    expect(merged?.amountEth).toBe('4');
  });

  it('uses final on-chain matches after finalization and verifies them', () => {
    const contributions = [
      makeContribution(0, addressFor(1), ONE_ETH),
      makeContribution(0, addressFor(2), ONE_ETH),
    ];
    const projects = [makeProject(0, { contributions_wei: (2n * ONE_ETH).toString() })];
    const round = makeRound({
      finalized: 1,
      total_contributions_wei: (2n * ONE_ETH).toString(),
      total_score: (4n * 10n ** 18n).toString(),
      total_match_allocated_wei: (100n * ONE_ETH).toString(),
      unallocated_pool_wei: '0',
      project_count: 1,
    });
    const matches = [makeMatch(0, 4n * 10n ** 18n, 100n * ONE_ETH)];

    const results = computeResults({ round, projects, contributions, matches });

    expect(results.projects[0]!.matchSource).toBe('onchain');
    expect(results.projects[0]!.matchEth).toBe('100');
    expect(results.integrity.checks.scoresMatchOnchain).toBe(true);
    expect(results.integrity.checks.matchesMatchOnchain).toBe(true);
    expect(results.integrity.checks.totalScoreMatchesOnchain).toBe(true);
    expect(results.integrity.ok).toBe(true);
  });

  it('flags a corrupted on-chain match', () => {
    const contributions = [makeContribution(0, addressFor(1), ONE_ETH)];
    const projects = [makeProject(0, { contributions_wei: ONE_ETH.toString() })];
    const round = makeRound({
      finalized: 1,
      total_contributions_wei: ONE_ETH.toString(),
      total_score: (10n ** 18n).toString(),
    });
    const matches = [makeMatch(0, 10n ** 18n, 1n)];

    const results = computeResults({ round, projects, contributions, matches });

    expect(results.integrity.checks.matchesMatchOnchain).toBe(false);
    expect(results.integrity.ok).toBe(false);
    expect(results.integrity.warnings.join(' ')).toContain('differ from the on-chain');
  });

  it('flags orphan contributions and cached-total drift', () => {
    const contributions = [makeContribution(7, addressFor(1), ONE_ETH)];
    const projects = [makeProject(0, { contributions_wei: ONE_ETH.toString() })];
    const round = makeRound({ total_contributions_wei: '0' });

    const results = computeResults({ round, projects, contributions });

    expect(results.integrity.checks.noOrphanContributions).toBe(false);
    expect(results.integrity.checks.indexMatchesProjectTotals).toBe(false);
    expect(results.integrity.checks.indexMatchesRoundTotal).toBe(false);
  });

  it('is safe with an empty or unfunded round', () => {
    const results = computeResults({
      round: makeRound({ matching_pool_wei: '0' }),
      projects: [makeProject(0)],
      contributions: [],
    });

    expect(results.round.totalMatchAllocatedWei).toBe('0');
    expect(results.round.totalPayoutsWei).toBe('0');
    expect(results.integrity.checks.totalMatchesWithinPool).toBe(true);
    expect(results.projects[0]!.matchSource).toBe('computed');
  });

  it('reports the correct lifecycle phase', () => {
    const round = makeRound({ start_time: 100, end_time: 200 });
    expect(roundPhase(round, 99)).toBe('scheduled');
    expect(roundPhase(round, 100)).toBe('open');
    expect(roundPhase(round, 200)).toBe('open');
    expect(roundPhase(round, 201)).toBe('awaiting-finalization');
    expect(roundPhase({ ...round, finalized: 1 }, 201)).toBe('finalized');
  });
});

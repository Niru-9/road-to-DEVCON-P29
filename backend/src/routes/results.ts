import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { allContributions } from '../db/contributions.js';
import { resultsQuerySchema, roundParamsSchema } from '../http/schemas.js';
import { toCsv } from '../utils/csv.js';
import { formatEth, toBigInt } from '../utils/bigint.js';
import { computeResults } from '../services/results.js';
import { loadResultsInput, tryReadBalance } from '../services/round-data.js';
import { resolveRound } from '../services/rounds.js';
import type { RouteOptions } from './types.js';

function csvFilename(prefix: string, address: string): string {
  return `${prefix}-${address.toLowerCase()}.csv`;
}

export const resultsRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { db, client, config } = options.ctx;
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/rounds/:address/results',
    { schema: { params: roundParamsSchema, querystring: resultsQuerySchema } },
    async (request, reply) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      let balance: bigint | undefined;
      let balanceError: string | null = null;

      if (request.query.includeBalance) {
        const read = await tryReadBalance(client, round.address);
        balance = read.balance ?? undefined;
        balanceError = read.error;
      }

      const results = computeResults(loadResultsInput(db, round, balance));
      if (balanceError) {
        results.integrity.warnings.push(`On-chain balance could not be read: ${balanceError}`);
      }

      reply.header('cache-control', 'no-store');
      return {
        data: results,
        meta: {
          source: 'event-replay',
          chainBalanceIncluded: request.query.includeBalance,
        },
      };
    },
  );

  r.get(
    '/rounds/:address/results/summary',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const results = computeResults(loadResultsInput(db, round));

      return {
        data: {
          round: results.round,
          projects: results.projects.map((project) => ({
            onchainId: project.onchainId,
            name: project.name,
            payout: project.payout,
            contributionsWei: project.contributionsWei,
            matchWei: project.matchWei,
            matchEth: project.matchEth,
            totalPayoutWei: project.totalPayoutWei,
            totalPayoutEth: project.totalPayoutEth,
            uniqueContributors: project.uniqueContributors,
            scoreWei: project.scoreWei,
            matchSource: project.matchSource,
            withdrawn: project.withdrawn,
          })),
          integrity: results.integrity,
          generatedAt: results.generatedAt,
        },
      };
    },
  );

  r.get(
    '/rounds/:address/results/verify',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const results = computeResults(loadResultsInput(db, round));

      return {
        data: {
          round: round.address,
          finalized: Boolean(round.finalized),
          phase: results.round.phase,
          totalScoreWei: results.round.totalScoreWei,
          totalMatchAllocatedWei: results.round.totalMatchAllocatedWei,
          matchingPoolWei: results.round.matchingPoolWei,
          integrity: results.integrity,
          formula: results.formula,
        },
      };
    },
  );

  r.get(
    '/rounds/:address/results.csv',
    { schema: { params: roundParamsSchema } },
    async (request, reply) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const results = computeResults(loadResultsInput(db, round));

      const csv = toCsv(
        [
          'project_id',
          'project_name',
          'payout',
          'contributions_wei',
          'contributions_eth',
          'unique_contributors',
          'score_wei',
          'match_wei',
          'match_eth',
          'total_payout_wei',
          'total_payout_eth',
          'match_source',
          'withdrawn',
        ],
        results.projects.map((project) => [
          project.onchainId,
          project.name,
          project.payout,
          project.contributionsWei,
          project.contributionsEth,
          project.uniqueContributors,
          project.scoreWei,
          project.matchWei,
          project.matchEth,
          project.totalPayoutWei,
          project.totalPayoutEth,
          project.matchSource,
          project.withdrawn,
        ]),
      );

      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${csvFilename('results', round.address)}"`);
      return csv;
    },
  );

  r.get(
    '/rounds/:address/contributions.csv',
    { schema: { params: roundParamsSchema } },
    async (request, reply) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const rows = allContributions(db, round.id);

      const csv = toCsv(
        [
          'project_id',
          'contributor',
          'amount_wei',
          'amount_eth',
          'tx_hash',
          'log_index',
          'block_number',
          'block_timestamp',
        ],
        rows.map((row) => [
          row.onchain_project_id,
          row.contributor,
          row.amount_wei,
          formatEth(toBigInt(row.amount_wei)),
          row.tx_hash,
          row.log_index,
          row.block_number,
          row.block_timestamp,
        ]),
      );

      reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header(
          'content-disposition',
          `attachment; filename="${csvFilename('contributions', round.address)}"`,
        );
      return csv;
    },
  );
};

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { allProjects, listProjects } from '../db/projects.js';
import { listContributions } from '../db/contributions.js';
import { listRounds } from '../db/rounds.js';
import {
  contributionQuerySchema,
  paginationSchema,
  projectParamsSchema,
  roundParamsSchema,
} from '../http/schemas.js';
import { notFound } from '../errors.js';
import { normalizeAddress } from '../utils/address.js';
import { formatEth, toBigInt } from '../utils/bigint.js';
import { computeRoundResults } from '../services/round-data.js';
import { projectRowToApi, resolveRound, roundSummary } from '../services/rounds.js';
import { buildWithdrawTx } from '../services/calldata.js';
import type { RouteOptions } from './types.js';

export const roundRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { db, config } = options.ctx;
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/rounds', async () => {
    const rounds = listRounds(db, config.chainId);
    return {
      data: rounds.map((round) => roundSummary(db, round)),
      meta: { count: rounds.length, chainId: config.chainId },
    };
  });

  r.get(
    '/rounds/:address',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      return { data: roundSummary(db, round) };
    },
  );

  r.get(
    '/rounds/:address/projects',
    { schema: { params: roundParamsSchema, querystring: paginationSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const { rows, total } = listProjects(db, round.id, {
        limit: request.query.limit,
        offset: request.query.offset,
      });

      return {
        data: rows.map(projectRowToApi),
        meta: {
          total,
          limit: request.query.limit,
          offset: request.query.offset,
          round: round.address,
        },
      };
    },
  );

  r.get(
    '/rounds/:address/projects/:projectId',
    { schema: { params: projectParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const results = computeRoundResults(db, round);
      const project = results.projects.find(
        (candidate) => candidate.onchainId === request.params.projectId,
      );

      if (!project) {
        throw notFound(
          'project_not_found',
          `Project ${request.params.projectId} is not registered in this round`,
        );
      }

      return {
        data: project,
        round: {
          address: round.address,
          finalized: Boolean(round.finalized),
          phase: results.round.phase,
        },
        integrity: results.integrity,
        formula: results.formula,
        withdrawTransaction:
          round.finalized && !project.withdrawn && toBigInt(project.totalPayoutWei) > 0n
            ? buildWithdrawTx(round, project.onchainId)
            : null,
      };
    },
  );

  r.get(
    '/rounds/:address/contributions',
    { schema: { params: roundParamsSchema, querystring: contributionQuerySchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const contributor = request.query.contributor
        ? normalizeAddress(request.query.contributor, 'contributor')
        : undefined;

      const { rows, total } = listContributions(
        db,
        round.id,
        {
          onchainProjectId: request.query.projectId,
          contributor,
        },
        { limit: request.query.limit, offset: request.query.offset },
      );

      return {
        data: rows.map((row) => ({
          projectId: row.onchain_project_id,
          contributor: row.contributor,
          amountWei: row.amount_wei,
          amountEth: formatEth(toBigInt(row.amount_wei)),
          txHash: row.tx_hash,
          logIndex: row.log_index,
          blockNumber: row.block_number,
          blockTimestamp: row.block_timestamp,
          blockTimestampIso: row.block_timestamp
            ? new Date(row.block_timestamp * 1000).toISOString()
            : null,
        })),
        meta: {
          total,
          limit: request.query.limit,
          offset: request.query.offset,
        },
      };
    },
  );

  // Convenience endpoint for frontend/server-side aggregation without loading
  // the full results payload. It still recomputes from raw events.
  r.get(
    '/rounds/:address/stats',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const results = computeRoundResults(db, round);
      const projects = allProjects(db, round.id);

      const leaderboard = [...results.projects]
        .sort((a, b) => toBigInt(b.totalPayoutWei) > toBigInt(a.totalPayoutWei) ? 1 : -1)
        .slice(0, 20)
        .map((project, index) => ({
          rank: index + 1,
          onchainId: project.onchainId,
          name: project.name,
          contributionsWei: project.contributionsWei,
          matchWei: project.matchWei,
          totalPayoutWei: project.totalPayoutWei,
          totalPayoutEth: project.totalPayoutEth,
          uniqueContributors: project.uniqueContributors,
          scoreWei: project.scoreWei,
        }));

      return {
        data: {
          round: results.round,
          projectCount: projects.length,
          leaderboard,
          integrity: results.integrity,
        },
      };
    },
  );
};

import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { getActiveEligibilityRoot } from '../db/eligibility.js';
import { allProjects } from '../db/projects.js';
import {
  adminAddRoundSchema,
  adminFundPoolSchema,
  adminImportEligibilitySchema,
  adminReconcileSchema,
  adminRegisterProjectSchema,
  projectParamsSchema,
  roundParamsSchema,
} from '../http/schemas.js';
import { requireAdmin } from '../http/auth.js';
import { AppError } from '../errors.js';
import { normalizeAddress } from '../utils/address.js';
import { normalizeEligibilityInputs, parseEligibilityCsv } from '../utils/csv.js';
import {
  addRoundFromChain,
  reconcileRound,
  refreshRoundFromChain,
  resolveRound,
  roundSummary,
} from '../services/rounds.js';
import { getEligibilitySummary, importEligibility } from '../services/eligibility.js';
import {
  buildFinalizeTx,
  buildFundPoolTx,
  buildReclaimUnallocatedTx,
  buildRegisterProjectTx,
  buildSetEligibilityRootTx,
  buildWithdrawTx,
} from '../services/calldata.js';
import type { RouteOptions } from './types.js';

export const adminRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { db, client, config, indexer } = options.ctx;

  // Scoped to this plugin: every /api/v1/admin/* route requires the key.
  app.addHook('preHandler', requireAdmin(config));

  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get('/status', async () => {
    const counts = db
      .prepare(
        `SELECT
           (SELECT COUNT(*) FROM rounds) AS rounds,
           (SELECT COUNT(*) FROM projects) AS projects,
           (SELECT COUNT(*) FROM contributions) AS contributions,
           (SELECT COUNT(*) FROM eligibility_entries) AS eligible_addresses`,
      )
      .get() as Record<string, number>;

    return {
      data: {
        chainId: config.chainId,
        indexer: { enabled: config.indexerEnabled, ...indexer.getStatus() },
        counts,
        timestamp: new Date().toISOString(),
      },
    };
  });

  r.post(
    '/rounds',
    { schema: { body: adminAddRoundSchema } },
    async (request) => {
      try {
        const { round, warnings } = await addRoundFromChain(db, client, config.chainId, request.body);
        return { data: roundSummary(db, round), warnings };
      } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError(
          502,
          'chain_read_failed',
          'Could not read the round contract from the configured RPC',
          { reason: error instanceof Error ? error.message : String(error) },
        );
      }
    },
  );

  r.post(
    '/rounds/:address/refresh',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const updated = await refreshRoundFromChain(db, client, round);
      return { data: roundSummary(db, updated) };
    },
  );

  r.post(
    '/rounds/:address/sync',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const result = await indexer.syncRound(round);
      return { data: result };
    },
  );

  r.post(
    '/rounds/:address/reconcile',
    { schema: { params: roundParamsSchema, body: adminReconcileSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const result = await reconcileRound(db, client, round, request.body.repair);
      return { data: result };
    },
  );

  r.get(
    '/rounds/:address/eligibility',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      return { data: getEligibilitySummary(db, round, true) };
    },
  );

  r.post(
    '/rounds/:address/eligibility/import',
    { schema: { params: roundParamsSchema, body: adminImportEligibilitySchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const source = request.body.source ?? (request.body.csv ? 'csv-upload' : 'json-upload');

      const entries = request.body.csv
        ? parseEligibilityCsv(request.body.csv, source)
        : normalizeEligibilityInputs(request.body.addresses ?? [], source);

      const result = importEligibility(db, round, entries, source);
      return {
        data: {
          ...result,
          summary: getEligibilitySummary(db, round),
        },
      };
    },
  );

  r.post(
    '/rounds/:address/eligibility/calldata',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const active = getActiveEligibilityRoot(db, round.id);
      if (!active) {
        throw new AppError(
          404,
          'no_eligibility_root',
          'Import an eligibility set before requesting calldata',
        );
      }
      return { data: buildSetEligibilityRootTx(round, active.root) };
    },
  );

  r.post(
    '/rounds/:address/projects/calldata',
    { schema: { params: roundParamsSchema, body: adminRegisterProjectSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const payout = normalizeAddress(request.body.payout, 'payout');
      return {
        data: buildRegisterProjectTx(round, payout, request.body.name, request.body.metadataUri),
      };
    },
  );

  r.post(
    '/rounds/:address/fund-pool/calldata',
    { schema: { params: roundParamsSchema, body: adminFundPoolSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      return { data: buildFundPoolTx(round, BigInt(request.body.amountWei)) };
    },
  );

  r.post(
    '/rounds/:address/finalize/calldata',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      return { data: buildFinalizeTx(round) };
    },
  );

  r.post(
    '/rounds/:address/projects/:projectId/withdraw/calldata',
    { schema: { params: projectParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const project = allProjects(db, round.id).find(
        (candidate) => candidate.onchain_project_id === request.params.projectId,
      );
      if (!project) {
        throw new AppError(404, 'project_not_found', 'Project is not registered in this round');
      }
      return {
        data: {
          transaction: buildWithdrawTx(round, request.params.projectId),
          payout: project.payout,
        },
      };
    },
  );

  r.post(
    '/rounds/:address/reclaim/calldata',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      return { data: buildReclaimUnallocatedTx(round) };
    },
  );
};

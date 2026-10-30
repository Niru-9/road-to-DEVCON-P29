import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Hex } from 'viem';
import { getActiveEligibilityRoot } from '../db/eligibility.js';
import {
  contributeCalldataSchema,
  proofBodySchema,
  roundParamsSchema,
  verifyProofBodySchema,
} from '../http/schemas.js';
import { normalizeAddress } from '../utils/address.js';
import { getEligibilitySummary, getEligibilityProof } from '../services/eligibility.js';
import { leafForAddress, verifyMerkleProof } from '../services/merkle.js';
import { buildContributeTx } from '../services/calldata.js';
import { resolveRound } from '../services/rounds.js';
import { AppError } from '../errors.js';
import type { RouteOptions } from './types.js';

export const eligibilityRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { db, config } = options.ctx;
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get(
    '/rounds/:address/eligibility/root',
    { schema: { params: roundParamsSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const summary = getEligibilitySummary(db, round);
      return { data: summary };
    },
  );

  r.post(
    '/rounds/:address/eligibility/proof',
    { schema: { params: roundParamsSchema, body: proofBodySchema } },
    async (request, reply) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const address = normalizeAddress(request.body.address);
      const proof = getEligibilityProof(db, round, address);

      reply.header('cache-control', 'no-store');
      return { data: proof };
    },
  );

  /**
   * Builds a ready-to-submit contribute() transaction for an eligible address.
   * Since there is no frontend yet, this is the bridge for Remix or a wallet:
   * call this endpoint, then submit `data` to `to` with `value`.
   */
  r.post(
    '/rounds/:address/contribute/calldata',
    { schema: { params: roundParamsSchema, body: contributeCalldataSchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const address = normalizeAddress(request.body.address);
      const proof = getEligibilityProof(db, round, address);

      if (!proof.eligible) {
        return {
          data: {
            eligible: false,
            address,
            transaction: null,
            warnings: proof.warnings,
          },
        };
      }

      if (!proof.rootMatchesOnchain) {
        throw new AppError(
          409,
          'eligibility_root_not_published',
          proof.warnings.join(' ') ||
            'The local eligibility root is not the on-chain root; publish it before contributing.',
          { localRoot: proof.root, onchainRoot: proof.onchainRoot },
        );
      }

      return {
        data: {
          eligible: true,
          address,
          transaction: buildContributeTx(
            round,
            request.body.projectId,
            proof.proof,
            BigInt(request.body.amountWei),
          ),
          warnings: proof.warnings,
        },
      };
    },
  );

  /**
   * Independent proof verification. Callers can verify against the on-chain
   * root (default) without trusting any database row. This is what a results
   * page or a skeptical community member would use.
   */
  r.post(
    '/rounds/:address/eligibility/verify',
    { schema: { params: roundParamsSchema, body: verifyProofBodySchema } },
    async (request) => {
      const round = resolveRound(db, config.chainId, request.params.address);
      const address = normalizeAddress(request.body.address);
      const active = getActiveEligibilityRoot(db, round.id);

      const root = request.body.root ?? round.eligibility_root ?? active?.root;
      if (!root) {
        return {
          data: {
            address,
            valid: false,
            reason: 'no_root_available',
            root: null,
            rootSource: null,
            leaf: leafForAddress(address),
            proofLength: request.body.proof.length,
          },
        };
      }

      const rootSource = request.body.root
        ? 'request'
        : round.eligibility_root
          ? 'onchain'
          : 'local-active-root';
      const leaf = leafForAddress(address);
      const valid = verifyMerkleProof(request.body.proof as Hex[], root as Hex, leaf);

      return {
        data: {
          address,
          valid,
          root,
          rootSource,
          leaf,
          proofLength: request.body.proof.length,
          verifiedAt: new Date().toISOString(),
        },
      };
    },
  );
};

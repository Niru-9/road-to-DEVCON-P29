import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { AppContext } from './context.js';
import { registerErrorHandlers } from './http/error-handler.js';
import { adminRoutes } from './routes/admin.js';
import { eligibilityRoutes } from './routes/eligibility.js';
import { healthRoutes } from './routes/health.js';
import { resultsRoutes } from './routes/results.js';
import { roundRoutes } from './routes/rounds.js';

export interface BuildAppOptions {
  logger?: FastifyServerOptions['logger'];
  loggerInstance?: FastifyServerOptions['loggerInstance'];
}

/**
 * Creates the Fastify instance without starting it, so tests can use
 * `app.inject()` and the server entrypoint can control listening.
 */
export async function buildApp(
  ctx: AppContext,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.loggerInstance ? undefined : (options.logger ?? false),
    loggerInstance: options.loggerInstance,
    trustProxy: true,
    bodyLimit: 8 * 1024 * 1024,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: ctx.config.corsOrigins === '*' ? true : ctx.config.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    maxAge: 86_400,
  });

  await app.register(rateLimit, {
    global: true,
    max: ctx.config.rateLimit.max,
    timeWindow: ctx.config.rateLimit.timeWindow,
    allowList: (request) => request.url === '/health',
  });

  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Quadratic Funding Round API',
        description:
          'Read-only indexer, on-chain eligibility proofs, unsigned transaction calldata, and independently verifiable quadratic-funding results.',
        version: '1.0.0',
      },
      servers: [{ url: '/api/v1', description: 'Versioned API root' }],
      tags: [
        { name: 'health', description: 'Liveness and readiness probes' },
        { name: 'rounds', description: 'Rounds, projects, contributions, and stats' },
        { name: 'results', description: 'Recomputed and verifiable results' },
        { name: 'eligibility', description: 'Merkle eligibility proofs and verification' },
        { name: 'admin', description: 'Operator-only indexing and calldata helpers' },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'list', deepLinking: true },
  });

  registerErrorHandlers(app);

  app.get(
    '/',
    {
      schema: {
        tags: ['health'],
        summary: 'Service metadata',
      },
    },
    async () => ({
      service: 'qf-round-backend',
      version: '1.0.0',
      chainId: ctx.config.chainId,
      api: '/api/v1',
      docs: '/docs',
    }),
  );

  await app.register(healthRoutes, { ctx });

  await app.register(
    async (api) => {
      await api.register(roundRoutes, { ctx });
      await api.register(resultsRoutes, { ctx });
      await api.register(eligibilityRoutes, { ctx });
      await api.register(
        async (admin) => {
          await admin.register(adminRoutes, { ctx });
        },
        { prefix: '/admin' },
      );
    },
    { prefix: '/api/v1' },
  );

  return app;
}

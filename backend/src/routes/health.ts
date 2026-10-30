import type { FastifyPluginAsync } from 'fastify';
import type { RouteOptions } from './types.js';

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

export const healthRoutes: FastifyPluginAsync<RouteOptions> = async (app, options) => {
  const { db, client, indexer, config } = options.ctx;

  app.get('/health', async () => {
    const roundCount = db.prepare(`SELECT COUNT(*) AS count FROM rounds`).get() as { count: number };
    return {
      status: 'ok',
      service: 'qf-round-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: 'ok',
      indexer: {
        enabled: config.indexerEnabled,
        ...indexer.getStatus(),
      },
      rounds: roundCount.count,
    };
  });

  app.get('/health/ready', async (_request, reply) => {
    try {
      db.prepare('SELECT 1 AS ok').get();
      const blockNumber = await withTimeout(client.getBlockNumber(), 5_000);
      return {
        status: 'ready',
        database: 'ok',
        chain: { chainId: config.chainId, blockNumber: Number(blockNumber) },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return reply.status(503).send({
        status: 'not_ready',
        database: 'ok',
        chain: {
          chainId: config.chainId,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: new Date().toISOString(),
      });
    }
  });
};

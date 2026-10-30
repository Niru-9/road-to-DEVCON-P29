import pino from 'pino';
import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { getRoundByAddress } from './db/rounds.js';
import { createRuntime } from './runtime.js';
import { addRoundFromChain } from './services/rounds.js';
import { normalizeAddress } from './utils/address.js';

async function bootstrapRound(
  runtime: ReturnType<typeof createRuntime>,
  logger: pino.Logger,
): Promise<void> {
  const { config, db, client } = runtime.ctx;
  if (!config.bootstrapRound) return;

  const address = normalizeAddress(config.bootstrapRound.address, 'ROUND_ADDRESS');
  if (getRoundByAddress(db, address, config.chainId)) {
    logger.info({ address }, 'bootstrap round already indexed');
    return;
  }

  try {
    const { round, warnings } = await addRoundFromChain(db, client, config.chainId, {
      address,
      name: config.bootstrapRound.name,
      startBlock: config.bootstrapRound.startBlock,
    });
    logger.info(
      { address: round.address, startBlock: round.start_block, warnings },
      'bootstrap round added',
    );
  } catch (error) {
    logger.error(
      { address, error: error instanceof Error ? error.message : String(error) },
      'could not add the bootstrap round; the API will start without it. ' +
        'Add it later with POST /api/v1/admin/rounds or `npm run round:add`.',
    );
  }
}

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = pino({ level: config.logLevel });
  const runtime = createRuntime(config, logger);

  await bootstrapRound(runtime, logger);

  const app = await buildApp(runtime.ctx, { loggerInstance: logger });
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    try {
      await app.close();
    } finally {
      runtime.close();
    }
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  await app.listen({ host: config.host, port: config.port });
  logger.info(
    {
      host: config.host,
      port: config.port,
      chainId: config.chainId,
      docs: `http://localhost:${config.port}/docs`,
    },
    'qf-round-backend listening',
  );

  if (config.indexerEnabled) {
    runtime.ctx.indexer.start();
    logger.info(
      {
        pollMs: config.indexerPollMs,
        confirmations: config.indexerConfirmations,
        batchBlocks: config.indexerBatchBlocks,
      },
      'event indexer started',
    );
  } else {
    logger.warn('event indexer is disabled (INDEXER_ENABLED=false)');
  }
}

main().catch((error) => {
  // The logger may not exist yet (for example on invalid configuration).
  console.error('fatal startup error:', error);
  process.exit(1);
});

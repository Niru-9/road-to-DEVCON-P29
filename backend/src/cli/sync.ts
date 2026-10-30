import { Command } from 'commander';
import pino from 'pino';
import { loadConfig } from '../config.js';
import { getRoundByAddress } from '../db/rounds.js';
import { createRuntime } from '../runtime.js';
import { normalizeAddress } from '../utils/address.js';

interface SyncOptions {
  address?: string;
  watch?: boolean;
  poll?: string;
  confirmations?: string;
}

async function main(): Promise<void> {
  const program = new Command()
    .name('sync')
    .description('Replay QuadraticFundingRound events from the configured RPC into SQLite')
    .argument('[address]', 'sync only this round (default: every round)')
    .option('-a, --address <address>', 'sync only this round (alternative to the positional argument)')
    .option('-w, --watch', 'keep polling instead of exiting after one pass')
    .option('-p, --poll <ms>', 'poll interval in watch mode')
    .option('-c, --confirmations <n>', 'block confirmations to wait for')
    .parse(process.argv);

  const options = program.opts<SyncOptions>();
  const [positionalAddress] = program.args;
  const targetAddress = options.address ?? positionalAddress;
  const config = loadConfig();
  if (options.poll) config.indexerPollMs = Number(options.poll);
  if (options.confirmations) config.indexerConfirmations = Number(options.confirmations);

  const logger = pino({ level: config.logLevel });
  const runtime = createRuntime(config, logger);

  try {
    const run = async (): Promise<void> => {
      if (targetAddress) {
        const address = normalizeAddress(targetAddress, '--address');
        const round = getRoundByAddress(runtime.ctx.db, address, config.chainId);
        if (!round) {
          throw new Error(
            `Round ${address} is not in the database. Add it first with \`npm run round:add -- ${address} --start-block <n>\`.`,
          );
        }
        const result = await runtime.ctx.indexer.syncRound(round);
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const results = await runtime.ctx.indexer.runOnce();
      console.log(JSON.stringify(results, null, 2));
    };

    if (!options.watch) {
      await run();
      return;
    }

    await run();
    await new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        void run().catch((error) => {
          logger.error({ error: error instanceof Error ? error.message : String(error) }, 'sync failed');
        });
      }, config.indexerPollMs);
      const stop = (): void => {
        clearInterval(timer);
        resolve();
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });
  } finally {
    runtime.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { Command } from 'commander';
import pino from 'pino';
import { loadConfig } from '../config.js';
import { getRoundByAddress } from '../db/rounds.js';
import { createRuntime } from '../runtime.js';
import { addRoundFromChain, roundSummary } from '../services/rounds.js';
import { normalizeAddress } from '../utils/address.js';

async function main(): Promise<void> {
  const program = new Command()
    .name('round:add')
    .description('Validate a deployed QuadraticFundingRound on-chain and add it to the index')
    .argument('<address>', 'deployed contract address')
    .option('-s, --start-block <block>', 'deployment block (strongly recommended)')
    .option('-n, --name <name>', 'display name for the round')
    .parse(process.argv);

  const [addressInput] = program.args;
  const options = program.opts<{ startBlock?: string; name?: string }>();
  const config = loadConfig();
  const runtime = createRuntime(config, pino({ level: 'warn' }));

  try {
    const address = normalizeAddress(addressInput!, 'address');
    const existing = getRoundByAddress(runtime.ctx.db, address, config.chainId);
    if (existing) {
      console.log(`Round ${address} is already indexed.`);
      console.log(JSON.stringify(roundSummary(runtime.ctx.db, existing), null, 2));
      return;
    }

    const startBlock = options.startBlock === undefined ? undefined : Number(options.startBlock);
    if (startBlock !== undefined && (!Number.isInteger(startBlock) || startBlock < 0)) {
      throw new Error('--start-block must be a non-negative integer');
    }

    const { round, warnings } = await addRoundFromChain(
      runtime.ctx.db,
      runtime.ctx.client,
      config.chainId,
      { address, startBlock, name: options.name },
    );

    console.log(JSON.stringify({ round: roundSummary(runtime.ctx.db, round), warnings }, null, 2));
  } finally {
    runtime.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

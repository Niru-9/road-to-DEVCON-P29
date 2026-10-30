import { Command } from 'commander';
import pino from 'pino';
import { loadConfig } from '../config.js';
import { getRoundByAddress } from '../db/rounds.js';
import { createRuntime } from '../runtime.js';
import { loadResultsInput } from '../services/round-data.js';
import { computeResults } from '../services/results.js';
import { reconcileRound, roundSummary } from '../services/rounds.js';
import { normalizeAddress } from '../utils/address.js';

interface VerifyOptions {
  chain: boolean;
  repair: boolean;
}

async function main(): Promise<void> {
  const program = new Command()
    .name('verify')
    .description('Recompute the round from raw events and cross-check it against on-chain state')
    .argument('<address>', 'deployed round contract address')
    .option('--no-chain', 'skip the on-chain reconcile (offline replay only)')
    .option('--repair', 'repair indexed rows from on-chain state when differences are found')
    .parse(process.argv);

  const [addressInput] = program.args;
  const options = program.opts<VerifyOptions>();
  const config = loadConfig();
  const runtime = createRuntime(config, pino({ level: 'warn' }));

  try {
    const address = normalizeAddress(addressInput!, 'address');
    const round = getRoundByAddress(runtime.ctx.db, address, config.chainId);
    if (!round) {
      throw new Error(`Round ${address} is not indexed on chain ${config.chainId}`);
    }

    const replay = computeResults(loadResultsInput(runtime.ctx.db, round));
    const reconcile = options.chain
      ? await reconcileRound(runtime.ctx.db, runtime.ctx.client, round, options.repair)
      : null;

    const ok = replay.integrity.ok && (reconcile?.ok ?? true);

    console.log(
      JSON.stringify(
        {
          ok,
          round: roundSummary(runtime.ctx.db, round),
          replay: {
            totalContributionsWei: replay.round.totalContributionsWei,
            totalScoreWei: replay.round.totalScoreWei,
            totalMatchAllocatedWei: replay.round.totalMatchAllocatedWei,
            totalPayoutsWei: replay.round.totalPayoutsWei,
            outstandingPayoutsWei: replay.round.outstandingPayoutsWei,
            uniqueContributors: replay.round.uniqueContributors,
            integrity: replay.integrity,
          },
          projects: replay.projects.map((project) => ({
            onchainId: project.onchainId,
            name: project.name,
            contributionsWei: project.contributionsWei,
            scoreWei: project.scoreWei,
            matchWei: project.matchWei,
            totalPayoutWei: project.totalPayoutWei,
            uniqueContributors: project.uniqueContributors,
            withdrawn: project.withdrawn,
            matchSource: project.matchSource,
          })),
          reconcile,
        },
        null,
        2,
      ),
    );

    if (!ok) process.exitCode = 1;
  } finally {
    runtime.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
